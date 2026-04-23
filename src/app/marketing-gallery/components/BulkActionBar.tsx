'use client';

import Icon from '@/components/ui/AppIcon';

interface BulkActionBarProps {
  selectedCount: number;
  onBulkDownload: () => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
  isDownloading: boolean;
}

export default function BulkActionBar({
  selectedCount, onBulkDownload, onBulkDelete, onClearSelection, isDownloading
}: BulkActionBarProps) {
  return (
    <div className="flex items-center gap-3 bg-[#1A1A1A] border border-[#D4AF37]/40 rounded-lg px-4 py-3">
      <div className="flex items-center gap-2 flex-1">
        <div className="w-5 h-5 rounded bg-[#D4AF37] flex items-center justify-center flex-shrink-0">
          <Icon name="CheckIcon" size={12} className="text-black" variant="solid" />
        </div>
        <span className="text-white text-sm font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
          {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onBulkDownload}
          disabled={isDownloading}
          className="flex items-center gap-2 px-4 py-2 bg-[#D4AF37] hover:bg-[#c9a430] disabled:opacity-60 text-black text-sm font-semibold rounded-md transition-colors"
        >
          {isDownloading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Preparing ZIP...</span>
            </>
          ) : (
            <>
              <Icon name="ArchiveBoxArrowDownIcon" size={16} className="text-black" />
              <span>Download ZIP</span>
            </>
          )}
        </button>
        <button
          onClick={onBulkDelete}
          className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-semibold rounded-md border border-red-500/30 transition-colors"
        >
          <Icon name="TrashIcon" size={16} className="text-red-400" />
          <span>Delete</span>
        </button>
        <button
          onClick={onClearSelection}
          className="w-8 h-8 flex items-center justify-center rounded-md bg-white/5 hover:bg-white/10 text-[#B8B8B8] hover:text-white transition-colors"
          title="Clear selection"
        >
          <Icon name="XMarkIcon" size={16} />
        </button>
      </div>
    </div>
  );
}