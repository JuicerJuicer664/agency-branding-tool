import { NextRequest, NextResponse } from 'next/server';

/**
 * Unified chat-completion endpoint.
 * Accepts { provider, model, messages, stream, parameters } and routes to
 * the appropriate LLM vendor. Always normalizes responses to the OpenAI
 * format ({ choices: [{ message: { content } }] } / delta stream chunks)
 * so the client contract is identical regardless of provider.
 */

const API_KEYS: Record<string, string | undefined> = {
  OPEN_AI: process.env.OPENAI_API_KEY,
  ANTHROPIC: process.env.ANTHROPIC_API_KEY,
  GEMINI: process.env.GEMINI_API_KEY,
  PERPLEXITY: process.env.PERPLEXITY_API_KEY,
};

type Msg = { role: string; content: string };

// ---------- Provider adapters ----------

async function callOpenAICompatible(
  baseUrl: string,
  model: string,
  messages: Msg[],
  apiKey: string,
  stream: boolean,
  parameters: Record<string, unknown>,
) {
  return fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, stream, ...parameters }),
  });
}

async function callAnthropic(
  model: string,
  messages: Msg[],
  apiKey: string,
  stream: boolean,
  parameters: Record<string, unknown>,
) {
  const systemMsg = messages.find((m) => m.role === 'system');
  const chatMsgs = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role, content: m.content }));

  return fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      messages: chatMsgs,
      max_tokens: (parameters.max_tokens as number) || 4096,
      stream,
      ...(systemMsg ? { system: systemMsg.content } : {}),
      ...(parameters.temperature !== undefined
        ? { temperature: parameters.temperature }
        : {}),
    }),
  });
}

