'use client';

import React, { useState, useRef, useCallback } from 'react';
import BrandHeader from '@/components/common/BrandHeader';
import TabNavigation from '@/components/common/TabNavigation';
import UploadZone from './UploadZone';
import PropertyForm from './PropertyForm';
import CanvasPreview, { CanvasPreviewHandle } from './CanvasPreview';
import ActionButtons from './ActionButtons';
import DownloadProgressModal, { DownloadProgressState } from './DownloadProgressModal';

export interface PropertyDetails {
  address: string;
  beds: string;
  baths: string;
  sqft: string;
  listingPrice: string;
}

export interface TextFonts {
  listingType: string;
  address: string;
  stats: string;
  price: string;
}

const defaultDetails: PropertyDetails = {
  address: '',
  beds: '',
  baths: '',
  sqft: '',
  listingPrice: '',
};

const defaultFonts: TextFonts = {
  listingType: 'Cormorant Garamond',
  address: 'Libre Baskerville',
  stats: 'Libre Baskerville',
  price: 'Libre Baskerville',
};

export const GOOGLE_FONTS: { name: string; category: string }[] = [
  // Elegant Serifs
  { name: 'Playfair Display', category: 'Serif' },
  { name: 'Cormorant Garamond', category: 'Serif' },
  { name: 'Libre Baskerville', category: 'Serif' },
  { name: 'Merriweather', category: 'Serif' },
  { name: 'EB Garamond', category: 'Serif' },
  { name: 'Lora', category: 'Serif' },
  { name: 'Spectral', category: 'Serif' },
  { name: 'Cardo', category: 'Serif' },
  { name: 'Bodoni Moda', category: 'Serif' },
  { name: 'Cinzel', category: 'Serif' },
  // Modern Sans-Serifs
  { name: 'Raleway', category: 'Sans-Serif' },
  { name: 'Montserrat', category: 'Sans-Serif' },
  { name: 'Inter', category: 'Sans-Serif' },
  { name: 'Poppins', category: 'Sans-Serif' },
  { name: 'Nunito', category: 'Sans-Serif' },
  { name: 'DM Sans', category: 'Sans-Serif' },
  { name: 'Josefin Sans', category: 'Sans-Serif' },
  { name: 'Jost', category: 'Sans-Serif' },
  { name: 'Outfit', category: 'Sans-Serif' },
  { name: 'Syne', category: 'Sans-Serif' },
  { name: 'Kanit', category: 'Sans-Serif' },
  { name: 'Questrial', category: 'Sans-Serif' },
  { name: 'Titillium Web', category: 'Sans-Serif' },
  { name: 'Barlow', category: 'Sans-Serif' },
  // Display / Decorative
  { name: 'Oswald', category: 'Display' },
  { name: 'Bebas Neue', category: 'Display' },
  { name: 'Abril Fatface', category: 'Display' },
  { name: 'Italiana', category: 'Display' },
  { name: 'Tenor Sans', category: 'Display' },
  // Humanist / Mixed
  { name: 'Sawarabi Mincho', category: 'Serif' },
];

const LISTING_TYPE_OPTIONS = [
  'Just Listed',
  'Just Sold',
  'Under Contract',
  'Open House',
  'Price Reduced',
  'Coming Soon',
  'Lease',
];

interface FontPickerProps {
  label: string;
  value: string;
  onChange: (font: string) => void;
}

