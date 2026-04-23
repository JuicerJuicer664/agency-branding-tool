'use client';

import { GalleryItem } from './types';
import GalleryCard from './GalleryCard';

interface GalleryGridProps {
  items: GalleryItem[];
  selectedIds: Set<number>;
  onSelectItem: (id: number) => void;
  onPreview: (item: GalleryItem) => void;
  onDownload: (item: GalleryItem) => void;
  onDuplicate: (item: GalleryItem) => void;
  onDelete: (id: number) => void;
}

export default function GalleryGrid({
  items, selectedIds, onSelectItem, onPreview, onDownload, onDuplicate, onDelete
}: GalleryGridProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-[#242424] flex items-center justify-center mb-4">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect width="32" height="32" rx="6" fill="#D4AF37" opacity="0.15" />
            <path d="M16 6L26 24H6L16 6Z" fill="#D4AF37" opacity="0.6" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-1">No assets found</h3>
        <p className="text-sm text-[#B8B8B8]">Try adjusting your filters or create new marketing materials.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map(item => (
        <GalleryCard
          key={item.id}
          item={item}
          isSelected={selectedIds.has(item.id)}
          onSelect={() => onSelectItem(item.id)}
          onPreview={() => onPreview(item)}
          onDownload={() => onDownload(item)}
          onDuplicate={() => onDuplicate(item)}
          onDelete={() => onDelete(item.id)}
        />
      ))}
    </div>
  );
}