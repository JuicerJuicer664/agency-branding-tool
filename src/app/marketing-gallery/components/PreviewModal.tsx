'use client';

import { useState, useEffect } from 'react';
import AppImage from '@/components/ui/AppImage';
import Icon from '@/components/ui/AppIcon';
import { GalleryItem } from './types';

interface PreviewModalProps {
  item: GalleryItem;
  onClose: () => void;
  onDownload: (item: GalleryItem) => void;
  onDuplicate: (item: GalleryItem) => void;
  onDelete: (id: number) => void;
}

const listingBadgeColor: Record<string, string> = {
  'New Listing': 'bg-[#D4AF37] text-black',
  'Open House': 'bg-blue-500 text-white',
  'Just Sold': 'bg-green-500 text-white',
  'Price Reduced': 'bg-red-500 text-white',
};

const socialCaptions: Record<string, string> = {
  instagram: '✨ {listingType} | {address}, {city}, {state}\n🛏 {beds} Beds | 🛁 {baths} Baths | 📐 {sqft} sqft\n💰 {price}\n\nContact us today to schedule a private showing.\n\n#TheAgency #RealEstate #LuxuryHomes #{city}RealEstate',
  facebook: '🏡 {listingType} — {address}, {city}, {state}\n\n{beds} Beds | {baths} Baths | {sqft} sqft\nAsking: {price}\n\nDM or call us to learn more about this stunning property.',
  twitter: '🏠 {listingType}: {address}, {city} {state} — {beds}bd/{baths}ba, {sqft}sqft at {price}. #TheAgency #RealEstate',
};

function buildCaption(template: string, item: GalleryItem): string {
  return template
    .replace(/{listingType}/g, item.listingType)
    .replace(/{address}/g, item.address)
    .replace(/{city}/g, item.city)
    .replace(/{state}/g, item.state)
    .replace(/{beds}/g, String(item.beds))
    .replace(/{baths}/g, String(item.baths))
    .replace(/{sqft}/g, item.sqft.toLocaleString())
    .replace(/{price}/g, item.price);
}

