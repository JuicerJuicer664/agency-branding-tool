'use client';

import { useMemo } from 'react';
import Icon from '@/components/ui/AppIcon';
import { GalleryItem } from './types';

interface GalleryStatsProps {
  items: GalleryItem[];
}

export default function GalleryStats({ items }: GalleryStatsProps) {
  const stats = useMemo(() => ({
    total: items.length,
    totalDownloads: items.reduce((s, i) => s + i.downloadCount, 0),
    totalShares: items.reduce((s, i) => s + i.shareCount, 0),
    newListings: items.filter(i => i.listingType === 'New Listing').length,
  }), [items]);

  const statCards = [
    { label: 'Total Assets', value: stats.total, icon: 'PhotoIcon', color: 'text-[#D4AF37]' },
    { label: 'Total Downloads', value: stats.totalDownloads, icon: 'ArrowDownTrayIcon', color: 'text-green-400' },
    { label: 'Total Shares', value: stats.totalShares, icon: 'ShareIcon', color: 'text-blue-400' },
    { label: 'New Listings', value: stats.newListings, icon: 'SparklesIcon', color: 'text-purple-400' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {statCards.map(card => (
        <div key={card.label} className="bg-[#242424] border border-white/10 rounded-lg px-4 py-3 flex items-center gap-3">
          <div className={`${card.color} flex-shrink-0`}>
            <Icon name={card.icon as any} size={20} variant="outline" className={card.color} />
          </div>
          <div>
            <p className="text-xl font-bold text-white font-mono">{card.value}</p>
            <p className="text-xs text-[#B8B8B8]" style={{ fontFamily: 'Inter, sans-serif' }}>{card.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}