'use client';

import { useState, useCallback, useRef } from 'react';
import Icon from '@/components/ui/AppIcon';

interface UploadZoneProps {
  uploadedImage: string | null;
  uploadedFileName: string;
  onImageUpload: (dataUrl: string, fileName: string) => void;
  onImageRemove: () => void;
}

interface QualityInfo {
  tier: '4K · Ready' | '1080p · Good' | '720p · Low Res' | 'Sub-720p · Poor Quality';
  color: string;
  bgColor: string;
  borderColor: string;
  width: number;
  height: number;
  warnings: string[];
}

function classifyImageQuality(img: HTMLImageElement, fileSizeBytes: number): QualityInfo {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const mp = (w * h) / 1_000_000;
  const warnings: string[] = [];

  let tier: QualityInfo['tier'];
  let color: string;
  let bgColor: string;
  let borderColor: string;

  if (w >= 3840 || h >= 2160 || mp >= 8) {
    tier = '4K · Ready';
    color = '#22c55e';
    bgColor = 'rgba(34,197,94,0.12)';
    borderColor = 'rgba(34,197,94,0.35)';
  } else if (w >= 1920 || h >= 1080 || mp >= 2) {
    tier = '1080p · Good';
    color = '#60a5fa';
    bgColor = 'rgba(96,165,250,0.12)';
    borderColor = 'rgba(96,165,250,0.35)';
  } else if (w >= 1280 || h >= 720 || mp >= 0.9) {
    tier = '720p · Low Res';
    color = '#f59e0b';
    bgColor = 'rgba(245,158,11,0.12)';
    borderColor = 'rgba(245,158,11,0.35)';
  } else {
    tier = 'Sub-720p · Poor Quality';
    color = '#E8002A';
    bgColor = 'rgba(232,0,42,0.12)';
    borderColor = 'rgba(232,0,42,0.35)';
  }

  const bytesPerPixel = fileSizeBytes / (w * h);
  if (bytesPerPixel < 0.5 && fileSizeBytes > 0) {
    warnings.push('Heavily compressed');
  }

  const ratio = w / h;
  if (ratio < 0.5 || ratio > 2.5) {
    warnings.push('Unusual aspect ratio');
  }

  return { tier, color, bgColor, borderColor, width: w, height: h, warnings };
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_MB = 20;

export default function UploadZone({
  uploadedImage,
  uploadedFileName,
  onImageUpload,
  onImageRemove,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [qualityInfo, setQualityInfo] = useState<QualityInfo | null>(null);
  const fileSizeRef = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      setUploadError(null);
      setQualityInfo(null);
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setUploadError('Invalid file type. Please upload JPEG, PNG, or WebP.');
        return;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setUploadError(`File too large. Maximum size is ${MAX_SIZE_MB}MB.`);
        return;
      }
      fileSizeRef.current = file.size;
      setIsLoading(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          // Non-blocking quality check
          const img = new Image();
          img.onload = () => {
            const info = classifyImageQuality(img, fileSizeRef.current);
            setQualityInfo(info);
          };
          img.src = result;
          onImageUpload(result, file.name);
        }
        setIsLoading(false);
      };
      reader.onerror = () => {
        setUploadError('Failed to read file. Please try again.');
        setIsLoading(false);
      };
      reader.readAsDataURL(file);
    },
    [onImageUpload]
  );

  const handleClick = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.click();
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    e.target.value = '';
  };

  const handleRemove = () => {
    setQualityInfo(null);
    onImageRemove();
  };

  return (
    <div className="rounded-lg border border-white/10 bg-[#242424] p-5">
      <h2
        className="text-base font-semibold text-white mb-4 uppercase tracking-widest"
        style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', letterSpacing: '0.12em' }}
      >
        Property Photo
      </h2>

      {!uploadedImage ? (
        <>
          {/* Hidden file input — triggered programmatically via ref */}
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={handleFileChange}
            aria-label="Upload property photo"
            style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0, pointerEvents: 'none', overflow: 'hidden' }}
            tabIndex={-1}
          />

          {/* Clickable drop zone div */}
          <div
            role="button"
            tabIndex={0}
            onClick={handleClick}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            className={`
              flex flex-col items-center justify-center rounded-lg border-2 border-dashed
              cursor-pointer transition-all duration-200 min-h-[220px] md:min-h-[260px]
              ${isDragging
                ? 'border-[#E8002A] bg-[#E8002A]/5'
                : 'border-white/20 hover:border-[#E8002A]/60 hover:bg-white/5'
              }
            `}
          >
            {isLoading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-2 border-[#E8002A] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-[#B8B8B8]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Processing image...
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 px-6 text-center">
                <div className="w-14 h-14 rounded-full bg-[#E8002A]/10 flex items-center justify-center">
                  <Icon name="CloudArrowUpIcon" size={28} variant="outline" className="text-[#E8002A]" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Drag &amp; drop your photo here
                  </p>
                  <p className="text-[#B8B8B8] text-xs mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                    or click to browse files
                  </p>
                </div>
                <p className="text-[#B8B8B8] text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
                  JPEG, PNG, WebP &bull; Max {MAX_SIZE_MB}MB
                </p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="relative rounded-lg overflow-hidden border border-white/10">
          {/* Quality info bar — grey strip directly above the photo */}
          {qualityInfo && (
            <div
              style={{
                background: '#2a2a2a',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                padding: '6px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap',
              }}
            >
              {/* Tier badge */}
              <div
                style={{
                  background: qualityInfo.bgColor,
                  border: `1px solid ${qualityInfo.borderColor}`,
                  borderRadius: '5px',
                  padding: '2px 8px',
                }}
              >
                <span
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: qualityInfo.color,
                    letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {qualityInfo.tier}
                </span>
              </div>
              {/* Pixel dimensions */}
              <span
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '10px',
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.75)',
                  letterSpacing: '0.03em',
                  whiteSpace: 'nowrap',
                }}
              >
                {qualityInfo.width} × {qualityInfo.height}
              </span>
              {/* Warning badges */}
              {qualityInfo.warnings.map((w) => (
                <span
                  key={w}
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '10px',
                    fontWeight: 500,
                    color: '#f59e0b',
                    letterSpacing: '0.03em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  ⚠ {w}
                </span>
              ))}
            </div>
          )}
          <div className="relative w-full" style={{ paddingBottom: '66.67%' }}>
            <img
              src={uploadedImage}
              alt="Uploaded property photo for branding overlay"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
          <div className="flex items-center justify-between px-3 py-2 bg-[#1A1A1A] border-t border-white/10">
            <div className="flex items-center gap-2 min-w-0">
              <Icon name="PhotoIcon" size={16} variant="solid" className="text-[#D4AF37] flex-shrink-0" />
              <span
                className="text-xs text-[#B8B8B8] truncate"
                style={{ fontFamily: 'Inter, sans-serif' }}
                title={uploadedFileName}
              >
                {uploadedFileName}
              </span>
            </div>
            <button
              onClick={handleRemove}
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors ml-3 flex-shrink-0 min-h-[44px] px-2"
              aria-label="Remove uploaded image"
            >
              <Icon name="TrashIcon" size={14} variant="outline" />
              <span style={{ fontFamily: 'Inter, sans-serif' }}>Remove</span>
            </button>
          </div>
        </div>
      )}

      {uploadError && (
        <div className="mt-3 flex items-center gap-2 text-red-400 text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
          <Icon name="ExclamationCircleIcon" size={14} variant="solid" />
          <span>{uploadError}</span>
        </div>
      )}
    </div>
  );
}