'use client';

import React, { useState, useRef, useCallback } from 'react';
import BrandHeader from '@/components/common/BrandHeader';
import TabNavigation from '@/components/common/TabNavigation';
import UploadZoneTest from './UploadZoneTest';
import PropertyFormTest from './PropertyFormTest';
import CanvasPreviewTest, { CanvasPreviewTestHandle } from './CanvasPreviewTest';
import ActionButtonsTest from './ActionButtonsTest';
import DownloadProgressModal, { DownloadProgressState } from '../../photo-upload-and-editor/components/DownloadProgressModal';

export interface PropertyDetailsTest {
  address: string;
  beds: string;
  baths: string;
  sqft: string;
  listingPrice: string;
}

const defaultDetails: PropertyDetailsTest = {
  address: '',
  beds: '',
  baths: '',
  sqft: '',
  listingPrice: '',
};

const LISTING_TYPE_OPTIONS_TEST = [
  'Listed',
  'New',
  'Sold',
];

export default function PhotoEditorInteractiveTest() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [propertyDetails, setPropertyDetails] = useState<PropertyDetailsTest>(defaultDetails);
  const [listingType, setListingType] = useState<string>('Listed');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [errors, setErrors] = useState<Partial<PropertyDetailsTest>>({});
  const [selectedLogo, setSelectedLogo] = useState<'white-a' | 'red-a' | 'white-full' | 'red-full'>('white-a');
  const canvasPreviewRef = useRef<CanvasPreviewTestHandle>(null);

  const [downloadProgress, setDownloadProgress] = useState<DownloadProgressState>({
    visible: false,
    progress: 0,
    stageName: '',
    stageDetail: '',
    error: null,
    retrying: false,
    success: false,
  });

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
    const newErrors: Partial<PropertyDetailsTest> = {};
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
      canvasPreviewRef.current?.download();
      return;
    }

    // Capture container dimensions synchronously BEFORE the modal opens
    // so the loading screen cannot affect any DOM measurements
    const { width: containerWidth, height: containerHeight } =
      canvasPreviewRef.current.getContainerRect?.() ?? { width: 0, height: 0 };

    setDownloadProgress({
      visible: true,
      progress: 0,
      stageName: 'Starting…',
      stageDetail: 'Initialising download pipeline',
      error: null,
      retrying: false,
      success: false,
    });

    try {
      await canvasPreviewRef.current.highResDownload((pct, stage, detail) => {
        setDownloadProgress((prev) => ({
          ...prev,
          progress: pct,
          stageName: stage,
          stageDetail: detail,
          error: null,
          retrying: false,
          success: pct >= 100,
        }));
      }, containerWidth, containerHeight);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setDownloadProgress((prev) => ({
        ...prev,
        error: message,
        retrying: false,
      }));
    }
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

    // Re-capture dimensions on retry (modal is already open, but dimensions were captured before)
    // Pass 0,0 — highResDownload will use the fallback ratio (CW * NH / NW)
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
      }, 0, 0);
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

  const handleScreenshot = useCallback(() => {
    canvasPreviewRef.current?.screenshotPreview();
  }, []);

  const handleScreenshotWithProgress = useCallback(async () => {
    if (!canvasPreviewRef.current) return;

    // Show modal immediately
    setDownloadProgress({
      visible: true,
      progress: 0,
      stageName: 'Starting…',
      stageDetail: 'Initialising download pipeline',
      error: null,
      retrying: false,
      success: false,
    });

    // Cosmetic stages — purely visual, no effect on the actual screenshot
    const stages: { pct: number; name: string; detail: string; delay: number }[] = [
      { pct: 10, name: 'Verifying fonts',  detail: 'Checking typeface availability',   delay: 220 },
      { pct: 28, name: 'Building canvas',  detail: 'Compositing layers',               delay: 320 },
      { pct: 52, name: 'Mapping elements', detail: 'Positioning overlay elements',     delay: 300 },
      { pct: 74, name: 'Quality check',    detail: 'Validating render output',         delay: 280 },
      { pct: 90, name: 'Encoding PNG',     detail: 'Saving full-resolution image',     delay: 250 },
    ];

    for (const stage of stages) {
      await new Promise<void>((r) => setTimeout(r, stage.delay));
      setDownloadProgress((prev) => ({
        ...prev,
        progress: stage.pct,
        stageName: stage.name,
        stageDetail: stage.detail,
      }));
    }

    // Fire the actual screenshot at the 90% mark
    canvasPreviewRef.current.screenshotPreview();

    // Brief pause then complete
    await new Promise<void>((r) => setTimeout(r, 200));
    setDownloadProgress((prev) => ({
      ...prev,
      progress: 100,
      stageName: 'Done',
      stageDetail: '',
      success: true,
    }));
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

      <div className="pt-[120px] px-4 md:px-8 lg:px-10 pb-10">
        <div className="max-w-[1400px] mx-auto">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xl:gap-8">
            {/* Left Panel */}
            <div className="flex flex-col gap-5">
              <UploadZoneTest
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
                    id="test-listing-type-select"
                    value={listingType}
                    onChange={(e) => {
                      setListingType(e.target.value);
                      setPreviewReady(false);
                    }}
                    className="w-full bg-[#111111] text-white text-sm rounded-md px-3 py-2.5 border border-white/10 hover:border-white/20 focus:border-[#E8002A] focus:ring-1 focus:ring-[#E8002A]/30 outline-none appearance-none cursor-pointer transition-colors duration-200"
                    style={{ fontFamily: 'Inter, sans-serif', minHeight: '44px' }}
                  >
                    {LISTING_TYPE_OPTIONS_TEST.map((option) => (
                      <option key={option} value={option} style={{ background: '#1A1A1A', color: '#fff' }}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                    <svg className="w-4 h-4 text-[#B8B8B8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <PropertyFormTest
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

              {/* Logo Selector */}
              <div className="rounded-lg border border-white/10 bg-[#242424] p-5">
                <h2
                  className="text-white mb-4 uppercase tracking-widest"
                  style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', letterSpacing: '0.12em', fontWeight: 600 }}
                >
                  Logo
                </h2>
                <div className="grid grid-cols-2 gap-3">
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
                    <div className="rounded-md flex items-center justify-center" style={{ width: '64px', height: '48px', background: 'rgba(255,255,255,0.05)' }}>
                      <div style={{ width: '32px', height: '32px', backgroundColor: '#FFFFFF', borderRadius: '3px', flexShrink: 0 }} />
                    </div>
                    <span className="text-xs font-medium" style={{ fontFamily: 'Inter, sans-serif', color: selectedLogo === 'white-a' ? '#E8002A' : '#B8B8B8' }}>White A</span>
                    {selectedLogo === 'white-a' && <span className="text-[10px] text-[#E8002A]" style={{ fontFamily: 'Inter, sans-serif' }}>✓ Selected</span>}
                  </button>

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
                    <div className="rounded-md flex items-center justify-center" style={{ width: '64px', height: '48px', background: 'rgba(255,255,255,0.05)' }}>
                      <div style={{ width: '32px', height: '32px', backgroundColor: '#E8002A', borderRadius: '3px', flexShrink: 0 }} />
                    </div>
                    <span className="text-xs font-medium" style={{ fontFamily: 'Inter, sans-serif', color: selectedLogo === 'red-a' ? '#E8002A' : '#B8B8B8' }}>Red A</span>
                    {selectedLogo === 'red-a' && <span className="text-[10px] text-[#E8002A]" style={{ fontFamily: 'Inter, sans-serif' }}>✓ Selected</span>}
                  </button>

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
                    <div className="rounded-md flex items-center justify-center" style={{ width: '64px', height: '48px', background: 'rgba(255,255,255,0.05)' }}>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <div style={{ width: '18px', height: '22px', backgroundColor: '#FFFFFF', borderRadius: '2px', flexShrink: 0 }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ width: '28px', height: '4px', backgroundColor: '#FFFFFF', borderRadius: '1px' }} />
                          <div style={{ width: '22px', height: '4px', backgroundColor: '#FFFFFF', borderRadius: '1px' }} />
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-medium" style={{ fontFamily: 'Inter, sans-serif', color: selectedLogo === 'white-full' ? '#E8002A' : '#B8B8B8' }}>White Full</span>
                    {selectedLogo === 'white-full' && <span className="text-[10px] text-[#E8002A]" style={{ fontFamily: 'Inter, sans-serif' }}>✓ Selected</span>}
                  </button>

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
                    <div className="rounded-md flex items-center justify-center" style={{ width: '64px', height: '48px', background: 'rgba(255,255,255,0.05)' }}>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <div style={{ width: '18px', height: '22px', backgroundColor: '#E8002A', borderRadius: '2px', flexShrink: 0 }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ width: '28px', height: '4px', backgroundColor: '#E8002A', borderRadius: '1px' }} />
                          <div style={{ width: '22px', height: '4px', backgroundColor: '#E8002A', borderRadius: '1px' }} />
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-medium" style={{ fontFamily: 'Inter, sans-serif', color: selectedLogo === 'red-full' ? '#E8002A' : '#B8B8B8' }}>Red Full</span>
                    {selectedLogo === 'red-full' && <span className="text-[10px] text-[#E8002A]" style={{ fontFamily: 'Inter, sans-serif' }}>✓ Selected</span>}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Panel */}
            <div className="flex flex-col gap-5">
              <CanvasPreviewTest
                ref={canvasPreviewRef}
                uploadedImage={uploadedImage}
                propertyDetails={propertyDetails}
                listingType={listingType}
                previewReady={previewReady}
                isGenerating={isGenerating}
                selectedLogo={selectedLogo}
              />
              <ActionButtonsTest
                hasImage={!!uploadedImage}
                previewReady={previewReady}
                isGenerating={isGenerating}
                onGenerate={handleGeneratePreview}
                onScreenshot={handleScreenshotWithProgress}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