export default function PreviewModal({ item, onClose, onDownload, onDuplicate, onDelete }: PreviewModalProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'share'>('preview');
  const [activeSocial, setActiveSocial] = useState<'instagram' | 'facebook' | 'twitter'>('instagram');
  const [copied, setCopied] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<'jpg' | 'png' | 'webp'>('jpg');

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const caption = buildCaption(socialCaptions[activeSocial], item);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (d: string) => {
    const [y, m, day] = d.split('-');
    return `${m}/${day}/${y}`;
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className="relative bg-[#1A1A1A] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col lg:flex-row shadow-elevation-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
          aria-label="Close preview"
        >
          <Icon name="XMarkIcon" size={18} />
        </button>

        {/* Left: Image */}
        <div className="relative lg:w-[55%] flex-shrink-0 bg-black" style={{ minHeight: '300px' }}>
          <div className="relative w-full h-full" style={{ minHeight: '300px' }}>
            <AppImage
              src={item.imageUrl}
              alt={item.imageAlt}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 55vw"
              priority
            />
            {/* Branded overlay */}
            <div className="absolute inset-x-0 bottom-0 h-[42%]"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 55%, transparent 100%)' }}>
              <div className="absolute bottom-0 left-0 right-0 px-6 pb-5 text-center">
                <div className="flex justify-center mb-2">
                  <svg width="28" height="28" viewBox="0 0 36 36" fill="none" aria-hidden="true">
                    <path d="M18 4L32 30H4L18 4Z" fill="white" opacity="0.95" />
                    <rect x="11" y="22" width="14" height="2.5" fill="#D4AF37" />
                  </svg>
                </div>
                <p className="text-white font-bold mb-1" style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.1rem' }}>
                  {item.listingType}
                </p>
                <p className="text-white/90 font-semibold uppercase tracking-widest mb-1" style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', letterSpacing: '0.12em' }}>
                  {item.address}
                </p>
                <p className="text-white/70" style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem' }}>
                  {item.beds > 0 ? `${item.beds} Beds | ` : ''}{item.baths} Baths | {item.sqft.toLocaleString()} Sq Ft
                </p>
              </div>
            </div>
            {/* Badge */}
            <div className="absolute top-3 left-3">
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${listingBadgeColor[item.listingType]}`}
                style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem' }}>
                {item.listingType}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Details */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-white/10 flex-shrink-0">
            {(['preview', 'share'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${activeTab === tab ? 'text-[#D4AF37] border-b-2 border-[#D4AF37]' : 'text-[#B8B8B8] hover:text-white'}`}
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {tab === 'preview' ? 'Details' : 'Share'}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {activeTab === 'preview' ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-white font-bold text-lg leading-tight">{item.address}</h2>
                  <p className="text-[#B8B8B8] text-sm">{item.city}, {item.state}</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Beds', value: item.beds > 0 ? item.beds : '—', icon: 'HomeIcon' },
                    { label: 'Baths', value: item.baths, icon: 'HomeModernIcon' },
                    { label: 'Sq Ft', value: item.sqft.toLocaleString(), icon: 'Squares2X2Icon' },
                  ].map(s => (
                    <div key={s.label} className="bg-[#242424] rounded-lg p-3 text-center">
                      <p className="text-white font-bold text-base">{s.value}</p>
                      <p className="text-[#B8B8B8] text-xs mt-0.5" style={{ fontFamily: 'Inter, sans-serif' }}>{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between py-2 border-t border-white/10">
                  <span className="text-[#B8B8B8] text-sm">Asking Price</span>
                  <span className="text-[#D4AF37] font-bold text-lg">{item.price}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-white/10">
                  <span className="text-[#B8B8B8] text-sm">Created</span>
                  <span className="text-white text-sm">{formatDate(item.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-white/10">
                  <span className="text-[#B8B8B8] text-sm">Downloads</span>
                  <span className="text-white text-sm">{item.downloadCount}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-white/10">
                  <span className="text-[#B8B8B8] text-sm">Shares</span>
                  <span className="text-white text-sm">{item.shareCount}</span>
                </div>
                {/* Download format */}
                <div className="pt-2">
                  <p className="text-[#B8B8B8] text-xs mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>Download Format</p>
                  <div className="flex gap-2 mb-3">
                    {(['jpg', 'png', 'webp'] as const).map(fmt => (
                      <button
                        key={fmt}
                        onClick={() => setDownloadFormat(fmt)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium uppercase transition-colors ${downloadFormat === fmt ? 'bg-[#D4AF37] text-black' : 'bg-[#242424] text-[#B8B8B8] hover:text-white border border-white/10'}`}
                        style={{ fontFamily: 'Inter, sans-serif' }}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => onDownload(item)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#D4AF37] hover:bg-[#c9a430] text-black font-semibold rounded-lg transition-colors"
                  >
                    <Icon name="ArrowDownTrayIcon" size={16} className="text-black" />
                    <span>Download {downloadFormat.toUpperCase()}</span>
                  </button>
                </div>
                {/* Other actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => onDuplicate(item)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-white/10 text-white text-sm rounded-lg border border-white/10 transition-colors"
                  >
                    <Icon name="DocumentDuplicateIcon" size={15} />
                    <span>Duplicate</span>
                  </button>
                  <button
                    onClick={() => { onDelete(item.id); onClose(); }}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm rounded-lg border border-red-500/20 transition-colors"
                  >
                    <Icon name="TrashIcon" size={15} className="text-red-400" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[#B8B8B8] text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Share this listing with pre-populated captions optimized for each platform.
                </p>
                {/* Platform tabs */}
                <div className="flex gap-2">
                  {(['instagram', 'facebook', 'twitter'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setActiveSocial(s)}
                      className={`flex-1 py-2 text-xs font-medium capitalize rounded-md transition-colors ${activeSocial === s ? 'bg-[#D4AF37] text-black' : 'bg-[#242424] text-[#B8B8B8] hover:text-white border border-white/10'}`}
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {/* Caption */}
                <div className="relative">
                  <textarea
                    readOnly
                    value={caption}
                    rows={8}
                    className="w-full bg-[#242424] border border-white/10 text-white/90 text-xs rounded-lg p-3 resize-none focus:outline-none"
                    style={{ fontFamily: 'Inter, sans-serif', lineHeight: '1.6' }}
                  />
                  <button
                    onClick={handleCopy}
                    className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-[#1A1A1A] border border-white/10 rounded text-xs text-[#B8B8B8] hover:text-white transition-colors"
                  >
                    {copied ? (
                      <><Icon name="CheckIcon" size={12} className="text-green-400" /><span className="text-green-400">Copied!</span></>
                    ) : (
                      <><Icon name="ClipboardDocumentIcon" size={12} /><span>Copy</span></>
                    )}
                  </button>
                </div>
                <div className="bg-[#242424] rounded-lg p-3 border border-white/10">
                  <p className="text-xs text-[#B8B8B8] mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                    💡 <strong className="text-white">Tip:</strong> Copy the caption and paste it directly when posting on {activeSocial.charAt(0).toUpperCase() + activeSocial.slice(1)}.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}