'use client';

import Icon from '@/components/ui/AppIcon';

interface ActionButtonsTestProps {
  hasImage: boolean;
  previewReady: boolean;
  isGenerating: boolean;
  onGenerate: () => void;
  onScreenshot: () => void;
}

export default function ActionButtonsTest({
  hasImage,
  previewReady,
  isGenerating,
  onGenerate,
  onScreenshot,
}: ActionButtonsTestProps) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#242424] p-5">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Generate Preview */}
        <button
          onClick={onGenerate}
          disabled={!hasImage || isGenerating}
          className={`
            flex-1 flex items-center justify-center gap-2 rounded-md px-6 py-3
            font-semibold text-sm uppercase tracking-widest transition-all duration-200
            min-h-[48px] focus:outline-none focus:ring-2 focus:ring-[#E8002A]/50
            ${!hasImage || isGenerating
              ? 'bg-[#1A1A1A] text-[#555] border border-white/10 cursor-not-allowed'
              : 'bg-[#E8002A] text-white hover:bg-[#C8001F] active:scale-[0.98] border border-[#E8002A] shadow-elevation-sm'
            }
          `}
          style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '0.1em' }}
          aria-label="Generate branded preview"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Icon name="SparklesIcon" size={16} variant={hasImage ? 'solid' : 'outline'} />
              Generate Preview
            </>
          )}
        </button>

        {/* Screenshot */}
        <button
          onClick={onScreenshot}
          disabled={!previewReady}
          className={`
            flex-1 flex items-center justify-center gap-2 rounded-md px-6 py-3
            font-semibold text-sm uppercase tracking-widest transition-all duration-200
            min-h-[48px] focus:outline-none focus:ring-2 focus:ring-white/20
            ${!previewReady
              ? 'bg-[#1A1A1A] text-[#555] border border-white/10 cursor-not-allowed'
              : 'bg-white text-black hover:bg-[#E8E8E8] active:scale-[0.98] border border-white shadow-elevation-sm'
            }
          `}
          style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '0.1em' }}
          aria-label="Screenshot the branded preview as PNG"
        >
          <Icon name="ArrowDownTrayIcon" size={16} variant={previewReady ? 'solid' : 'outline'} />
          Download
        </button>
      </div>

      {/* Helper text */}
      <div className="mt-3 space-y-1">
        {!hasImage && (
          <p className="text-xs text-[#555] flex items-center gap-1.5" style={{ fontFamily: 'Inter, sans-serif' }}>
            <Icon name="InformationCircleIcon" size={12} variant="outline" className="text-[#555]" />
            Upload a property photo to enable preview generation
          </p>
        )}
        {hasImage && !previewReady && !isGenerating && (
          <p className="text-xs text-[#B8B8B8] flex items-center gap-1.5" style={{ fontFamily: 'Inter, sans-serif' }}>
            <Icon name="InformationCircleIcon" size={12} variant="outline" className="text-[#E8002A]" />
            Fill in property details and click &ldquo;Generate Preview&rdquo;
          </p>
        )}
        {previewReady && (
          <p className="text-xs text-[#B8B8B8] flex items-center gap-1.5" style={{ fontFamily: 'Inter, sans-serif' }}>
            <Icon name="InformationCircleIcon" size={12} variant="outline" className="text-[#E8002A]" />
            Captures the preview exactly as it appears on screen
          </p>
        )}
      </div>
    </div>
  );
}