async function callGemini(
  model: string,
  messages: Msg[],
  apiKey: string,
  stream: boolean,
  parameters: Record<string, unknown>,
) {
  const action = stream ? 'streamGenerateContent' : 'generateContent';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${action}?alt=sse&key=${apiKey}`;

  const systemInstruction = messages.find((m) => m.role === 'system');
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      ...(systemInstruction
        ? { systemInstruction: { parts: [{ text: systemInstruction.content }] } }
        : {}),
      ...(parameters.temperature !== undefined
        ? { generationConfig: { temperature: parameters.temperature } }
        : {}),
    }),
  });
}

// ---------- Response shape normalization (non-stream) ----------

function normalizeNonStream(provider: string, data: unknown): unknown {
  if (provider === 'OPEN_AI' || provider === 'PERPLEXITY') return data;
  if (provider === 'ANTHROPIC') {
    const d = data as { content?: Array<{ text?: string }>; stop_reason?: string; usage?: unknown };
    return {
      choices: [
        {
          message: {
            role: 'assistant',
            content: (d.content || []).map((b) => b.text || '').join(''),
          },
          finish_reason: d.stop_reason,
        },
      ],
      usage: d.usage,
    };
  }
  if (provider === 'GEMINI') {
    const d = data as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
      }>;
    };
    return {
      choices: [
        {
          message: {
            role: 'assistant',
            content:
              d.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '',
          },
          finish_reason: d.candidates?.[0]?.finishReason,
        },
      ],
    };
  }
  return data;
}

// ---------- Streaming: parse vendor-specific SSE → OpenAI-shaped chunks ----------

async function* sseLines(reader: ReadableStreamDefaultReader<Uint8Array>) {
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      yield payload;
    }
  }
}

async function* toOpenAIChunks(
  provider: string,
  reader: ReadableStreamDefaultReader<Uint8Array>,
): AsyncGenerator<unknown> {
  if (provider === 'OPEN_AI' || provider === 'PERPLEXITY') {
    for await (const payload of sseLines(reader)) {
      try {
        yield JSON.parse(payload);
      } catch {}
    }
    return;
  }
  if (provider === 'ANTHROPIC') {
    for await (const payload of sseLines(reader)) {
      try {
        const evt = JSON.parse(payload);
        if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
          yield {
            choices: [{ delta: { content: evt.delta.text }, index: 0 }],
          };
        } else if (evt.type === 'message_stop') {
          yield { choices: [{ delta: {}, finish_reason: 'stop', index: 0 }] };
        }
      } catch {}
    }
    return;
  }
  if (provider === 'GEMINI') {
    for await (const payload of sseLines(reader)) {
      try {
        const evt = JSON.parse(payload);
        const text =
          evt.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') ||
          '';
        if (text) yield { choices: [{ delta: { content: text }, index: 0 }] };
      } catch {}
    }
    return;
  }
}

// ---------- Error formatter ----------

function formatErrorResponse(error: unknown, provider?: string) {
  const statusCode =
    (error as { statusCode?: number; status?: number })?.statusCode ||
    (error as { status?: number })?.status ||
    500;
  const providerName = provider || 'Unknown';
  return {
    error: `${providerName.toUpperCase()} API error: ${statusCode}`,
    details: error instanceof Error ? error.message : String(error),
    statusCode,
  };
}

// ---------- Route handler ----------

export async function POST(request: NextRequest) {
  let body: { provider?: string; model?: string; messages?: Msg[]; stream?: boolean; parameters?: Record<string, unknown> } = {};

  try {
    body = await request.json();
    const { provider, model, messages, stream = false, parameters = {} } = body;

    if (!provider || !model || !messages?.length) {
      return NextResponse.json(
        { error: 'Missing required fields: provider, model, messages', details: 'Request validation failed' },
        { status: 400 },
      );
    }

    const apiKey = API_KEYS[provider];
    if (!apiKey) {
      return NextResponse.json(
        {
          error: `${provider.toUpperCase()} API key is not configured`,
          details: 'The API key for this provider is missing in environment variables',
        },
        { status: 400 },
      );
    }

    // Dispatch to the right provider
    let upstream: Response;
    switch (provider) {
      case 'OPEN_AI':
        upstream = await callOpenAICompatible('https://api.openai.com/v1/chat/completions', model, messages, apiKey, stream, parameters);
        break;
      case 'PERPLEXITY':
        upstream = await callOpenAICompatible('https://api.perplexity.ai/chat/completions', model, messages, apiKey, stream, parameters);
        break;
      case 'ANTHROPIC':
        upstream = await callAnthropic(model, messages, apiKey, stream, parameters);
        break;
      case 'GEMINI':
        upstream = await callGemini(model, messages, apiKey, stream, parameters);
        break;
      default:
        return NextResponse.json(
          { error: `Unknown provider: ${provider}`, details: 'Supported: OPEN_AI, ANTHROPIC, GEMINI, PERPLEXITY' },
          { status: 400 },
        );
    }

    if (!upstream.ok) {
      const text = await upstream.text();
      let details = text;
      try {
        const parsed = JSON.parse(text);
        details = parsed?.error?.message || parsed?.error || text;
      } catch {}
      return NextResponse.json(
        { error: `${provider} API error: ${upstream.status}`, details },
        { status: upstream.status },
      );
    }

    if (stream) {
      const reader = upstream.body?.getReader();
      if (!reader) {
        return NextResponse.json(
          { error: 'Upstream response has no readable body', details: '' },
          { status: 500 },
        );
      }

      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start' })}\n\n`));
            for await (const chunk of toOpenAIChunks(provider, reader)) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', chunk })}\n\n`));
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
            controller.close();
          } catch (error) {
            const formatted = formatErrorResponse(error, provider);
            console.error('API Route Error:', { error: formatted.error, details: formatted.details });
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: 'error', error: formatted.error, details: formatted.details })}\n\n`,
              ),
            );
            controller.close();
          }
        },
      });

      return new NextResponse(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    const data = await upstream.json();
    return NextResponse.json(normalizeNonStream(provider, data));
  } catch (error) {
    const formatted = formatErrorResponse(error, body?.provider);
    console.error('API Route Error:', { error: formatted.error, details: formatted.details });
    return NextResponse.json(
      { error: formatted.error, details: formatted.details },
      { status: formatted.statusCode },
    );
  }
}
