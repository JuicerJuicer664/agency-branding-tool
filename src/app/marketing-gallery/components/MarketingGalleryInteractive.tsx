'use client';

import { useState, useCallback } from 'react';
import BrandHeader from '@/components/common/BrandHeader';
import TabNavigation from '@/components/common/TabNavigation';
import GalleryGrid from './GalleryGrid';
import GalleryFilters from './GalleryFilters';
import PreviewModal from './PreviewModal';
import BulkActionBar from './BulkActionBar';
import DeleteConfirmModal from './DeleteConfirmModal';
import GalleryStats from './GalleryStats';
import { GalleryItem, FilterState } from './types';
import { mockGalleryItems } from './mockData';

export default function MarketingGalleryInteractive() {
  const [items, setItems] = useState<GalleryItem[]>(mockGalleryItems);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    propertyType: 'all',
    sortBy: 'newest',
    dateRange: 'all',
  });
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [previewItem, setPreviewItem] = useState<GalleryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number[] | null>(null);
  const [bulkDownloading, setBulkDownloading] = useState(false);

  const filteredItems = useCallback(() => {
    let result = [...items];
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(i => i.address.toLowerCase().includes(q));
    }
    if (filters.propertyType !== 'all') {
      result = result.filter(i => i.propertyType === filters.propertyType);
    }
    if (filters.dateRange !== 'all') {
      const now = new Date('2026-03-10');
      const days = filters.dateRange === '7d' ? 7 : filters.dateRange === '30d' ? 30 : 90;
      const cutoff = new Date(now.getTime() - days * 86400000);
      result = result.filter(i => new Date(i.createdAt) >= cutoff);
    }
    if (filters.sortBy === 'newest') result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else if (filters.sortBy === 'oldest') result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    else if (filters.sortBy === 'downloads') result.sort((a, b) => b.downloadCount - a.downloadCount);
    else if (filters.sortBy === 'alpha') result.sort((a, b) => a.address.localeCompare(b.address));
    return result;
  }, [items, filters]);

  const handleSelectItem = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    const visible = filteredItems().map(i => i.id);
    if (selectedIds.size === visible.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(visible));
  };

  const handleDelete = (ids: number[]) => setDeleteTarget(ids);

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setItems(prev => prev.filter(i => !deleteTarget.includes(i.id)));
    setSelectedIds(prev => {
      const next = new Set(prev);
      deleteTarget.forEach(id => next.delete(id));
      return next;
    });
    if (previewItem && deleteTarget.includes(previewItem.id)) setPreviewItem(null);
    setDeleteTarget(null);
  };

  const handleBulkDownload = async () => {
    setBulkDownloading(true);
    await new Promise(r => setTimeout(r, 1800));
    setBulkDownloading(false);
    setSelectedIds(new Set());
  };

  const handleDownload = (item: GalleryItem) => {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, downloadCount: i.downloadCount + 1 } : i));
  };

  const handleDuplicate = (item: GalleryItem) => {
    const newItem: GalleryItem = {
      ...item,
      id: Date.now(),
      address: item.address + ' (Copy)',
      createdAt: '2026-03-10',
      downloadCount: 0,
    };
    setItems(prev => [newItem, ...prev]);
  };

  const displayed = filteredItems();
  const allSelected = selectedIds.size > 0 && selectedIds.size === displayed.length;

  return (
    <div className="min-h-screen bg-[#0F0F0F]">
      <BrandHeader />
      <TabNavigation />
      <main className="pt-32 pb-16 px-4 md:px-8 lg:px-10 max-w-[1600px] mx-auto">
        <div className="mb-6">
          <GalleryStats items={items} />
        </div>
        <GalleryFilters
          filters={filters}
          onFiltersChange={setFilters}
          totalCount={displayed.length}
          selectedCount={selectedIds.size}
          allSelected={allSelected}
          onSelectAll={handleSelectAll}
        />
        {selectedIds.size > 0 && (
          <div className="mb-4">
            <BulkActionBar
              selectedCount={selectedIds.size}
              onBulkDownload={handleBulkDownload}
              onBulkDelete={() => handleDelete(Array.from(selectedIds))}
              onClearSelection={() => setSelectedIds(new Set())}
              isDownloading={bulkDownloading}
            />
          </div>
        )}
        <GalleryGrid
          items={displayed}
          selectedIds={selectedIds}
          onSelectItem={handleSelectItem}
          onPreview={setPreviewItem}
          onDownload={handleDownload}
          onDuplicate={handleDuplicate}
          onDelete={(id) => handleDelete([id])}
        />
        {previewItem && (
          <PreviewModal
            item={previewItem}
            onClose={() => setPreviewItem(null)}
            onDownload={handleDownload}
            onDuplicate={handleDuplicate}
            onDelete={(id) => handleDelete([id])}
          />
        )}
        {deleteTarget && (
          <DeleteConfirmModal
            count={deleteTarget.length}
            onConfirm={confirmDelete}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </main>
    </div>
  );
}