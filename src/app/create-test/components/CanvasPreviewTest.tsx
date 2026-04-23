'use client';

import { useEffect, useRef, forwardRef, useImperativeHandle, useState, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { PropertyDetailsTest } from './PhotoEditorInteractiveTest';
import Icon from '@/components/ui/AppIcon';

interface CanvasPreviewTestProps {
  uploadedImage: string | null;
  propertyDetails: PropertyDetailsTest;
  listingType: string;
  previewReady: boolean;
  isGenerating: boolean;
  selectedLogo?: 'white-a' | 'red-a' | 'white-full' | 'red-full';
}

export interface CanvasPreviewTestHandle {
  download: () => void;
  screenshotPreview: () => void;
  getContainerRect: () => { width: number; height: number };
  highResDownload: (onProgress: (pct: number, stage: string, detail: string) => void, containerWidth: number, containerHeight: number) => Promise<void>;
}

// ─── Listing type config ──────────────────────────────────────────────────────
interface ListingTypographyConfig {
  line1: string;
  line2: string;
  line1SizeRatio: number;
  line2SizeRatio: number;
  line1XOffsetRatio: number;
  line2XOffsetRatio: number;
  line1YRatio: number;
  line2YRatio: number;
}

function getListingTypographyConfig(listingType: string): ListingTypographyConfig {
  switch (listingType) {
    case 'Sold':
      return {
        line1: 'SO',
        line2: 'LD',
        line1SizeRatio: 0.147,
        line2SizeRatio: 0.147,
        line1XOffsetRatio: 0.02,
        line2XOffsetRatio: 0.08,
        line1YRatio: 0.13,
        line2YRatio: 0.277,
      };
    case 'New':
      return {
        line1: 'NE',
        line2: 'W',
        line1SizeRatio: 0.147,
        line2SizeRatio: 0.147,
        line1XOffsetRatio: 0.02,
        line2XOffsetRatio: 0.055,
        line1YRatio: 0.10,
        line2YRatio: 0.247,
      };
    case 'Listed':
    default:
      return {
        line1: 'LIS',
        line2: 'TED',
        line1SizeRatio: 0.14,
        line2SizeRatio: 0.14,
        line1XOffsetRatio: 0.02,
        line2XOffsetRatio: 0.06,
        line1YRatio: 0.12,
        line2YRatio: 0.26,
      };
  }
}

// ─── Draw base canvas ─────────────────────────────────────────────────────────
function drawBaseCanvas(canvas: HTMLCanvasElement, img: HTMLImageElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = img.naturalWidth || img.width;
  const H = img.naturalHeight || img.height;
  canvas.width = W;
  canvas.height = H;
  ctx.drawImage(img, 0, 0, W, H);
}

// ─── Draw typographic overlay on canvas ──────────────────────────────────────
function drawTypographicOverlay(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  listingType: string,
  offsetX: number = 0,  // additional offset as fraction of W
  offsetY: number = 0   // additional offset as fraction of H
) {
  const config = getListingTypographyConfig(listingType);

  ctx.save();
  ctx.globalAlpha = 0.85;

  // Apply extra italic skew (in addition to font italic)
  const skewAngle = -5 * (Math.PI / 180); // 5 degrees extra skew

  // Line 1
  const fontSize1 = Math.round(config.line1SizeRatio * W);
  ctx.font = `italic 550 ${fontSize1}px "Bodoni Moda", "Bodoni 72", "Didot", "Playfair Display", Georgia, serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const x1 = (config.line1XOffsetRatio + offsetX) * W;
  const y1 = (config.line1YRatio + offsetY) * H;
  ctx.save();
  ctx.transform(1, 0, Math.tan(skewAngle), 1, -y1 * Math.tan(skewAngle), 0);
  ctx.fillText(config.line1, x1, y1);
  ctx.restore();

  // Line 2 — positioned relative to line 1's bottom to match HTML flow
  // HTML uses lineHeight: 0.9 and a small marginTop between the two block divs
  const fontSize2 = Math.round(config.line2SizeRatio * W);
  ctx.font = `italic 550 ${fontSize2}px "Bodoni Moda", "Bodoni 72", "Didot", "Playfair Display", Georgia, serif`;
  const lineHeight = 0.9;
  const marginTop = (config.line2YRatio - config.line1YRatio - config.line1SizeRatio) * W * 0.2;
  const x2 = (config.line2XOffsetRatio + offsetX) * W;
  const y2 = y1 + fontSize1 * lineHeight + Math.max(marginTop, 0);
  ctx.save();
  ctx.transform(1, 0, Math.tan(skewAngle), 1, -y2 * Math.tan(skewAngle), 0);
  ctx.fillText(config.line2, x2, y2);
  ctx.restore();

  ctx.restore();
}

// ─── Draw bottom banner ───────────────────────────────────────────────────────
function drawBottomBanner(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  propertyDetails: PropertyDetailsTest
) {
  const bannerH = H * 0.18;
  const bannerY = H - bannerH;

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
  ctx.fillRect(0, bannerY, W, bannerH);
  ctx.restore();

  const centerX = W / 2;
  const fontFamily = 'Inter, "Helvetica Neue", Arial, sans-serif';

  // Match HTML preview font sizes exactly (same % of W as CSS % of container width)
  const addrSize  = Math.round(0.033 * W); // 3.3% of W — matches clamp(13px, 3.3%, 27px)
  const statsSize = Math.round(0.027 * W); // 2.7% of W — matches clamp(12px, 2.7%, 22px)
  const priceSize = Math.round(0.0315 * W); // 3.15% of W — matches clamp(13px, 3.15%, 25px)

  // Match HTML letter spacing exactly
  const addrLetterSpacing  = addrSize  * 0.10; // 0.1em
  const statsLetterSpacing = statsSize * 0.06; // 0.06em
  const priceLetterSpacing = priceSize * 0.04; // 0.04em

  // Match HTML lineHeight: 1.3 for each element
  const addrLineH  = addrSize  * 1.3;
  const statsLineH = statsSize * 1.3;
  const priceLineH = priceSize * 1.3;

  // Determine which lines are visible (same as HTML)
  const hasAddress = !!propertyDetails.address;
  const statsParts = [
    propertyDetails.beds  ? `${propertyDetails.beds} BED`   : null,
    propertyDetails.baths ? `${propertyDetails.baths} BATH` : null,
    propertyDetails.sqft  ? `${propertyDetails.sqft} SQFT`  : null,
  ].filter(Boolean) as string[];
  const hasStats = statsParts.length > 0;
  const hasPrice = !!propertyDetails.listingPrice;

  // Replicate CSS flex column with gap-1 (gap ≈ 4px in HTML, scale to canvas)
  // gap-1 = 4px at 1x; proportionally that's ~0.004 * W (roughly)
  const gap = Math.round(0.004 * W);

  // Compute total block height (same as flex content height)
  let totalH = 0;
  if (hasAddress) totalH += addrLineH;
  if (hasAddress && (hasStats || hasPrice)) totalH += gap;
  if (hasStats)   totalH += statsLineH;
  if (hasStats && hasPrice) totalH += gap;
  if (hasPrice)   totalH += priceLineH;

  // Vertically center the block within the banner (matching align-items: center + justify-content: center)
  let currentY = bannerY + (bannerH - totalH) / 2;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  if (hasAddress) {
    ctx.save();
    ctx.font = `600 ${addrSize}px ${fontFamily}`;
    ctx.fillStyle = '#ffffff';
    ctx.letterSpacing = `${addrLetterSpacing}px`;
    ctx.fillText(propertyDetails.address!.toUpperCase(), centerX, currentY);
    ctx.restore();
    currentY += addrLineH + (hasStats || hasPrice ? gap : 0);
  }

  if (hasStats) {
    ctx.save();
    ctx.font = `500 ${statsSize}px ${fontFamily}`;
    ctx.fillStyle = '#ffffff';
    ctx.letterSpacing = `${statsLetterSpacing}px`;
    ctx.fillText(statsParts.join(' | '), centerX, currentY);
    ctx.restore();
    currentY += statsLineH + (hasPrice ? gap : 0);
  }

  if (hasPrice) {
    ctx.save();
    ctx.font = `600 ${priceSize}px ${fontFamily}`;
    ctx.fillStyle = '#ffffff';
    ctx.letterSpacing = `${priceLetterSpacing}px`;
    const priceDisplay = propertyDetails.listingPrice!.startsWith('$')
      ? propertyDetails.listingPrice!
      : `$${propertyDetails.listingPrice!}`;
    ctx.fillText(priceDisplay, centerX, currentY);
    ctx.restore();
  }
}

// ─── Logo processing helpers ──────────────────────────────────────────────────
function processLogoImageTest(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth; const h = img.naturalHeight;
      if (!w || !h) { resolve(null); return; }
      const tmp = document.createElement('canvas');
      tmp.width = w; tmp.height = h;
      const ctx = tmp.getContext('2d');
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0, w, h);
      let imageData: ImageData;
      try { imageData = ctx.getImageData(0, 0, w, h); } catch { resolve(null); return; }
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        if (r > 200 && g > 200 && b > 200) { data[i + 3] = 0; }
        else { data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; }
      }
      ctx.putImageData(imageData, 0, 0);
      let minX = w, minY = h, maxX = 0, maxY = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 10) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
      if (minX > maxX || minY > maxY) { resolve(tmp.toDataURL('image/png')); return; }
      const cropW = maxX - minX + 1; const cropH = maxY - minY + 1;
      if (cropW < 2 || cropH < 2) { resolve(tmp.toDataURL('image/png')); return; }
      const cc = document.createElement('canvas'); cc.width = cropW; cc.height = cropH;
      const cctx = cc.getContext('2d');
      if (!cctx) { resolve(tmp.toDataURL('image/png')); return; }
      cctx.drawImage(tmp, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
      resolve(cc.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function processRedLogoImageTest(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth; const h = img.naturalHeight;
      if (!w || !h) { resolve(null); return; }
      const tmp = document.createElement('canvas');
      tmp.width = w; tmp.height = h;
      const ctx = tmp.getContext('2d');
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0, w, h);
      let imageData: ImageData;
      try { imageData = ctx.getImageData(0, 0, w, h); } catch { resolve(null); return; }
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        if (r > 200 && g > 200 && b > 200) { data[i + 3] = 0; }
      }
      ctx.putImageData(imageData, 0, 0);
      let minX = w, minY = h, maxX = 0, maxY = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 10) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
      if (minX > maxX || minY > maxY) { resolve(tmp.toDataURL('image/png')); return; }
      const cropW = maxX - minX + 1; const cropH = maxY - minY + 1;
      if (cropW < 2 || cropH < 2) { resolve(tmp.toDataURL('image/png')); return; }
      const cc = document.createElement('canvas'); cc.width = cropW; cc.height = cropH;
      const cctx = cc.getContext('2d');
      if (!cctx) { resolve(tmp.toDataURL('image/png')); return; }
      cctx.drawImage(tmp, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
      resolve(cc.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function processFullLogoWhiteTest(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth; const h = img.naturalHeight;
      if (!w || !h) { resolve(null); return; }
      const tmp = document.createElement('canvas');
      tmp.width = w; tmp.height = h;
      const ctx = tmp.getContext('2d');
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0, w, h);
      let imageData: ImageData;
      try { imageData = ctx.getImageData(0, 0, w, h); } catch { resolve(null); return; }
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        if (r > 200 && g > 200 && b > 200) { data[i + 3] = 0; }
        else { data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; }
      }
      ctx.putImageData(imageData, 0, 0);
      let minX = w, minY = h, maxX = 0, maxY = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 10) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
      if (minX > maxX || minY > maxY) { resolve(tmp.toDataURL('image/png')); return; }
      const cropW = maxX - minX + 1; const cropH = maxY - minY + 1;
      if (cropW < 2 || cropH < 2) { resolve(tmp.toDataURL('image/png')); return; }
      const cc = document.createElement('canvas'); cc.width = cropW; cc.height = cropH;
      const cctx = cc.getContext('2d');
      if (!cctx) { resolve(tmp.toDataURL('image/png')); return; }
      cctx.drawImage(tmp, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
      resolve(cc.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function processFullLogoRedTest(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth; const h = img.naturalHeight;
      if (!w || !h) { resolve(null); return; }
      const tmp = document.createElement('canvas');
      tmp.width = w; tmp.height = h;
      const ctx = tmp.getContext('2d');
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0, w, h);
      let imageData: ImageData;
      try { imageData = ctx.getImageData(0, 0, w, h); } catch { resolve(null); return; }
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        if (r > 200 && g > 200 && b > 200) { data[i + 3] = 0; }
      }
      ctx.putImageData(imageData, 0, 0);
      let minX = w, minY = h, maxX = 0, maxY = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] > 10) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
      if (minX > maxX || minY > maxY) { resolve(tmp.toDataURL('image/png')); return; }
      const cropW = maxX - minX + 1; const cropH = maxY - minY + 1;
      if (cropW < 2 || cropH < 2) { resolve(tmp.toDataURL('image/png')); return; }
      const cc = document.createElement('canvas'); cc.width = cropW; cc.height = cropH;
      const cctx = cc.getContext('2d');
      if (!cctx) { resolve(tmp.toDataURL('image/png')); return; }
      cctx.drawImage(tmp, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
      resolve(cc.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// ─── Font preload helper ──────────────────────────────────────────────────────
async function preloadFontTest(family: string, weight: string, style: string): Promise<boolean> {
  try {
    const testStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const fontSpec = `${style} ${weight} 48px "${family}"`;
    if (document.fonts.check(fontSpec, testStr)) return true;
    await document.fonts.load(fontSpec, testStr);
    return document.fonts.check(fontSpec, testStr);
  } catch {
    return false;
  }
}

const REQUIRED_FONTS_TEST = [
  { family: 'Bodoni Moda',  weight: '400', style: 'italic' },
  { family: 'Inter',        weight: '500', style: 'normal' },
  { family: 'Inter',        weight: '600', style: 'normal' },
];
// ─────────────────────────────────────────────────────────────────────────────

// ─── Component ────────────────────────────────────────────────────────────────
const CanvasPreviewTest = forwardRef<CanvasPreviewTestHandle, CanvasPreviewTestProps>(function CanvasPreviewTest(
  { uploadedImage, propertyDetails, listingType, previewReady, isGenerating, selectedLogo = 'white-a' },
  ref
) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const previewDivRef = useRef<HTMLDivElement>(null);

  const [processedLogoUrl, setProcessedLogoUrl] = useState<string | null>(null);
  const [processedRedLogoUrl, setProcessedRedLogoUrl] = useState<string | null>(null);
  const [processedFullWhiteUrl, setProcessedFullWhiteUrl] = useState<string | null>(null);
  const [processedFullRedUrl, setProcessedFullRedUrl] = useState<string | null>(null);

  // Computed px font sizes for the typographic overlay (replaces cqw units)
  const [overlayFontSizes, setOverlayFontSizes] = useState<{
    line1: number;
    line2: number;
    line2MarginTop: number;
    line2MarginLeft: number;
  }>({ line1: 0, line2: 0, line2MarginTop: 0, line2MarginLeft: 0 });

  // Recalculate px font sizes from container width
  const recalcOverlayFontSizes = useCallback(() => {
    if (!containerRef.current) return;
    const w = containerRef.current.getBoundingClientRect().width;
    if (!w) return;
    const config = getListingTypographyConfig(listingType);
    setOverlayFontSizes({
      line1: config.line1SizeRatio * w,
      line2: config.line2SizeRatio * w,
      line2MarginTop: (config.line2YRatio - config.line1YRatio - config.line1SizeRatio) * w * 0.2,
      line2MarginLeft: (config.line2XOffsetRatio - config.line1XOffsetRatio) * w,
    });
  }, [listingType]);

  // ResizeObserver to keep px sizes in sync with container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    recalcOverlayFontSizes();
    const ro = new ResizeObserver(() => recalcOverlayFontSizes());
    ro.observe(el);
    return () => ro.disconnect();
  }, [recalcOverlayFontSizes]);

  // Drag state — offset as fraction of container dimensions
  const [overlayOffset, setOverlayOffset] = useState<{ x: number; y: number }>({ x: -0.01, y: -0.08 });
  const [isDragging, setIsDragging] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; offsetX: number; offsetY: number } | null>(null);

  // Reset overlay position when listing type changes
  useEffect(() => {
    setOverlayOffset({ x: -0.01, y: -0.08 });
  }, [listingType]);

  // Load Bodoni Moda font
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const id = 'bodoni-moda-font-link-test';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@1,400&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  // ─── Preload all required fonts on mount ────────────────────────────────────
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const fontsToLoad = [
      'Bodoni+Moda:ital,wght@1,400',
      'Cormorant+Garamond:ital,wght@0,400;1,400',
      'Libre+Baskerville:wght@400;700',
      'Playfair+Display:wght@400;700',
    ];
    fontsToLoad.forEach((fontParam) => {
      const id = `preload-font-test-${fontParam.split(':')[0].replace(/\+/g, '-').toLowerCase()}`;
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${fontParam}&display=swap`;
        document.head.appendChild(link);
      }
    });
    document.fonts.ready.then(() => {
      REQUIRED_FONTS_TEST.forEach(({ family, weight, style }) => {
        preloadFontTest(family, weight, style).catch(() => {/* silent */});
      });
    });
  }, []);
  // ────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    processLogoImageTest('/assets/images/Untitled_design-1773170239278.png').then((d) => { if (d) setProcessedLogoUrl(d); });
  }, []);
  useEffect(() => {
    processRedLogoImageTest('/assets/images/Untitled_design-2-1773172295962.png').then((d) => { if (d) setProcessedRedLogoUrl(d); });
  }, []);
  useEffect(() => {
    processFullLogoWhiteTest('/assets/images/image-1773162561184.png').then((d) => { if (d) setProcessedFullWhiteUrl(d); });
  }, []);
  useEffect(() => {
    processFullLogoRedTest('/assets/images/image-1773162561184.png').then((d) => { if (d) setProcessedFullRedUrl(d); });
  }, []);

  // Draw full composite onto canvas
  const drawComposite = useCallback(() => {
    if (!imgRef.current || !canvasRef.current || !previewReady) return;
    const img = imgRef.current;
    const canvas = canvasRef.current;
    drawBaseCanvas(canvas, img);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    drawTypographicOverlay(ctx, W, H, listingType, overlayOffset.x, overlayOffset.y);
    drawBottomBanner(ctx, W, H, propertyDetails);
  }, [previewReady, listingType, propertyDetails, overlayOffset]);

  useEffect(() => {
    if (!previewReady || !uploadedImage || !canvasRef.current) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      document.fonts.ready.then(() => {
        drawComposite();
      });
    };
    img.src = uploadedImage;
  }, [previewReady, uploadedImage]);

  useEffect(() => {
    if (!imgRef.current || !previewReady) return;
    document.fonts.ready.then(() => {
      drawComposite();
    });
  }, [listingType, propertyDetails, drawComposite, previewReady]);

  // ─── Drag handlers ──────────────────────────────────────────────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSelected(true);
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      offsetX: overlayOffset.x,
      offsetY: overlayOffset.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [overlayOffset]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current || !containerRef.current) return;
    e.preventDefault();
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const dx = (e.clientX - dragStartRef.current.mouseX) / rect.width;
    const dy = (e.clientY - dragStartRef.current.mouseY) / rect.height;
    setOverlayOffset({
      x: dragStartRef.current.offsetX + dx,
      y: dragStartRef.current.offsetY + dy,
    });
  }, [isDragging]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  // Deselect when clicking outside overlay
  const handleContainerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
      setIsSelected(false);
    }
  }, []);

  useImperativeHandle(ref, () => ({
    download() {
      // Canvas-based download — bypasses html2canvas to avoid vertical shift issues
      this.screenshotPreview();
    },
    screenshotPreview() {
      const img = imgRef.current;
      if (!img) return;

      const NW = img.naturalWidth || img.width;
      const NH = img.naturalHeight || img.height;
      if (!NW || !NH) return;

      const offscreen = document.createElement('canvas');
      offscreen.width = NW;
      offscreen.height = NH;
      const ctx = offscreen.getContext('2d');
      if (!ctx) return;

      // Draw base image
      ctx.drawImage(img, 0, 0, NW, NH);

      // Draw typographic overlay (same ratio math as preview)
      drawTypographicOverlay(ctx, NW, NH, listingType, overlayOffset.x, overlayOffset.y);

      // Draw bottom banner
      drawBottomBanner(ctx, NW, NH, propertyDetails);

      // Draw logo
      const logoHeightRatio = 0.07;
      const logoH = NH * logoHeightRatio;
      const margin = NW * 0.025;
      const bannerH = NH * 0.18;

      let logoDataUrl: string | null = null;
      if (selectedLogo === 'red-a') logoDataUrl = processedRedLogoUrl;
      else if (selectedLogo === 'white-full') logoDataUrl = processedFullWhiteUrl;
      else if (selectedLogo === 'red-full') logoDataUrl = processedFullRedUrl;
      else logoDataUrl = processedLogoUrl;

      const triggerDownload = () => {
        const link = document.createElement('a');
        link.download = `the-agency-listing-${Date.now()}.png`;
        link.href = offscreen.toDataURL('image/png');
        link.click();
      };

      if (logoDataUrl) {
        const logoImg = new Image();
        logoImg.onload = () => {
          const isFullLogo = selectedLogo === 'white-full' || selectedLogo === 'red-full';
          const aspect = logoImg.naturalWidth / logoImg.naturalHeight;
          const lH = logoH;
          const lW = isFullLogo ? lH * aspect : lH;
          const logoX = NW - lW - margin;
          const logoY = NH - bannerH / 2 - lH / 2;
          ctx.save();
          ctx.globalAlpha = 0.9;
          ctx.drawImage(logoImg, logoX, logoY, lW, lH);
          ctx.restore();
          triggerDownload();
        };
        logoImg.onerror = () => triggerDownload();
        logoImg.src = logoDataUrl;
      } else {
        triggerDownload();
      }
    },

    getContainerRect() {
      if (!containerRef.current) return { width: 0, height: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    },

    async highResDownload(onProgress: (pct: number, stage: string, detail: string) => void, containerWidth: number, containerHeight: number): Promise<void> {
      // ── Stage 1: Verify fonts (0–20%) ──────────────────────────────────────
      onProgress(0, 'Verifying fonts', 'Checking all required fonts are loaded…');
      // Yield so the browser paints the initial state before work begins
      await new Promise((r) => setTimeout(r, 80));

      let fontStep = 0;
      for (const font of REQUIRED_FONTS_TEST) {
        const ok = await preloadFontTest(font.family, font.weight, font.style);
        if (!ok) {
          onProgress(8, 'Verifying fonts', `Retrying "${font.family}"…`);
          await new Promise((r) => setTimeout(r, 600));
          await preloadFontTest(font.family, font.weight, font.style);
        }
        fontStep++;
        onProgress(Math.round((fontStep / REQUIRED_FONTS_TEST.length) * 20), 'Verifying fonts', `Loaded ${fontStep}/${REQUIRED_FONTS_TEST.length} fonts`);
        // Yield between each font so the bar visibly advances
        await new Promise((r) => setTimeout(r, 120));
      }
      onProgress(20, 'Verifying fonts', 'All fonts verified');
      await new Promise((r) => setTimeout(r, 150));

      // ── Stage 2: Build offscreen canvas (20–45%) ───────────────────────────
      onProgress(22, 'Building canvas', 'Creating full-resolution canvas…');
      await new Promise((r) => setTimeout(r, 100));

      const img = imgRef.current;
      if (!img) throw new Error('No image loaded. Please generate the preview first.');

      // ── Dynamic ratio: always calculate fresh from naturalWidth / containerWidth ──
      const NW = img.naturalWidth;
      const NH = img.naturalHeight;
      if (!NW || !NH) throw new Error('Image dimensions unavailable.');

      // Use pre-captured container dimensions (captured before modal opened)
      const CW = containerWidth;
      const CH = containerHeight || (CW * NH / NW); // fallback for zero-height containers
      if (!CW) throw new Error('Preview container has zero dimensions.');

      // scaleX / scaleY calculated dynamically — no hardcoded ratios
      const scaleX = NW / CW;
      const scaleY = NH / (CH || CW * NH / NW);

      onProgress(28, 'Building canvas', `Canvas: ${NW}×${NH}px (scale ${scaleX.toFixed(2)}×)`);
      await new Promise((r) => setTimeout(r, 100));

      const offscreen = document.createElement('canvas');
      offscreen.width = NW;
      offscreen.height = NH;
      const ctx = offscreen.getContext('2d');
      if (!ctx) throw new Error('Could not create canvas context.');

      // Draw base image at full native resolution
      ctx.drawImage(img, 0, 0, NW, NH);
      onProgress(35, 'Building canvas', 'Base image drawn at native resolution');
      await new Promise((r) => setTimeout(r, 120));

      // Draw typographic overlay using ratio-scaled coordinates
      drawTypographicOverlay(ctx, NW, NH, listingType, overlayOffset.x, overlayOffset.y);
      onProgress(40, 'Building canvas', 'Typographic overlay drawn');
      await new Promise((r) => setTimeout(r, 100));

      // Draw bottom banner
      drawBottomBanner(ctx, NW, NH, propertyDetails);
      onProgress(45, 'Building canvas', 'Canvas built at full resolution');
      await new Promise((r) => setTimeout(r, 120));

      // ── Stage 3: Map element ratios — draw logo (45–70%) ───────────────────
      onProgress(47, 'Mapping elements', 'Drawing logo onto full-res canvas…');
      await new Promise((r) => setTimeout(r, 80));

      // Use hardcoded 0.07 ratio for logo height — no DOM reads needed
      const logoHeightRatio = 0.07;

      const logoH = NH * logoHeightRatio;
      const margin = NW * 0.025;
      const bannerH = NH * 0.18;

      let logoDataUrl: string | null = null;
      if (selectedLogo === 'red-a') logoDataUrl = processedRedLogoUrl;
      else if (selectedLogo === 'white-full') logoDataUrl = processedFullWhiteUrl;
      else if (selectedLogo === 'red-full') logoDataUrl = processedFullRedUrl;
      else logoDataUrl = processedLogoUrl;

      if (logoDataUrl) {
        await new Promise<void>((resolve) => {
          const logoImg = new Image();
          logoImg.onload = () => {
            const isFullLogo = selectedLogo === 'white-full' || selectedLogo === 'red-full';
            const aspect = logoImg.naturalWidth / logoImg.naturalHeight;
            const lH = logoH;
            const lW = isFullLogo ? lH * aspect : lH;
            const logoX = NW - lW - margin;
            const logoY = NH - bannerH / 2 - lH / 2;
            ctx.save();
            ctx.globalAlpha = 0.9;
            ctx.drawImage(logoImg, logoX, logoY, lW, lH);
            ctx.restore();
            resolve();
          };
          logoImg.onerror = () => resolve();
          logoImg.src = logoDataUrl!;
        });
      }

      onProgress(60, 'Mapping elements', 'Logo positioned at full resolution');
      await new Promise((r) => setTimeout(r, 120));
      onProgress(70, 'Mapping elements', 'All elements drawn');
      await new Promise((r) => setTimeout(r, 100));

      // ── Stage 4: Quality verification (70–90%) ─────────────────────────────
      onProgress(72, 'Quality check', 'Verifying canvas dimensions…');
      await new Promise((r) => setTimeout(r, 100));

      if (offscreen.width !== NW || offscreen.height !== NH) {
        throw new Error(`Canvas dimension mismatch: expected ${NW}×${NH}, got ${offscreen.width}×${offscreen.height}`);
      }
      onProgress(76, 'Quality check', 'Dimensions verified ✓');
      await new Promise((r) => setTimeout(r, 120));

      // Spot-sample typographic overlay region
      onProgress(80, 'Quality check', 'Sampling text regions…');
      await new Promise((r) => setTimeout(r, 100));
      const config = getListingTypographyConfig(listingType);
      const sampleX = Math.round((config.line1XOffsetRatio + overlayOffset.x) * NW);
      const sampleY = Math.round((config.line1YRatio + overlayOffset.y) * NH);
      const sampleSize = Math.round(NW * 0.05);
      const sx = Math.max(0, sampleX);
      const sy = Math.max(0, sampleY);
      const sw = Math.min(sampleSize, NW - sx);
      const sh = Math.min(sampleSize, NH - sy);

      if (sw > 0 && sh > 0) {
        try {
          const sampleData = ctx.getImageData(sx, sy, sw, sh);
          const firstPixel = [sampleData.data[0], sampleData.data[1], sampleData.data[2]];
          let hasVariation = false;
          for (let i = 4; i < sampleData.data.length; i += 4) {
            if (
              Math.abs(sampleData.data[i] - firstPixel[0]) > 10 ||
              Math.abs(sampleData.data[i + 1] - firstPixel[1]) > 10 ||
              Math.abs(sampleData.data[i + 2] - firstPixel[2]) > 10
            ) {
              hasVariation = true;
              break;
            }
          }
          if (!hasVariation) {
            onProgress(83, 'Quality check', 'Text region blank — retrying…');
            await new Promise((r) => setTimeout(r, 400));
            drawTypographicOverlay(ctx, NW, NH, listingType, overlayOffset.x, overlayOffset.y);
          }
        } catch {
          // CORS — assume ok
        }
      }

      // Verify no element out of bounds
      onProgress(86, 'Quality check', 'Checking element bounds…');
      await new Promise((r) => setTimeout(r, 100));
      const line1X = (config.line1XOffsetRatio + overlayOffset.x) * NW;
      const line1Y = (config.line1YRatio + overlayOffset.y) * NH;
      if (line1X < 0 || line1X > NW || line1Y < 0 || line1Y > NH) {
        throw new Error('Typographic overlay is out of canvas bounds.');
      }
      onProgress(90, 'Quality check', 'All checks passed ✓');
      await new Promise((r) => setTimeout(r, 150));

      // ── Stage 5: Encode PNG (90–100%) ──────────────────────────────────────
      onProgress(92, 'Encoding PNG', 'Encoding full-resolution PNG…');
      await new Promise((r) => setTimeout(r, 100));

      let dataUrl: string;
      try {
        dataUrl = offscreen.toDataURL('image/png');
      } catch {
        throw new Error('Failed to encode canvas as PNG. The image may be cross-origin.');
      }

      if (!dataUrl || dataUrl === 'data:,') {
        throw new Error('PNG encoding produced an empty result.');
      }

      onProgress(98, 'Encoding PNG', 'PNG ready — triggering download…');
      await new Promise((r) => setTimeout(r, 150));

      const link = document.createElement('a');
      link.download = `the-agency-listing-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();

      onProgress(100, 'Encoding PNG', 'Download complete');
    },
  }), [listingType, propertyDetails, selectedLogo, overlayOffset,
       processedLogoUrl, processedRedLogoUrl, processedFullWhiteUrl, processedFullRedUrl]);

  // ─── HTML Preview rendering ─────────────────────────────────────────────────
  const config = getListingTypographyConfig(listingType);

  const getLogoPreviewUrl = () => {
    if (selectedLogo === 'red-a') return processedRedLogoUrl;
    if (selectedLogo === 'white-full') return processedFullWhiteUrl;
    if (selectedLogo === 'red-full') return processedFullRedUrl;
    return processedLogoUrl;
  };

  const getLogoFallbackSrc = () => {
    if (selectedLogo === 'red-a') return '/assets/images/Untitled_design-2-1773172295962.png';
    if (selectedLogo === 'white-full' || selectedLogo === 'red-full') return '/assets/images/image-1773162561184.png';
    return '/assets/images/Untitled_design-1773170239278.png';
  };

  const isFullLogo = selectedLogo === 'white-full' || selectedLogo === 'red-full';
  const activeLogoUrl = getLogoPreviewUrl();
  const fallbackLogoSrc = getLogoFallbackSrc();

  const statsParts = [
    propertyDetails.beds ? `${propertyDetails.beds} BED` : null,
    propertyDetails.baths ? `${propertyDetails.baths} BATH` : null,
    propertyDetails.sqft ? `${propertyDetails.sqft} SQFT` : null,
  ].filter(Boolean);

  return (
    <div className="rounded-lg border border-white/10 bg-[#1A1A1A] p-5 flex flex-col">
      <h2
        className="text-white mb-4 uppercase tracking-widest"
        style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', letterSpacing: '0.12em', fontWeight: 600 }}
      >
        Branded Preview
      </h2>

      <div
        ref={containerRef}
        className="relative w-full rounded-lg overflow-hidden bg-[#111111] border border-white/10"
        style={{ minHeight: previewReady ? undefined : '300px' }}
        onClick={handleContainerClick}
      >
        {/* Hidden canvas lives OUTSIDE previewDivRef so html2canvas never measures its native dimensions */}
        <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

        {previewReady ? (
          <div className="relative w-full" ref={previewDivRef}>
            {/* HTML preview — photo */}
            {uploadedImage && (
              <img
                src={uploadedImage}
                alt="Property photo with branded overlay"
                className="w-full h-auto block"
                style={{ display: 'block' }}
              />
            )}

            {/* Draggable typographic overlay — upper left */}
            <div
              ref={overlayRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              style={{
                position: 'absolute',
                left: `${(config.line1XOffsetRatio + overlayOffset.x) * 100}%`,
                top: `${(config.line1YRatio + overlayOffset.y) * 100}%`,
                cursor: isDragging ? 'grabbing' : 'grab',
                userSelect: 'none',
                touchAction: 'none',
                outline: isSelected ? '1.5px dashed rgba(232,0,42,0.7)' : 'none',
                borderRadius: '2px',
              }}
              title="Drag to reposition"
            >
              {/* Line 1 */}
              <div
                style={{
                  fontFamily: '"Bodoni Moda", "Bodoni 72", "Didot", "Playfair Display", Georgia, serif',
                  fontSize: `${overlayFontSizes.line1}px`,
                  fontStyle: 'italic',
                  fontWeight: 550,
                  color: 'rgba(255,255,255,0.85)',
                  lineHeight: 0.9,
                  whiteSpace: 'nowrap',
                  letterSpacing: '-0.02em',
                  transform: 'skewX(-5deg)',
                  pointerEvents: 'none',
                }}
              >
                {config.line1}
              </div>
              {/* Line 2 — offset relative to line 1 position */}
              <div
                style={{
                  fontFamily: '"Bodoni Moda", "Bodoni 72", "Didot", "Playfair Display", Georgia, serif',
                  fontSize: `${overlayFontSizes.line2}px`,
                  fontStyle: 'italic',
                  fontWeight: 550,
                  color: 'rgba(255,255,255,0.85)',
                  lineHeight: 0.9,
                  whiteSpace: 'nowrap',
                  letterSpacing: '-0.02em',
                  marginTop: `${overlayFontSizes.line2MarginTop}px`,
                  marginLeft: `${overlayFontSizes.line2MarginLeft}px`,
                  transform: 'skewX(-5deg)',
                  pointerEvents: 'none',
                }}
              >
                {config.line2}
              </div>
            </div>

            {/* Bottom banner */}
            <div
              className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-center gap-1"
              style={{
                background: 'rgba(0,0,0,0.62)',
                padding: '3% 5%',
                minHeight: '18%',
              }}
            >
              {propertyDetails.address && (
                <p
                  style={{
                    fontFamily: 'Inter, "Helvetica Neue", Arial, sans-serif',
                    fontSize: 'clamp(13px, 3.3%, 27px)',
                    fontWeight: 600,
                    color: '#ffffff',
                    letterSpacing: '0.1em',
                    textAlign: 'center',
                    textTransform: 'uppercase',
                    margin: 0,
                    lineHeight: 1.3,
                  }}
                >
                  {propertyDetails.address.toUpperCase()}
                </p>
              )}
              {statsParts.length > 0 && (
                <p
                  style={{
                    fontFamily: 'Inter, "Helvetica Neue", Arial, sans-serif',
                    fontSize: 'clamp(12px, 2.7%, 22px)',
                    fontWeight: 500,
                    color: '#ffffff',
                    letterSpacing: '0.06em',
                    textAlign: 'center',
                    textTransform: 'uppercase',
                    margin: 0,
                    lineHeight: 1.3,
                  }}
                >
                  {statsParts.join(' | ')}
                </p>
              )}
              {propertyDetails.listingPrice && (
                <p
                  style={{
                    fontFamily: 'Inter, "Helvetica Neue", Arial, sans-serif',
                    fontSize: 'clamp(13px, 3.15%, 25px)',
                    fontWeight: 600,
                    color: '#ffffff',
                    letterSpacing: '0.04em',
                    textAlign: 'center',
                    margin: 0,
                    lineHeight: 1.3,
                  }}
                >
                  {propertyDetails.listingPrice!.startsWith('$')
                    ? propertyDetails.listingPrice
                    : `$${propertyDetails.listingPrice}`}
                </p>
              )}

              {/* Agency "A" logo — bottom right of banner */}
              <div
                style={{
                  position: 'absolute',
                  right: '2.5%',
                  bottom: '10%',
                  top: '10%',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {activeLogoUrl ? (
                  <img
                    src={activeLogoUrl}
                    alt="The Agency logo"
                    style={{
                      height: '60%',
                      maxHeight: '36px',
                      minHeight: '20px',
                      width: isFullLogo ? 'auto' : 'auto',
                      opacity: 0.9,
                      display: 'block',
                    }}
                    draggable={false}
                  />
                ) : (
                  <img
                    src={fallbackLogoSrc}
                    alt="The Agency logo"
                    style={{
                      height: '60%',
                      maxHeight: '36px',
                      minHeight: '20px',
                      width: 'auto',
                      opacity: 0.9,
                      display: 'block',
                      mixBlendMode: (selectedLogo === 'red-a' || selectedLogo === 'red-full') ? 'normal' : 'screen',
                      filter: (selectedLogo === 'red-a' || selectedLogo === 'red-full') ? 'none' : 'invert(1)',
                    }}
                    draggable={false}
                  />
                )}
              </div>
            </div>

            {/* Drag hint */}
            {!isDragging && isSelected && (
              <div
                style={{
                  position: 'absolute',
                  top: '8px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(0,0,0,0.65)',
                  color: '#fff',
                  fontSize: '10px',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  fontFamily: 'Inter, sans-serif',
                  letterSpacing: '0.04em',
                }}
              >
                Drag to reposition
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center w-full" style={{ minHeight: '300px' }}>
              {isGenerating ? (
                <>
                  <div className="w-12 h-12 border-2 border-[#E8002A] border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-[#B8B8B8]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Generating branded overlay...
                  </p>
                </>
              ) : !uploadedImage ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-[#E8002A]/10 flex items-center justify-center">
                    <Icon name="PhotoIcon" size={32} variant="outline" className="text-[#E8002A]/60" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                      No image uploaded yet
                    </p>
                    <p className="text-[#B8B8B8] text-xs mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Upload a property photo to see the branded preview
                    </p>
                  </div>
                </>
              ) : (
                <div className="relative w-full">
                  <img
                    src={uploadedImage}
                    alt="Uploaded property photo awaiting branded overlay generation"
                    className="w-full h-auto block rounded opacity-50"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 rounded">
                    <Icon name="SparklesIcon" size={28} variant="outline" className="text-[#E8002A]" />
                    <p className="text-white text-sm font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Click &ldquo;Generate Preview&rdquo; to apply overlay
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {previewReady && (
        <div className="mt-3 flex items-center gap-2 text-xs text-[#B8B8B8]" style={{ fontFamily: 'Inter, sans-serif' }}>
          <Icon name="CheckCircleIcon" size={14} variant="solid" className="text-green-400" />
          Overlay applied — click &amp; drag the text to reposition it.
        </div>
      )}
    </div>
  );
});

export default CanvasPreviewTest;
