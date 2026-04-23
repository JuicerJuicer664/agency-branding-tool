'use client';

import React, { useEffect, useRef } from 'react';

export interface DownloadStage {
  label: string;
  detail?: string;
}

export interface DownloadProgressState {
  visible: boolean;
  progress: number; // 0–100
  stageName: string;
  stageDetail: string;
  error: string | null;
  retrying: boolean;
  success: boolean;
}

interface DownloadProgressModalProps {
  state: DownloadProgressState;
  onRetry?: () => void;
  onClose?: () => void;
}

export default function DownloadProgressModal({ state, onRetry, onClose }: DownloadProgressModalProps) {
  const { visible, progress, stageName, stageDetail, error, retrying, success } = state;

  // Auto-close after success
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (success && onClose) {
      closeTimerRef.current = setTimeout(() => {
        onClose();
      }, 1800);
    }
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, [success, onClose]);

  if (!visible) return null;

  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      aria-modal="true"
      role="dialog"
      aria-label="Download progress"
    >
      <div
        className="relative flex flex-col items-center rounded-2xl border border-white/10 shadow-2xl"
        style={{
          background: '#181818',
          width: '380px',
          maxWidth: '92vw',
          padding: '36px 32px 32px',
        }}
      >
        {/* Icon area */}
        <div className="mb-5 flex items-center justify-center">
          {success ? (
            <div
              className="flex items-center justify-center rounded-full"
              style={{ width: '56px', height: '56px', background: 'rgba(34,197,94,0.12)', border: '2px solid rgba(34,197,94,0.4)' }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          ) : error ? (
            <div
              className="flex items-center justify-center rounded-full"
              style={{ width: '56px', height: '56px', background: 'rgba(232,0,42,0.12)', border: '2px solid rgba(232,0,42,0.4)' }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E8002A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
          ) : (
            <div
              className="flex items-center justify-center rounded-full"
              style={{ width: '56px', height: '56px', background: 'rgba(232,0,42,0.10)', border: '2px solid rgba(232,0,42,0.25)' }}
            >
              <svg
                width="26" height="26" viewBox="0 0 24 24" fill="none"
                stroke="#E8002A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ animation: 'spin 1.2s linear infinite' }}
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </div>
          )}
        </div>

        {/* Title */}
        <h3
          className="text-white font-semibold text-base mb-1 text-center"
          style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '0.01em' }}
        >
          {success ? 'Download Complete' : error ? 'Download Failed' : 'Preparing Download'}
        </h3>

        {/* Stage name */}
        <p
          className="text-sm mb-1 text-center"
          style={{
            fontFamily: 'Inter, sans-serif',
            color: success ? '#22c55e' : error ? '#E8002A' : '#B8B8B8',
          }}
        >
          {success ? 'Your high-res image is ready.' : error ? error : stageName}
        </p>

        {/* Stage detail */}
        {!success && !error && stageDetail && (
          <p
            className="text-xs text-center mb-4"
            style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.35)' }}
          >
            {stageDetail}
          </p>
        )}

        {/* Progress bar */}
        {!error && (
          <div className="w-full mt-4 mb-2">
            <div
              className="w-full rounded-full overflow-hidden"
              style={{ height: '6px', background: 'rgba(255,255,255,0.08)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${clampedProgress}%`,
                  background: success
                    ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                    : 'linear-gradient(90deg, #E8002A, #ff4d6d)',
                  transition: 'width 0.35s cubic-bezier(0.4,0,0.2,1)',
                }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span
                className="text-[11px]"
                style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.3)' }}
              >
                {success ? 'Done' : retrying ? 'Retrying…' : `${Math.round(clampedProgress)}%`}
              </span>
              {!success && (
                <span
                  className="text-[11px]"
                  style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.3)' }}
                >
                  Full resolution
                </span>
              )}
            </div>
          </div>
        )}

        {/* Stage indicators */}
        {!success && !error && (
          <div className="w-full mt-3 flex flex-col gap-1.5">
            {[
              { label: 'Verifying fonts', range: [0, 20] },
              { label: 'Building canvas', range: [20, 45] },
              { label: 'Mapping elements', range: [45, 70] },
              { label: 'Quality check', range: [70, 90] },
              { label: 'Encoding PNG', range: [90, 100] },
            ].map((stage) => {
              const done = clampedProgress >= stage.range[1];
              const active = clampedProgress >= stage.range[0] && clampedProgress < stage.range[1];
              return (
                <div key={stage.label} className="flex items-center gap-2">
                  <div
                    className="flex-shrink-0 rounded-full"
                    style={{
                      width: '7px',
                      height: '7px',
                      background: done ? '#22c55e' : active ? '#E8002A' : 'rgba(255,255,255,0.15)',
                      transition: 'background 0.3s',
                      boxShadow: active ? '0 0 6px rgba(232,0,42,0.6)' : 'none',
                    }}
                  />
                  <span
                    className="text-[11px]"
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      color: done ? 'rgba(34,197,94,0.8)' : active ? '#fff' : 'rgba(255,255,255,0.3)',
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {stage.label}
                  </span>
                  {done && (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto' }}>
                      <polyline points="10 3 5 9 2 6" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Error actions */}
        {error && (
          <div className="flex gap-3 mt-5 w-full">
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  background: '#E8002A',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="flex-1 rounded-lg py-2.5 text-sm font-medium transition-all"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  background: 'rgba(255,255,255,0.07)',
                  color: '#B8B8B8',
                  border: '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            )}
          </div>
        )}

        {/* Success close hint */}
        {success && (
          <p
            className="text-[11px] mt-4 text-center"
            style={{ fontFamily: 'Inter, sans-serif', color: 'rgba(255,255,255,0.25)' }}
          >
            This dialog will close automatically
          </p>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
