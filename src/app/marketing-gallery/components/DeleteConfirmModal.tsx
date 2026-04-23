'use client';

import Icon from '@/components/ui/AppIcon';

interface DeleteConfirmModalProps {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmModal({ count, onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-[#1A1A1A] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-elevation-xl">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/15 mx-auto mb-4">
          <Icon name="TrashIcon" size={24} className="text-red-400" />
        </div>
        <h3 className="text-white text-lg font-bold text-center mb-2">
          Delete {count === 1 ? 'Asset' : `${count} Assets`}
        </h3>
        <p className="text-[#B8B8B8] text-sm text-center mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
          {count === 1
            ? 'This asset will be permanently deleted. This action cannot be undone.'
            : `These ${count} assets will be permanently deleted. This action cannot be undone.`}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-lg border border-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}