'use client';

import { useState } from 'react';
import AppImage from '@/components/ui/AppImage';
import Icon from '@/components/ui/AppIcon';
import { GalleryItem } from './types';

interface GalleryCardProps {
  item: GalleryItem;
  isSelected: boolean;
  onSelect: () => void;
  onPreview: () => void;
  onDownload: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const listingBadgeColor: Record<string, string> = {
  'New Listing': 'bg-[#D4AF37] text-black',
  'Open House': 'bg-blue-500 text-white',
  'Just Sold': 'bg-green-500 text-white',
  'Price Reduced': 'bg-red-500 text-white',
};

export default function GalleryCard({
  item, isSelected, onSelect, onPreview, onDownload, onDuplicate, onDelete
}: GalleryCardProps) {
  const [hovered, setHovered] = useState(false);

  const formatDate = (d: string) => {
    const [y, m, day] = d.split('-');
    return `${m}/${day}/${y}`;
  };

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-[#242424] border transition-all duration-200 cursor-pointer group
        ${isSelected ? 'border-[#D4AF37] shadow-[0_0_0_2px_rgba(212,175,55,0.3)]' : 'border-white/10 hover:border-white/25'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Checkbox */}
      <button
        onClick={e => { e.stopPropagation(); onSelect(); }}
        className="absolute top-2 left-2 z-20 w-6 h-6 rounded border flex items-center justify-center transition-all"
        style={{ background: isSelected ? '#D4AF37' : 'rgba(0,0,0,0.6)', borderColor: isSelected ? '#D4AF37' : 'rgba(255,255,255,0.4)' }}
        aria-label={isSelected ? 'Deselect item' : 'Select item'}
      >
        {isSelected && <Icon name="CheckIcon" size={12} className="text-black" variant="solid" />}
      </button>

      {/* Listing badge */}
      <div className="absolute top-2 right-2 z-20">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${listingBadgeColor[item.listingType] || 'bg-gray-600 text-white'}`}
          style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', letterSpacing: '0.05em' }}>
          {item.listingType}
        </span>
      </div>

      {/* Image with overlay */}
      <div className="relative overflow-hidden" style={{ height: '200px' }} onClick={onPreview}>
        <AppImage
          src={item.imageUrl}
          alt={item.imageAlt}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        {/* Branded overlay preview */}
        <div className="absolute inset-x-0 bottom-0 h-[45%]"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 60%, transparent 100%)' }}>
          <div className="absolute bottom-0 left-0 right-0 px-3 pb-2">
            <div className="flex justify-center mb-1">
              <svg width="18" height="18" viewBox="0 0 36 36" fill="none" aria-hidden="true">
                <path d="M18 4L32 30H4L18 4Z" fill="white" opacity="0.9" />
                <rect x="11" y="22" width="14" height="2" fill="#D4AF37" />
              </svg>
            </div>
            <p className="text-white text-center font-bold truncate" style={{ fontFamily: 'Playfair Display, serif', fontSize: '0.7rem' }}>
              {item.listingType}
            </p>
            <p className="text-white/80 text-center truncate" style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', letterSpacing: '0.05em' }}>
              {item.address}
            </p>
          </div>
        </div>
        {/* Hover overlay */}
        {hovered && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-sm font-medium bg-black/60 px-3 py-1 rounded-full" style={{ fontFamily: 'Inter, sans-serif' }}>
              Preview
            </span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-3">
        <p className="text-white text-sm font-semibold truncate mb-0.5" title={item.address}>
          {item.address}
        </p>
        <p className="text-[#B8B8B8] text-xs mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
          {item.city}, {item.state}
        </p>
        <div className="flex items-center gap-2 text-xs text-[#B8B8B8] mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
          {item.beds > 0 && <span>{item.beds} bd</span>}
          {item.beds > 0 && <span className="text-white/20">|</span>}
          <span>{item.baths} ba</span>
          <span className="text-white/20">|</span>
          <span>{item.sqft.toLocaleString()} sqft</span>
        </div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[#D4AF37] font-bold text-sm">{item.price}</span>
          <span className="text-[#B8B8B8] text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>{formatDate(item.createdAt)}</span>
        </div>
        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-[#B8B8B8] mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
          <span className="flex items-center gap-1">
            <Icon name="ArrowDownTrayIcon" size={12} className="text-[#B8B8B8]" />
            {item.downloadCount}
          </span>
          <span className="flex items-center gap-1">
            <Icon name="ShareIcon" size={12} className="text-[#B8B8B8]" />
            {item.shareCount}
          </span>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={e => { e.stopPropagation(); onDownload(); }}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md bg-[#D4AF37] hover:bg-[#c9a430] text-black text-xs font-semibold transition-colors"
            title="Download"
          >
            <Icon name="ArrowDownTrayIcon" size={13} className="text-black" />
            <span>Download</span>
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDuplicate(); }}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-white/5 hover:bg-white/10 text-[#B8B8B8] hover:text-white transition-colors"
            title="Duplicate"
          >
            <Icon name="DocumentDuplicateIcon" size={14} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-white/5 hover:bg-red-500/20 text-[#B8B8B8] hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Icon name="TrashIcon" size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}