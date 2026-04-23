'use client';

import Icon from '@/components/ui/AppIcon';
import { FilterState } from './types';

interface GalleryFiltersProps {
  filters: FilterState;
  onFiltersChange: (f: FilterState) => void;
  totalCount: number;
  selectedCount: number;
  allSelected: boolean;
  onSelectAll: () => void;
}

const selectClass = "bg-[#242424] border border-white/10 text-white text-sm rounded-md px-3 py-2 focus:outline-none focus:border-[#D4AF37] cursor-pointer";

export default function GalleryFilters({
  filters, onFiltersChange, totalCount, selectedCount, allSelected, onSelectAll
}: GalleryFiltersProps) {
  const update = (key: keyof FilterState, value: string) =>
    onFiltersChange({ ...filters, [key]: value });

  return (
    <div className="mb-5 space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Icon name="MagnifyingGlassIcon" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B8B8B8]" />
          <input
            type="text"
            placeholder="Search by address..."
            value={filters.search}
            onChange={e => update('search', e.target.value)}
            className="w-full bg-[#242424] border border-white/10 text-white text-sm rounded-md pl-9 pr-3 py-2 focus:outline-none focus:border-[#D4AF37] placeholder-[#B8B8B8]"
          />
        </div>
        {/* Property Type */}
        <select value={filters.propertyType} onChange={e => update('propertyType', e.target.value)} className={selectClass}>
          <option value="all">All Types</option>
          <option value="residential">Residential</option>
          <option value="luxury">Luxury</option>
          <option value="condo">Condo</option>
          <option value="commercial">Commercial</option>
        </select>
        {/* Date Range */}
        <select value={filters.dateRange} onChange={e => update('dateRange', e.target.value)} className={selectClass}>
          <option value="all">All Time</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </select>
        {/* Sort */}
        <select value={filters.sortBy} onChange={e => update('sortBy', e.target.value)} className={selectClass}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="downloads">Most Downloaded</option>
          <option value="alpha">Alphabetical</option>
        </select>
      </div>
      {/* Row 2: count + select all */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onSelectAll}
            className="flex items-center gap-2 text-sm text-[#B8B8B8] hover:text-white transition-colors"
          >
            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${allSelected ? 'bg-[#D4AF37] border-[#D4AF37]' : 'border-white/30'}`}>
              {allSelected && <Icon name="CheckIcon" size={10} className="text-black" variant="solid" />}
            </div>
            <span style={{ fontFamily: 'Inter, sans-serif' }}>Select All</span>
          </button>
          {selectedCount > 0 && (
            <span className="text-xs text-[#D4AF37]" style={{ fontFamily: 'Inter, sans-serif' }}>
              {selectedCount} selected
            </span>
          )}
        </div>
        <p className="text-sm text-[#B8B8B8]" style={{ fontFamily: 'Inter, sans-serif' }}>
          {totalCount} {totalCount === 1 ? 'asset' : 'assets'}
        </p>
      </div>
    </div>
  );
}