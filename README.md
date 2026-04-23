# Agency Branding Tool

A modern Next.js 15 application for agency branding, marketing galleries, and AI-assisted creative workflows. Built with TypeScript and Tailwind CSS.

## Features

- **Next.js 15** with the App Router
- **React 19**
- **TypeScript**
- **Tailwind CSS** for styling
- **Multi-provider AI chat completion** (OpenAI, Anthropic, Gemini, Perplexity) via a single normalized endpoint at `/api/ai/chat-completion`
- Streaming and non-streaming responses, all returned in OpenAI-compatible shape

## Installation

```bash
npm install
```

## Environment Variables

Create a `.env.local` file in the project root:

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...
PERPLEXITY_API_KEY=pplx-...
```

Only set the keys for the providers you actually use.

## Development

```bash
npm run dev
```

Open [http://localhost:4028](http://localhost:4028).

## Production

```bash
npm run build
npm run start
```

## Project Structure

```
agency-branding-tool/
├── public/             Static assets
├── src/
│   ├── app/            App Router pages and API routes
│   ├── components/     Reusable UI components
│   ├── lib/            Helpers, hooks, AI client
│   └── styles/         Global styles
├── next.config.mjs     Next.js configuration
├── tailwind.config.js  Tailwind configuration
└── package.json
```

## Available Scripts

- `npm run dev` — start the dev server on port 4028
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` / `lint:fix` — lint
- `npm run format` — Prettier
- `npm run type-check` — TypeScript without emitting

## License

Private project.