function FontPicker({ label, value, onChange }: FontPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  const handleBlur = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setOpen(false);
    }
  }, []);

  return (
    <div className="flex flex-col gap-1.5">
      <label
        className="text-[11px] font-medium uppercase tracking-widest text-[#888]"
        style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '0.1em' }}
      >
        {label}
      </label>
      <div className="relative" ref={containerRef} onBlur={handleBlur} tabIndex={-1}>
        {/* Trigger button */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full bg-[#111111] text-white text-sm rounded-md px-3 py-2 border border-white/10 hover:border-white/20 focus:border-[#E8002A] focus:ring-1 focus:ring-[#E8002A]/30 outline-none cursor-pointer transition-colors duration-200 flex items-center justify-between"
          style={{ fontFamily: `"${value}", serif`, minHeight: '40px' }}
        >
          <span>{value}</span>
          <svg
            className={`w-3.5 h-3.5 text-[#B8B8B8] flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Custom dropdown list */}
        {open && (
          <div
            className="absolute z-50 left-0 right-0 mt-1 rounded-md border border-white/10 overflow-y-auto shadow-xl"
            style={{ background: '#1A1A1A', maxHeight: '220px' }}
          >
            {GOOGLE_FONTS.map((font) => (
              <button
                key={font.name}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(font.name);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm transition-colors duration-100 hover:bg-white/10 focus:bg-white/10 outline-none"
                style={{
                  fontFamily: `"${font.name}", serif`,
                  color: font.name === value ? '#E8002A' : '#fff',
                  background: font.name === value ? 'rgba(232,0,42,0.08)' : 'transparent',
                }}
              >
                {font.name}
              </button>
            ))}
          </div>
        )}
      </div>
      {/* Font preview */}
      <span
        className="text-xs text-white/60 truncate"
        style={{ fontFamily: `"${value}", serif` }}
      >
      </span>
    </div>
  );
}

export default function PhotoEditorInteractive() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [propertyDetails, setPropertyDetails] = useState<PropertyDetails>(defaultDetails);
  const [listingType, setListingType] = useState<string>('Just Listed');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [errors, setErrors] = useState<Partial<PropertyDetails>>({});
  const [selectedLogo, setSelectedLogo] = useState<'white-a' | 'red-a' | 'white-full' | 'red-full'>('white-a');
  const [textFonts, setTextFonts] = useState<TextFonts>(defaultFonts);
  const canvasPreviewRef = useRef<CanvasPreviewHandle>(null);

  const [downloadProgress, setDownloadProgress] = useState<DownloadProgressState>({
    visible: false,
    progress: 0,
    stageName: '',
    stageDetail: '',
    error: null,
    retrying: false,
    success: false,
  });
  const downloadAbortRef = useRef(false);

  const handleImageUpload = useCallback((dataUrl: string, fileName: string) => {
    setUploadedImage(dataUrl);
    setUploadedFileName(fileName);
    setPreviewReady(false);
  }, []);

  const handleImageRemove = useCallback(() => {
    setUploadedImage(null);
    setUploadedFileName('');
    setPreviewReady(false);
  }, []);

  const validate = (): boolean => {
    const newErrors: Partial<PropertyDetails> = {};
    if (!propertyDetails.address.trim()) newErrors.address = 'Address is required';
    if (!propertyDetails.beds.trim()) newErrors.beds = 'Required';
    if (!propertyDetails.baths.trim()) newErrors.baths = 'Required';
    if (!propertyDetails.sqft.trim()) newErrors.sqft = 'Required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGeneratePreview = useCallback(async () => {
    if (!uploadedImage) return;
    if (!validate()) return;
    setIsGenerating(true);
    await new Promise((r) => setTimeout(r, 300));
    setPreviewReady(true);
    setIsGenerating(false);
  }, [uploadedImage, propertyDetails]);

  const handleDownload = useCallback(async () => {
    if (!canvasPreviewRef.current?.highResDownload) {
      canvasPreviewRef.current?.screenshotPreview();
      return;
    }

    downloadAbortRef.current = false;
    setDownloadProgress({
      visible: true,
      progress: 0,
      stageName: 'Starting…',
      stageDetail: 'Initialising download pipeline',
      error: null,
      retrying: false,
      success: false,
    });

    const runDownload = async () => {
      try {
        await canvasPreviewRef.current!.highResDownload((pct, stage, detail) => {
          setDownloadProgress((prev) => ({
            ...prev,
            progress: pct,
            stageName: stage,
            stageDetail: detail,
            error: null,
            retrying: false,
            success: pct >= 100,
          }));
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
        setDownloadProgress((prev) => ({
          ...prev,
          error: message,
          retrying: false,
        }));
      }
    };

    await runDownload();
  }, []);

  const handleDownloadRetry = useCallback(async () => {
    setDownloadProgress((prev) => ({
      ...prev,
      error: null,
      retrying: true,
      progress: 0,
      stageName: 'Retrying…',
      stageDetail: '',
    }));
    try {
      await canvasPreviewRef.current!.highResDownload((pct, stage, detail) => {
        setDownloadProgress((prev) => ({
          ...prev,
          progress: pct,
          stageName: stage,
          stageDetail: detail,
          error: null,
          retrying: false,
          success: pct >= 100,
        }));
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Download failed. Please try again.';
      setDownloadProgress((prev) => ({
        ...prev,
        error: message,
        retrying: false,
      }));
    }
  }, []);

  const handleDownloadClose = useCallback(() => {
    setDownloadProgress((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleFontChange = useCallback((key: keyof TextFonts, font: string) => {
    setTextFonts((prev) => ({ ...prev, [key]: font }));
  }, []);

  return (
    <div className="min-h-screen bg-[#0F0F0F]">
      <BrandHeader />
      <TabNavigation />

      <DownloadProgressModal
        state={downloadProgress}
        onRetry={handleDownloadRetry}
        onClose={handleDownloadClose}
      />

      {/* Content area offset for fixed header (64px) + tab nav (56px) = 120px */}
      <div className="pt-[120px] px-4 md:px-8 lg:px-10 pb-10">
        <div className="max-w-[1400px] mx-auto">

          {/* Split Panel Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xl:gap-8">
            {/* Left Panel */}
            <div className="flex flex-col gap-5">
              <UploadZone
                uploadedImage={uploadedImage}
                uploadedFileName={uploadedFileName}
                onImageUpload={handleImageUpload}
                onImageRemove={handleImageRemove}
              />

              {/* Listing Type Dropdown */}
              <div className="rounded-lg border border-white/10 bg-[#242424] p-5">
                <h2
                  className="text-white mb-4 uppercase tracking-widest"
                  style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', letterSpacing: '0.12em', fontWeight: 600 }}
                >
                  Listing Type
                </h2>
                <div className="relative">
                  <select
                    id="listing-type-select"
                    value={listingType}
                    onChange={(e) => {
                      setListingType(e.target.value);
                      setPreviewReady(false);
                    }}
                    className="w-full bg-[#111111] text-white text-sm rounded-md px-3 py-2.5 border border-white/10 hover:border-white/20 focus:border-[#E8002A] focus:ring-1 focus:ring-[#E8002A]/30 outline-none appearance-none cursor-pointer transition-colors duration-200"
                    style={{ fontFamily: 'Inter, sans-serif', minHeight: '44px' }}
                  >
                    {LISTING_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option} style={{ background: '#1A1A1A', color: '#fff' }}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {/* Custom chevron */}
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                    <svg className="w-4 h-4 text-[#B8B8B8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <PropertyForm
                details={propertyDetails}
                errors={errors}
                listingType={listingType}
                onListingTypeChange={(type) => {
                  setListingType(type);
                  setPreviewReady(false);
                }}
                onChange={(updated) => {
                  setPropertyDetails(updated);
                  setPreviewReady(false);
                }}
              />

              {/* Font Selection Panel */}
              {(listingType || propertyDetails.address.trim() || propertyDetails.beds.trim() || propertyDetails.baths.trim() || propertyDetails.sqft.trim() || propertyDetails.listingPrice.trim()) && (
              <div className="rounded-lg border border-white/10 bg-[#242424] p-5">
                <h2
                  className="text-white mb-4 uppercase tracking-widest"
                  style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', letterSpacing: '0.12em', fontWeight: 600 }}
                >
                  Text Fonts
                </h2>
                <div className="flex flex-col gap-4">
                  {listingType && (
                    <FontPicker
                      label="Listing Type"
                      value={textFonts.listingType}
                      onChange={(font) => { handleFontChange('listingType', font); setPreviewReady(false); }}
                    />
                  )}
                  {propertyDetails.address.trim() && (
                    <FontPicker
                      label="Address"
                      value={textFonts.address}
                      onChange={(font) => { handleFontChange('address', font); setPreviewReady(false); }}
                    />
                  )}
                  {(propertyDetails.beds.trim() || propertyDetails.baths.trim() || propertyDetails.sqft.trim()) && (
                    <FontPicker
                      label="Stats (Beds / Baths / Sq. Ft.)"
                      value={textFonts.stats}
                      onChange={(font) => { handleFontChange('stats', font); setPreviewReady(false); }}
                    />
                  )}
                  {propertyDetails.listingPrice.trim() && (
                    <FontPicker
                      label="Price"
                      value={textFonts.price}
                      onChange={(font) => { handleFontChange('price', font); setPreviewReady(false); }}
                    />
                  )}
                </div>
              </div>
              )}

              {/* Logo Selector */}
              <div className="rounded-lg border border-white/10 bg-[#242424] p-5">
                <h2
                  className="text-white mb-4 uppercase tracking-widest"
                  style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', letterSpacing: '0.12em', fontWeight: 600 }}
                >
                  Logo
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {/* White A-only option */}
                  <button
                    type="button"
                    onClick={() => { setSelectedLogo('white-a'); setPreviewReady(false); }}
                    className="flex flex-col items-center gap-2 rounded-lg p-3 border-2 transition-all duration-200"
                    style={{
                      borderColor: selectedLogo === 'white-a' ? '#E8002A' : 'rgba(255,255,255,0.1)',
                      background: selectedLogo === 'white-a' ? 'rgba(232,0,42,0.08)' : 'transparent',
                    }}
                    aria-pressed={selectedLogo === 'white-a'}
                    aria-label="Select white A logo"
                  >
                    <div
                      className="rounded-md flex items-center justify-center"
                      style={{ width: '64px', height: '48px', background: 'rgba(255,255,255,0.05)' }}
                    >
                      <div style={{ width: '32px', height: '32px', backgroundColor: '#FFFFFF', borderRadius: '3px', flexShrink: 0 }} />
                    </div>
                    <span className="text-xs font-medium" style={{ fontFamily: 'Inter, sans-serif', color: selectedLogo === 'white-a' ? '#E8002A' : '#B8B8B8' }}>
                      White A
                    </span>
                    {selectedLogo === 'white-a' && (
                      <span className="text-[10px] text-[#E8002A]" style={{ fontFamily: 'Inter, sans-serif' }}>✓ Selected</span>
                    )}
                  </button>

                  {/* Red A-only option */}
                  <button
                    type="button"
                    onClick={() => { setSelectedLogo('red-a'); setPreviewReady(false); }}
                    className="flex flex-col items-center gap-2 rounded-lg p-3 border-2 transition-all duration-200"
                    style={{
                      borderColor: selectedLogo === 'red-a' ? '#E8002A' : 'rgba(255,255,255,0.1)',
                      background: selectedLogo === 'red-a' ? 'rgba(232,0,42,0.08)' : 'transparent',
                    }}
                    aria-pressed={selectedLogo === 'red-a'}
                    aria-label="Select red A logo"
                  >
                    <div
                      className="rounded-md flex items-center justify-center"
                      style={{ width: '64px', height: '48px', background: 'rgba(255,255,255,0.05)' }}
                    >
                      <div style={{ width: '32px', height: '32px', backgroundColor: '#E8002A', borderRadius: '3px', flexShrink: 0 }} />
                    </div>
                    <span className="text-xs font-medium" style={{ fontFamily: 'Inter, sans-serif', color: selectedLogo === 'red-a' ? '#E8002A' : '#B8B8B8' }}>
                      Red A
                    </span>
                    {selectedLogo === 'red-a' && (
                      <span className="text-[10px] text-[#E8002A]" style={{ fontFamily: 'Inter, sans-serif' }}>✓ Selected</span>
                    )}
                  </button>

                  {/* White full wordmark option */}
                  <button
                    type="button"
                    onClick={() => { setSelectedLogo('white-full'); setPreviewReady(false); }}
                    className="flex flex-col items-center gap-2 rounded-lg p-3 border-2 transition-all duration-200"
                    style={{
                      borderColor: selectedLogo === 'white-full' ? '#E8002A' : 'rgba(255,255,255,0.1)',
                      background: selectedLogo === 'white-full' ? 'rgba(232,0,42,0.08)' : 'transparent',
                    }}
                    aria-pressed={selectedLogo === 'white-full'}
                    aria-label="Select white full Agency wordmark logo"
                  >
                    <div
                      className="rounded-md flex items-center justify-center"
                      style={{ width: '64px', height: '48px', background: 'rgba(255,255,255,0.05)' }}
                    >
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <div style={{ width: '18px', height: '22px', backgroundColor: '#FFFFFF', borderRadius: '2px', flexShrink: 0 }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ width: '28px', height: '4px', backgroundColor: '#FFFFFF', borderRadius: '1px' }} />
                          <div style={{ width: '22px', height: '4px', backgroundColor: '#FFFFFF', borderRadius: '1px' }} />
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-medium" style={{ fontFamily: 'Inter, sans-serif', color: selectedLogo === 'white-full' ? '#E8002A' : '#B8B8B8' }}>
                      White Full
                    </span>
                    {selectedLogo === 'white-full' && (
                      <span className="text-[10px] text-[#E8002A]" style={{ fontFamily: 'Inter, sans-serif' }}>✓ Selected</span>
                    )}
                  </button>

                  {/* Red full wordmark option */}
                  <button
                    type="button"
                    onClick={() => { setSelectedLogo('red-full'); setPreviewReady(false); }}
                    className="flex flex-col items-center gap-2 rounded-lg p-3 border-2 transition-all duration-200"
                    style={{
                      borderColor: selectedLogo === 'red-full' ? '#E8002A' : 'rgba(255,255,255,0.1)',
                      background: selectedLogo === 'red-full' ? 'rgba(232,0,42,0.08)' : 'transparent',
                    }}
                    aria-pressed={selectedLogo === 'red-full'}
                    aria-label="Select red full Agency wordmark logo"
                  >
                    <div
                      className="rounded-md flex items-center justify-center"
                      style={{ width: '64px', height: '48px', background: 'rgba(255,255,255,0.05)' }}
                    >
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <div style={{ width: '18px', height: '22px', backgroundColor: '#E8002A', borderRadius: '2px', flexShrink: 0 }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ width: '28px', height: '4px', backgroundColor: '#E8002A', borderRadius: '1px' }} />
                          <div style={{ width: '22px', height: '4px', backgroundColor: '#E8002A', borderRadius: '1px' }} />
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-medium" style={{ fontFamily: 'Inter, sans-serif', color: selectedLogo === 'red-full' ? '#E8002A' : '#B8B8B8' }}>
                      Red Full
                    </span>
                    {selectedLogo === 'red-full' && (
                      <span className="text-[10px] text-[#E8002A]" style={{ fontFamily: 'Inter, sans-serif' }}>✓ Selected</span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Panel */}
            <div className="flex flex-col gap-5">
              <CanvasPreview
                ref={canvasPreviewRef}
                uploadedImage={uploadedImage}
                propertyDetails={propertyDetails}
                listingType={listingType}
                previewReady={previewReady}
                isGenerating={isGenerating}
                selectedLogo={selectedLogo}
                textFonts={textFonts}
              />
              <ActionButtons
                hasImage={!!uploadedImage}
                previewReady={previewReady}
                isGenerating={isGenerating}
                onGenerate={handleGeneratePreview}
                onDownload={handleDownload}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}