'use client';

import { useEffect, useRef, forwardRef, useImperativeHandle, useState, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { PropertyDetails } from './PhotoEditorInteractive';
import type { TextFonts } from './PhotoEditorInteractive';
import Icon from '@/components/ui/AppIcon';

interface CanvasPreviewProps {
  uploadedImage: string | null;
  propertyDetails: PropertyDetails;
  listingType: string;
  previewReady: boolean;
  isGenerating: boolean;
  selectedLogo?: 'white-a' | 'red-a' | 'white-full' | 'red-full';
  textFonts?: TextFonts;
}

export interface CanvasPreviewHandle {
  download: () => void;
  screenshotPreview: () => void;
  highResDownload: (onProgress: (pct: number, stage: string, detail: string) => void) => Promise<void>;
}

// Draw the base image + gradient only (no text/logo — those are HTML overlays)
function drawBaseCanvas(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  vignetteIntensity: number = 0
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = img.naturalWidth || img.width;
  const H = img.naturalHeight || img.height;
  canvas.width = W;
  canvas.height = H;

  ctx.drawImage(img, 0, 0, W, H);

  // Bottom gradient for text legibility — scales with vignetteIntensity
  if (vignetteIntensity > 0) {
    const t = vignetteIntensity / 100;
    const gradientStart = H * 0.45;
    const gradient = ctx.createLinearGradient(0, gradientStart, 0, H);
    gradient.addColorStop(0, `rgba(5,5,5,0)`);
    gradient.addColorStop(0.3, `rgba(5,5,5,${(0.55 * t).toFixed(3)})`);
    gradient.addColorStop(0.6, `rgba(5,5,5,${(0.82 * t).toFixed(3)})`);
    gradient.addColorStop(0.85, `rgba(5,5,5,${(0.93 * t).toFixed(3)})`);
    gradient.addColorStop(1, `rgba(5,5,5,${(0.97 * t).toFixed(3)})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, gradientStart, W, H - gradientStart);

    // Edge vignette shadow
    const alpha = t;
    const vSize = Math.min(W, H) * 0.55;

    // Top edge
    const topGrad = ctx.createLinearGradient(0, 0, 0, vSize);
    topGrad.addColorStop(0, `rgba(0,0,0,${alpha})`);
    topGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, W, vSize);

    // Bottom edge
    const botGrad = ctx.createLinearGradient(0, H - vSize, 0, H);
    botGrad.addColorStop(0, 'rgba(0,0,0,0)');
    botGrad.addColorStop(1, `rgba(0,0,0,${alpha})`);
    ctx.fillStyle = botGrad;
    ctx.fillRect(0, H - vSize, W, vSize);

    // Left edge
    const leftGrad = ctx.createLinearGradient(0, 0, vSize, 0);
    leftGrad.addColorStop(0, `rgba(0,0,0,${alpha})`);
    leftGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = leftGrad;
    ctx.fillRect(0, 0, vSize, H);

    // Right edge
    const rightGrad = ctx.createLinearGradient(W - vSize, 0, W, 0);
    rightGrad.addColorStop(0, 'rgba(0,0,0,0)');
    rightGrad.addColorStop(1, `rgba(0,0,0,${alpha})`);
    ctx.fillStyle = rightGrad;
    ctx.fillRect(W - vSize, 0, vSize, H);
  }
}

interface OverlayElement {
  id: string;
  type: 'logo' | 'newlisting' | 'address' | 'stats' | 'price';
  text: string;
  xPct: number;
  yPct: number;
  sizePx?: number; // logo size in preview px (only for logo type)
  fontScale?: number; // text size multiplier (1.0 = default, for text types)
}

const DEFAULT_ELEMENTS: Omit<OverlayElement, 'text'>[] = [
{ id: 'logo',       type: 'logo',       xPct: 0.5, yPct: 0.62, sizePx: 90 },
{ id: 'newlisting', type: 'newlisting', xPct: 0.5, yPct: 0.77, fontScale: 1.0 },
{ id: 'address',    type: 'address',    xPct: 0.5, yPct: 0.87, fontScale: 1.0 },
{ id: 'stats',      type: 'stats',      xPct: 0.5, yPct: 0.92, fontScale: 1.0 },
{ id: 'price',      type: 'price',      xPct: 0.5, yPct: 0.96, fontScale: 1.0 },
];

// ─── Logo processing helper ──────────────────────────────────────────────────
// Loads the "A" mark PNG, removes white/near-white pixels (transparent),
// then inverts the remaining dark pixels to white.
// Returns a data-URL of the processed image, or null on failure.
function processLogoImage(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    // Do NOT set crossOrigin for same-origin local assets — it causes
    // the browser to taint the canvas and block getImageData().
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (!w || !h) { resolve(null); return; }
      const tmp = document.createElement('canvas');
      tmp.width = w;
      tmp.height = h;
      const ctx = tmp.getContext('2d');
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0, w, h);

      let imageData: ImageData;
      try {
        imageData = ctx.getImageData(0, 0, w, h);
      } catch {
        // Canvas tainted (CORS) — return null so the raw src fallback is used
        resolve(null);
        return;
      }

      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        // Treat near-white pixels as transparent
        if (r > 200 && g > 200 && b > 200) {
          data[i + 3] = 0; // fully transparent
        } else {
          // Invert dark pixels to white
          data[i]     = 255;
          data[i + 1] = 255;
          data[i + 2] = 255;
          // keep alpha as-is (opaque)
        }
      }
      ctx.putImageData(imageData, 0, 0);

      // ── Crop to non-transparent bounding box ──────────────────────────────
      let minX = w, minY = h, maxX = 0, maxY = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const alpha = data[(y * w + x) * 4 + 3];
          if (alpha > 10) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      // If no opaque pixels found, return the full processed image
      if (minX > maxX || minY > maxY) {
        resolve(tmp.toDataURL('image/png'));
        return;
      }
      const cropW = maxX - minX + 1;
      const cropH = maxY - minY + 1;
      if (cropW < 2 || cropH < 2) {
        resolve(tmp.toDataURL('image/png'));
        return;
      }
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = cropW;
      cropCanvas.height = cropH;
      const cropCtx = cropCanvas.getContext('2d');
      if (!cropCtx) { resolve(tmp.toDataURL('image/png')); return; }
      cropCtx.drawImage(tmp, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
      resolve(cropCanvas.toDataURL('image/png'));
      // ─────────────────────────────────────────────────────────────────────
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Red logo processing helper ──────────────────────────────────────────────
// Loads the red "A" mark PNG, removes white/near-white pixels (transparent),
// but keeps the red pixels intact (no inversion).
function processRedLogoImage(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (!w || !h) { resolve(null); return; }
      const tmp = document.createElement('canvas');
      tmp.width = w;
      tmp.height = h;
      const ctx = tmp.getContext('2d');
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0, w, h);

      let imageData: ImageData;
      try {
        imageData = ctx.getImageData(0, 0, w, h);
      } catch {
        resolve(null);
        return;
      }

      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        // Treat near-white pixels as transparent — keep red pixels as-is
        if (r > 200 && g > 200 && b > 200) {
          data[i + 3] = 0; // fully transparent
        }
        // else: keep original color (red/dark stays as-is)
      }
      ctx.putImageData(imageData, 0, 0);

      // ── Crop to non-transparent bounding box ──────────────────────────────
      let minX = w, minY = h, maxX = 0, maxY = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const alpha = data[(y * w + x) * 4 + 3];
          if (alpha > 10) {
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
          }
        }
      }
      if (minX > maxX || minY > maxY) {
        resolve(tmp.toDataURL('image/png'));
        return;
      }
      const cropW = maxX - minX + 1;
      const cropH = maxY - minY + 1;
      if (cropW < 2 || cropH < 2) {
        resolve(tmp.toDataURL('image/png'));
        return;
      }
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = cropW;
      cropCanvas.height = cropH;
      const cropCtx = cropCanvas.getContext('2d');
      if (!cropCtx) { resolve(tmp.toDataURL('image/png')); return; }
      cropCtx.drawImage(tmp, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
      resolve(cropCanvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Full wordmark logo processing helper (white version) ─────────────────────
// Loads image-1773162561184.png, strips white/near-white bg, inverts to white.
function processFullLogoWhite(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (!w || !h) { resolve(null); return; }
      const tmp = document.createElement('canvas');
      tmp.width = w;
      tmp.height = h;
      const ctx = tmp.getContext('2d');
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0, w, h);
      let imageData: ImageData;
      try {
        imageData = ctx.getImageData(0, 0, w, h);
      } catch {
        resolve(null);
        return;
      }
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        if (r > 200 && g > 200 && b > 200) {
          data[i + 3] = 0;
        } else {
          data[i]     = 255;
          data[i + 1] = 255;
          data[i + 2] = 255;
        }
      }
      ctx.putImageData(imageData, 0, 0);
      // Crop to bounding box
      let minX = w, minY = h, maxX = 0, maxY = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (data[(y * w + x) * 4 + 3] > 10) {
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
          }
        }
      }
      if (minX > maxX || minY > maxY) { resolve(tmp.toDataURL('image/png')); return; }
      const cropW = maxX - minX + 1;
      const cropH = maxY - minY + 1;
      if (cropW < 2 || cropH < 2) { resolve(tmp.toDataURL('image/png')); return; }
      const cc = document.createElement('canvas');
      cc.width = cropW; cc.height = cropH;
      const cctx = cc.getContext('2d');
      if (!cctx) { resolve(tmp.toDataURL('image/png')); return; }
      cctx.drawImage(tmp, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
      resolve(cc.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// ─── Full wordmark logo processing helper (red version) ──────────────────────
// Loads image-1773162561184.png, strips white/near-white bg, keeps red pixels.
function processFullLogoRed(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (!w || !h) { resolve(null); return; }
      const tmp = document.createElement('canvas');
      tmp.width = w;
      tmp.height = h;
      const ctx = tmp.getContext('2d');
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0, w, h);
      let imageData: ImageData;
      try {
        imageData = ctx.getImageData(0, 0, w, h);
      } catch {
        resolve(null);
        return;
      }
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        if (r > 200 && g > 200 && b > 200) {
          data[i + 3] = 0;
        }
        // else: keep original color (red/dark stays as-is)
      }
      ctx.putImageData(imageData, 0, 0);
      // Crop to bounding box
      let minX = w, minY = h, maxX = 0, maxY = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (data[(y * w + x) * 4 + 3] > 10) {
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
          }
        }
      }
      if (minX > maxX || minY > maxY) { resolve(tmp.toDataURL('image/png')); return; }
      const cropW = maxX - minX + 1;
      const cropH = maxY - minY + 1;
      if (cropW < 2 || cropH < 2) { resolve(tmp.toDataURL('image/png')); return; }
      const cc = document.createElement('canvas');
      cc.width = cropW; cc.height = cropH;
      const cctx = cc.getContext('2d');
      if (!cctx) { resolve(tmp.toDataURL('image/png')); return; }
      cctx.drawImage(tmp, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
      resolve(cc.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Font preload helper ──────────────────────────────────────────────────────
// Preloads a font via FontFace API so it is warm before canvas draw time.
async function preloadFont(family: string, weight: string, style: string): Promise<boolean> {
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

// All fonts used across Format 1 overlays
const REQUIRED_FONTS = [
  { family: 'Bodoni Moda',         weight: '400', style: 'italic' },
  { family: 'Cormorant Garamond',  weight: '400', style: 'italic' },
  { family: 'Cormorant Garamond',  weight: '400', style: 'normal' },
  { family: 'Libre Baskerville',   weight: '700', style: 'normal' },
  { family: 'Playfair Display',    weight: '400', style: 'normal' },
  { family: 'Playfair Display',    weight: '700', style: 'normal' },
  { family: 'Raleway',             weight: '600', style: 'normal' },
  { family: 'Raleway',             weight: '700', style: 'normal' },
];
// ─────────────────────────────────────────────────────────────────────────────

const CanvasPreview = forwardRef<CanvasPreviewHandle, CanvasPreviewProps>(function CanvasPreview(
  { uploadedImage, propertyDetails, listingType, previewReady, isGenerating, selectedLogo = 'white-a', textFonts },
  ref
) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previewDivRef = useRef<HTMLDivElement>(null);

  const [vignetteIntensity, setVignetteIntensity] = useState(0);
  const [backdropEnabled, setBackdropEnabled] = useState(false);
  const [backdropOpacity, setBackdropOpacity] = useState(50);
  const [elements, setElements] = useState<OverlayElement[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Banner bounds as percentage of container height (0–1)
  const [bannerTopPct, setBannerTopPct] = useState(0.6);
  const [bannerBotPct, setBannerBotPct] = useState(0.97);

  // Drag state for banner edge handles
  const bannerDragRef = useRef<{ edge: 'top' | 'bottom'; startY: number; origPct: number } | null>(null);

  // Processed logo data-URL (white bg removed, pixels inverted to white)
  const [processedLogoUrl, setProcessedLogoUrl] = useState<string | null>(null);
  // Processed red logo data-URL (white bg removed, red kept intact)
  const [processedRedLogoUrl, setProcessedRedLogoUrl] = useState<string | null>(null);
  // Processed full wordmark logo — white version
  const [processedFullWhiteUrl, setProcessedFullWhiteUrl] = useState<string | null>(null);
  // Processed full wordmark logo — red version
  const [processedFullRedUrl, setProcessedFullRedUrl] = useState<string | null>(null);

  // Inject Raleway font from Google Fonts once on mount
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const id = 'raleway-font-link';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Raleway:wght@600;700;800&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  // ─── Preload all required fonts on mount ────────────────────────────────────
  useEffect(() => {
    if (typeof document === 'undefined') return;
    // Inject Google Fonts link for all required families
    const fontsToLoad = [
      'Bodoni+Moda:ital,wght@1,400',
      'Cormorant+Garamond:ital,wght@0,400;1,400',
      'Libre+Baskerville:wght@400;700',
      'Playfair+Display:wght@400;700',
    ];
    fontsToLoad.forEach((fontParam) => {
      const id = `preload-font-${fontParam.split(':')[0].replace(/\+/g, '-').toLowerCase()}`;
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${fontParam}&display=swap`;
        document.head.appendChild(link);
      }
    });
    // Warm up fonts via FontFace API
    document.fonts.ready.then(() => {
      REQUIRED_FONTS.forEach(({ family, weight, style }) => {
        preloadFont(family, weight, style).catch(() => {/* silent */});
      });
    });
  }, []);
  // ────────────────────────────────────────────────────────────────────────────

  // Process the black logo image once on mount
  useEffect(() => {
    processLogoImage('/assets/images/Untitled_design-1773170239278.png').then((dataUrl) => {
      if (dataUrl) setProcessedLogoUrl(dataUrl);
    });
  }, []);

  // Process the red logo image once on mount
  useEffect(() => {
    processRedLogoImage('/assets/images/Untitled_design-2-1773172295962.png').then((dataUrl) => {
      if (dataUrl) setProcessedRedLogoUrl(dataUrl);
    });
  }, []);

  // Process the full wordmark logo (white) once on mount
  useEffect(() => {
    processFullLogoWhite('/assets/images/image-1773162561184.png').then((dataUrl) => {
      if (dataUrl) setProcessedFullWhiteUrl(dataUrl);
    });
  }, []);

  // Process the full wordmark logo (red) once on mount
  useEffect(() => {
    processFullLogoRed('/assets/images/image-1773162561184.png').then((dataUrl) => {
      if (dataUrl) setProcessedFullRedUrl(dataUrl);
    });
  }, []);

  // Undo/redo history — each entry is a snapshot of elements text values
  const historyRef = useRef<OverlayElement[][]>([]);
  const historyIndexRef = useRef<number>(-1);

  const pushHistory = useCallback((snapshot: OverlayElement[]) => {
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(snapshot.map((el) => ({ ...el })));
    historyIndexRef.current = historyRef.current.length - 1;
  }, []);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  const [historyVersion, setHistoryVersion] = useState(0);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const snapshot = historyRef.current[historyIndexRef.current];
    setElements(snapshot.map((el) => ({ ...el })));
    setHistoryVersion((v) => v + 1);
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const snapshot = historyRef.current[historyIndexRef.current];
    setElements(snapshot.map((el) => ({ ...el })));
    setHistoryVersion((v) => v + 1);
  }, []);

  // Drag state for repositioning
  const draggingRef = useRef<{ id: string; startX: number; startY: number; origXPct: number; origYPct: number } | null>(null);

  // Resize state for logo scaling and text font scaling
  const resizingRef = useRef<{ id: string; startX: number; startY: number; origSize: number; isText: boolean } | null>(null);

  // Initialize banner bounds from element positions when enabling backdrop
  const handleToggleBackdrop = useCallback(() => {
    setBackdropEnabled((prev) => {
      const next = !prev;
      if (next && elements.length > 0) {
        // Find newlisting (top of text) and stats (bottom of text) elements
        const newlisting = elements.find((el) => el.type === 'newlisting');
        const stats = elements.find((el) => el.type === 'stats');
        const topEl = newlisting || elements.reduce((a, b) => (a.yPct < b.yPct ? a : b));
        const botEl = stats || elements.reduce((a, b) => (a.yPct > b.yPct ? a : b));
        const padTop = 0.04;
        const padBot = 0.03;
        setBannerTopPct(Math.max(0, topEl.yPct - padTop));
        setBannerBotPct(Math.min(1, botEl.yPct + padBot));
      }
      return next;
    });
  }, [elements]);

  // Banner edge drag handlers
  const handleBannerEdgeMouseDown = useCallback((e: React.MouseEvent, edge: 'top' | 'bottom') => {
    e.preventDefault();
    e.stopPropagation();
    bannerDragRef.current = {
      edge,
      startY: e.clientY,
      origPct: edge === 'top' ? bannerTopPct : bannerBotPct,
    };
  }, [bannerTopPct, bannerBotPct]);

  const buildElements = useCallback((details: PropertyDetails, listing: string): OverlayElement[] => {
    const statsParts = [
      details.beds ? `${details.beds} Beds` : null,
      details.baths ? `${details.baths} Baths` : null,
      details.sqft ? `${details.sqft} Sq. Ft.` : null,
    ].filter(Boolean);

    return DEFAULT_ELEMENTS.map((el) => {
      let text = '';
      if (el.type === 'logo') text = 'LOGO';
      else if (el.type === 'newlisting') text = listing;
      else if (el.type === 'address') text = details.address ? details.address.toUpperCase() : 'ADDRESS';
      else if (el.type === 'stats') text = statsParts.length > 0 ? statsParts.join(' | ') : 'Beds | Baths | Sq. Ft.';
      else if (el.type === 'price') {
        const raw = details.listingPrice || '';
        text = raw && !raw.startsWith('$') ? `$${raw}` : raw;
      }
      return { ...el, text };
    });
  }, []);

  useEffect(() => {
    if (previewReady) {
      const initial = buildElements(propertyDetails, listingType);
      setElements(initial);
      historyRef.current = [initial.map((el) => ({ ...el }))];
      historyIndexRef.current = 0;
      setHistoryVersion(0);
      setEditingId(null);
      setSelectedId(null);
    }
  }, [previewReady, uploadedImage, propertyDetails, listingType, buildElements]);

  useEffect(() => {
    if (!previewReady || !uploadedImage || !canvasRef.current) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      if (canvasRef.current) {
        drawBaseCanvas(canvasRef.current, img, vignetteIntensity);
      }
    };
    img.src = uploadedImage;
  }, [previewReady, uploadedImage]);

  useEffect(() => {
    if (!imgRef.current || !canvasRef.current || !previewReady) return;
    drawBaseCanvas(canvasRef.current, imgRef.current, vignetteIntensity);
  }, [vignetteIntensity, previewReady]);

  // ─── Composited download ────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    download() {
      // kept for backward compat — delegates to screenshotPreview
      if (previewDivRef.current) {
        html2canvas(previewDivRef.current, {
          useCORS: true,
          allowTaint: true,
          scale: Math.max(window.devicePixelRatio || 1, 3),
          backgroundColor: null,
          logging: false,
        }).then((canvas) => {
          const link = document.createElement('a');
          link.download = `the-agency-listing-${Date.now()}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        });
      }
    },
    screenshotPreview() {
      if (!previewDivRef.current) return;
      html2canvas(previewDivRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: Math.max(window.devicePixelRatio || 1, 3),
        backgroundColor: null,
        logging: false,
      }).then((canvas) => {
        const link = document.createElement('a');
        link.download = `the-agency-listing-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
    },

    async highResDownload(onProgress: (pct: number, stage: string, detail: string) => void): Promise<void> {
      // ── Stage 1: Verify fonts (0–20%) ──────────────────────────────────────
      onProgress(0, 'Verifying fonts', 'Checking all required fonts are loaded…');
      // Yield so the browser paints the initial 0% state before work begins
      await new Promise((r) => setTimeout(r, 80));

      const fontsToVerify = [
        ...REQUIRED_FONTS,
        ...(textFonts ? [
          { family: textFonts.listingType, weight: '400', style: 'italic' },
          { family: textFonts.address,     weight: '700', style: 'normal' },
          { family: textFonts.stats,       weight: '600', style: 'normal' },
          { family: textFonts.price,       weight: '700', style: 'normal' },
        ] : []),
      ];

      let fontStep = 0;
      for (const font of fontsToVerify) {
        const ok = await preloadFont(font.family, font.weight, font.style);
        if (!ok) {
          onProgress(10, 'Verifying fonts', `Retrying "${font.family}"…`);
          await new Promise((r) => setTimeout(r, 600));
          await preloadFont(font.family, font.weight, font.style);
        }
        fontStep++;
        onProgress(Math.round((fontStep / fontsToVerify.length) * 20), 'Verifying fonts', `Loaded ${fontStep}/${fontsToVerify.length} fonts`);
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

      if (!containerRef.current) throw new Error('Preview container not found.');
      const containerRect = containerRef.current.getBoundingClientRect();
      const CW = containerRect.width;
      const CH = containerRect.height || (CW * NH / NW);
      if (!CW) throw new Error('Preview container has zero dimensions.');

      // scaleX / scaleY calculated dynamically at download time — works for any resolution
      const scaleX = NW / CW;
      const scaleY = NH / CH;

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

      // Draw vignette (same logic as drawBaseCanvas)
      if (vignetteIntensity > 0) {
        const t = vignetteIntensity / 100;
        const gradientStart = NH * 0.45;
        const gradient = ctx.createLinearGradient(0, gradientStart, 0, NH);
        gradient.addColorStop(0, `rgba(5,5,5,0)`);
        gradient.addColorStop(0.3, `rgba(5,5,5,${(0.55 * t).toFixed(3)})`);
        gradient.addColorStop(0.6, `rgba(5,5,5,${(0.82 * t).toFixed(3)})`);
        gradient.addColorStop(0.85, `rgba(5,5,5,${(0.93 * t).toFixed(3)})`);
        gradient.addColorStop(1, `rgba(5,5,5,${(0.97 * t).toFixed(3)})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, gradientStart, NW, NH - gradientStart);

        const alpha = t;
        const vSize = Math.min(NW, NH) * 0.55;
        const topGrad = ctx.createLinearGradient(0, 0, 0, vSize);
        topGrad.addColorStop(0, `rgba(0,0,0,${alpha})`);
        topGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = topGrad;
        ctx.fillRect(0, 0, NW, vSize);

        const botGrad = ctx.createLinearGradient(0, NH - vSize, 0, NH);
        botGrad.addColorStop(0, 'rgba(0,0,0,0)');
        botGrad.addColorStop(1, `rgba(0,0,0,${alpha})`);
        ctx.fillStyle = botGrad;
        ctx.fillRect(0, NH - vSize, NW, vSize);

        const leftGrad = ctx.createLinearGradient(0, 0, vSize, 0);
        leftGrad.addColorStop(0, `rgba(0,0,0,${alpha})`);
        leftGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = leftGrad;
        ctx.fillRect(0, 0, vSize, NH);

        const rightGrad = ctx.createLinearGradient(NW - vSize, 0, NW, 0);
        rightGrad.addColorStop(0, 'rgba(0,0,0,0)');
        rightGrad.addColorStop(1, `rgba(0,0,0,${alpha})`);
        ctx.fillStyle = rightGrad;
        ctx.fillRect(NW - vSize, 0, vSize, NH);
      }
      onProgress(45, 'Building canvas', 'Canvas built at full resolution');
      await new Promise((r) => setTimeout(r, 120));

      // ── Stage 3: Map element ratios (45–70%) ───────────────────────────────
      onProgress(47, 'Mapping elements', 'Reading element positions from preview…');
      await new Promise((r) => setTimeout(r, 80));

      // Draw backdrop banner if enabled
      if (backdropEnabled && elements.length > 0) {
        const bannerTopY = bannerTopPct * NH;
        const bannerBotY = bannerBotPct * NH;
        ctx.save();
        ctx.fillStyle = `rgba(0,0,0,${(backdropOpacity / 100).toFixed(3)})`;
        ctx.fillRect(0, bannerTopY, NW, bannerBotY - bannerTopY);
        ctx.restore();
      }

      onProgress(52, 'Mapping elements', 'Drawing text overlays…');
      await new Promise((r) => setTimeout(r, 80));

      // Draw each overlay element — font sizes scaled via fresh scaleX
      for (const el of elements) {
        const domEl = previewDivRef.current?.querySelector(`[data-overlay-el][data-el-id="${el.id}"]`) as HTMLElement | null;

        // Position: stored as percentage of container — multiply by full-res dimensions
        const xCanvas = el.xPct * NW;
        const yCanvas = el.yPct * NH;

        if (el.type === 'logo') {
          let logoSizePx = el.sizePx ?? 90;
          if (domEl) {
            const imgEl = domEl.querySelector('img') as HTMLImageElement | null;
            if (imgEl) {
              const imgRect = imgEl.getBoundingClientRect();
              // Convert DOM logo height to ratio, then scale to full-res using fresh scaleY
              logoSizePx = imgRect.height * scaleY;
            }
          } else {
            // Fallback: scale stored preview px to full-res using fresh scaleX
            logoSizePx = logoSizePx * scaleX;
          }

          let logoDataUrl: string | null = null;
          if (selectedLogo === 'red-a') logoDataUrl = processedRedLogoUrl;
          else if (selectedLogo === 'white-full') logoDataUrl = processedFullWhiteUrl;
          else if (selectedLogo === 'red-full') logoDataUrl = processedFullRedUrl;
          else logoDataUrl = processedLogoUrl;

          if (logoDataUrl) {
            await new Promise<void>((resolve) => {
              const logoImg = new Image();
              logoImg.onload = () => {
                let isFullLogo = selectedLogo === 'white-full' || selectedLogo === 'red-full';
                const aspect = logoImg.naturalWidth / logoImg.naturalHeight;
                const lH = logoSizePx;
                const lW = isFullLogo ? lH * aspect : lH;
                ctx.save();
                ctx.globalAlpha = 1.0;
                ctx.drawImage(logoImg, xCanvas - lW / 2, yCanvas - lH / 2, lW, lH);
                ctx.restore();
                resolve();
              };
              logoImg.onerror = () => resolve();
              logoImg.src = logoDataUrl!;
            });
          }
          continue;
        }

        // Text elements — read font size from DOM, scale via fresh scaleX
        let domFontSizePx = 16;
        let domLetterSpacing = 0;
        if (domEl) {
          const spanEl = domEl.querySelector('[data-text-span]') as HTMLElement | null;
          if (spanEl) {
            const computed = window.getComputedStyle(spanEl);
            const fsPx = parseFloat(computed.fontSize);
            if (!isNaN(fsPx)) domFontSizePx = fsPx;
            const ls = parseFloat(computed.letterSpacing);
            if (!isNaN(ls)) domLetterSpacing = ls;
          }
        }

        // Scale font size from preview px to full-res px using fresh scaleX
        const scaledFontSize = domFontSizePx * scaleX;
        const scaledLetterSpacing = domLetterSpacing * scaleX;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';

        if (el.type === 'newlisting') {
          const font = textFonts?.listingType || 'Cormorant Garamond';
          ctx.font = `italic 400 ${scaledFontSize}px "${font}", Georgia, serif`;
          ctx.letterSpacing = `${scaledLetterSpacing}px`;
          ctx.shadowColor = 'rgba(0,0,0,0.9)';
          ctx.shadowBlur = scaledFontSize * 0.5;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = scaledFontSize * 0.08;
          ctx.fillText(el.text, xCanvas, yCanvas);
        } else if (el.type === 'address') {
          const font = textFonts?.address || 'Libre Baskerville';
          ctx.font = `700 ${scaledFontSize}px "${font}", sans-serif`;
          ctx.letterSpacing = `${scaledLetterSpacing}px`;
          ctx.shadowColor = 'rgba(0,0,0,0.95)';
          ctx.shadowBlur = scaledFontSize * 0.4;
          ctx.shadowOffsetY = scaledFontSize * 0.06;
          ctx.fillText(el.text.toUpperCase(), xCanvas, yCanvas);
        } else if (el.type === 'stats') {
          const font = textFonts?.stats || 'Raleway';
          ctx.font = `600 ${scaledFontSize}px "${font}", sans-serif`;
          ctx.letterSpacing = `${scaledLetterSpacing}px`;
          ctx.shadowColor = 'rgba(0,0,0,0.95)';
          ctx.shadowBlur = scaledFontSize * 0.35;
          ctx.shadowOffsetY = scaledFontSize * 0.05;
          ctx.fillText(el.text, xCanvas, yCanvas);
        } else if (el.type === 'price') {
          const font = textFonts?.price || 'Raleway';
          ctx.font = `700 ${scaledFontSize}px "${font}", sans-serif`;
          ctx.letterSpacing = `${scaledLetterSpacing}px`;
          ctx.shadowColor = 'rgba(0,0,0,0.95)';
          ctx.shadowBlur = scaledFontSize * 0.4;
          ctx.shadowOffsetY = scaledFontSize * 0.06;
          ctx.fillText(el.text, xCanvas, yCanvas);
        }

        ctx.restore();
      }

      onProgress(60, 'Mapping elements', 'Text overlays drawn at full resolution');
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

      // Spot-sample text regions
      onProgress(80, 'Quality check', 'Sampling text regions…');
      await new Promise((r) => setTimeout(r, 100));
      let textRegionOk = false;
      const textEls = elements.filter((el) => el.type !== 'logo' && el.text);
      if (textEls.length > 0) {
        const sampleEl = textEls[0];
        const sampleX = Math.round(sampleEl.xPct * NW);
        const sampleY = Math.round(sampleEl.yPct * NH);
        const sampleSize = 40;
        const sx = Math.max(0, sampleX - sampleSize);
        const sy = Math.max(0, sampleY - sampleSize);
        const sw = Math.min(sampleSize * 2, NW - sx);
        const sh = Math.min(sampleSize * 2, NH - sy);
        if (sw > 0 && sh > 0) {
          try {
            const sampleData = ctx.getImageData(sx, sy, sw, sh);
            // Check that not all pixels are identical (would indicate blank/no text)
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
            textRegionOk = hasVariation;
          } catch {
            textRegionOk = true; // CORS issue — assume ok
          }
        } else {
          textRegionOk = true;
        }
      } else {
        textRegionOk = true; // No text elements — ok
      }

      if (!textRegionOk) {
        // Retry: re-draw text once more
        onProgress(82, 'Quality check', 'Text region appears blank — retrying draw…');
        await new Promise((r) => setTimeout(r, 400));
        // Re-draw text elements
        for (const el of elements.filter((e) => e.type !== 'logo' && e.text)) {
          const xCanvas = el.xPct * NW;
          const yCanvas = el.yPct * NH;
          const scaledFontSize = (CW * 0.024 * (el.fontScale ?? 1.0)) * scaleX;
          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = 'rgba(0,0,0,0.9)';
          ctx.shadowBlur = scaledFontSize * 0.4;
          if (el.type === 'newlisting') {
            ctx.font = `italic 400 ${scaledFontSize}px "${textFonts?.listingType || 'Cormorant Garamond'}", Georgia, serif`;
          } else if (el.type === 'address') {
            ctx.font = `700 ${scaledFontSize}px "${textFonts?.address || 'Libre Baskerville'}", sans-serif`;
          } else if (el.type === 'stats') {
            ctx.font = `600 ${scaledFontSize}px "${textFonts?.stats || 'Raleway'}", sans-serif`;
          } else if (el.type === 'price') {
            ctx.font = `700 ${scaledFontSize}px "${textFonts?.price || 'Raleway'}", sans-serif`;
          }
          ctx.fillText(el.text, xCanvas, yCanvas);
          ctx.restore();
        }
      }

      onProgress(86, 'Quality check', 'Checking element bounds…');
      await new Promise((r) => setTimeout(r, 100));
      for (const el of elements) {
        const xCanvas = el.xPct * NW;
        const yCanvas = el.yPct * NH;
        if (xCanvas < 0 || xCanvas > NW || yCanvas < 0 || yCanvas > NH) {
          throw new Error(`Element "${el.id}" is out of canvas bounds.`);
        }
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
  }), [
    elements, textFonts, selectedLogo, vignetteIntensity, backdropEnabled,
    backdropOpacity, bannerTopPct, bannerBotPct,
    processedLogoUrl, processedRedLogoUrl, processedFullWhiteUrl, processedFullRedUrl,
  ]);
  // ────────────────────────────────────────────────────────────────────────────

  // Deselect when clicking outside
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-overlay-el]')) return;
    setSelectedId(null);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    if (editingId === id) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(id);
    const el = elements.find((x) => x.id === id);
    if (!el || !containerRef.current) return;
    draggingRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      origXPct: el.xPct,
      origYPct: el.yPct,
    };
  }, [elements, editingId]);

  // Resize handle mouse down — works for logo (sizePx) and text (fontScale)
  const handleResizeMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const el = elements.find((x) => x.id === id);
    if (!el) return;
    const isText = el.type !== 'logo';
    resizingRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      origSize: isText ? (el.fontScale ?? 1.0) : (el.sizePx ?? 90),
      isText,
    };
  }, [elements]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      // Handle banner edge drag
      if (bannerDragRef.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const dy = (e.clientY - bannerDragRef.current.startY) / rect.height;
        const newPct = bannerDragRef.current.origPct + dy;
        if (bannerDragRef.current.edge === 'top') {
          setBannerTopPct(Math.min(bannerBotPct - 0.02, Math.max(0, newPct)));
        } else {
          setBannerBotPct(Math.max(bannerTopPct + 0.02, Math.min(1, newPct)));
        }
      }
      // Handle drag (reposition)
      if (draggingRef.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const dx = (e.clientX - draggingRef.current.startX) / rect.width;
        const dy = (e.clientY - draggingRef.current.startY) / rect.height;
        const newXPct = Math.min(1, Math.max(0, draggingRef.current.origXPct + dx));
        const newYPct = Math.min(1, Math.max(0, draggingRef.current.origYPct + dy));
        setElements((prev) =>
          prev.map((el) =>
            el.id === draggingRef.current!.id ? { ...el, xPct: newXPct, yPct: newYPct } : el
          )
        );
      }
      // Handle resize — logo uses sizePx, text uses fontScale
      if (resizingRef.current) {
        const dx = e.clientX - resizingRef.current.startX;
        const dy = e.clientY - resizingRef.current.startY;
        const delta = (dx + dy) / 2;
        if (resizingRef.current.isText) {
          // fontScale: delta of 100px = ±0.5 scale
          const newScale = Math.min(4.0, Math.max(0.3, resizingRef.current.origSize + delta / 200));
          setElements((prev) =>
            prev.map((el) =>
              el.id === resizingRef.current!.id ? { ...el, fontScale: newScale } : el
            )
          );
        } else {
          const newSize = Math.min(400, Math.max(40, resizingRef.current.origSize + delta));
          setElements((prev) =>
            prev.map((el) =>
              el.id === resizingRef.current!.id ? { ...el, sizePx: newSize } : el
            )
          );
        }
      }
    };
    const onMouseUp = () => {
      draggingRef.current = null;
      resizingRef.current = null;
      bannerDragRef.current = null;
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent, el: OverlayElement) => {
    if (el.type === 'logo') return;
    e.stopPropagation();
    setEditingId(el.id);
    setEditValue(el.text);
  }, []);

  const commitEdit = useCallback(() => {
    if (!editingId) return;
    setElements((prev) => {
      const next = prev.map((el) => (el.id === editingId ? { ...el, text: editValue } : el));
      pushHistory(next);
      setHistoryVersion((v) => v + 1);
      return next;
    });
    setEditingId(null);
  }, [editingId, editValue, pushHistory]);

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') setEditingId(null);
  };

  // Keyboard shortcuts: Ctrl+Z = undo, Ctrl+Y / Ctrl+Shift+Z = redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!previewReady) return;
      if (editingId) return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewReady, editingId, undo, redo]);

  const getElementStyle = (el: OverlayElement): React.CSSProperties => {
    return {
      position: 'absolute',
      left: `${el.xPct * 100}%`,
      top: `${el.yPct * 100}%`,
      transform: 'translate(-50%, -50%)',
      cursor: draggingRef.current?.id === el.id ? 'grabbing' : 'grab',
      userSelect: 'none',
      textAlign: 'center',
      whiteSpace: 'nowrap',
    };
  };

  // Shared resize handle rendered for any element type
  const renderResizeHandle = (el: OverlayElement, isSelected: boolean) => (
    <div
      title="Drag to resize"
      onMouseDown={(e) => handleResizeMouseDown(e, el.id)}
      style={{
        position: 'absolute',
        bottom: '-8px',
        right: '-8px',
        width: '18px',
        height: '18px',
        background: '#E8002A',
        border: '2px solid #fff',
        borderRadius: '3px',
        cursor: 'nwse-resize',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isSelected ? 1 : 0,
        transition: 'opacity 0.15s',
        zIndex: 10,
      }}
      className="group-hover:opacity-100"
    >
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
        <path d="M1 7L7 1M4 7L7 4M7 7L7 7" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    </div>
  );

  const renderElement = (el: OverlayElement) => {
    const isEditing = editingId === el.id;
    const isDragging = draggingRef.current?.id === el.id;
    const isSelected = selectedId === el.id;
    const wrapperClass = `group relative select-none ${isDragging ? 'opacity-90' : ''}`;
    const scale = el.fontScale ?? 1.0;

    const dragHint = (
      <span
        className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-white/60 bg-black/50 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        {el.type === 'logo' ? 'drag · corner to resize' : 'drag · corner to resize · dbl-click to edit'}
      </span>
    );

    if (el.type === 'logo') {
      const logoSize = el.sizePx ?? 90;
      // Pick the correct processed logo URL based on selectedLogo
      let activeLogoUrl: string | null = null;
      let fallbackSrc: string;
      let isFullLogo = false;

      if (selectedLogo === 'red-a') {
        activeLogoUrl = processedRedLogoUrl;
        fallbackSrc = '/assets/images/Untitled_design-2-1773172295962.png';
      } else if (selectedLogo === 'white-full') {
        activeLogoUrl = processedFullWhiteUrl;
        fallbackSrc = '/assets/images/image-1773162561184.png';
        isFullLogo = true;
      } else if (selectedLogo === 'red-full') {
        activeLogoUrl = processedFullRedUrl;
        fallbackSrc = '/assets/images/image-1773162561184.png';
        isFullLogo = true;
      } else {
        // white-a (default)
        activeLogoUrl = processedLogoUrl;
        fallbackSrc = '/assets/images/Untitled_design-1773170239278.png';
      }

      return (
        <div
          key={el.id}
          data-overlay-el="true"
          data-el-id={el.id}
          style={getElementStyle(el)}
          className={wrapperClass}
          onMouseDown={(e) => handleMouseDown(e, el.id)}
        >
          {dragHint}
          {/* Selection ring */}
          {isSelected && (
            <div
              style={{
                position: 'absolute',
                inset: '-6px',
                border: '2px dashed rgba(232,0,42,0.7)',
                borderRadius: '4px',
                pointerEvents: 'none',
              }}
            />
          )}
          {activeLogoUrl ? (
            <img
              src={activeLogoUrl}
              alt="The Agency logo"
              style={{
                height: `${logoSize}px`,
                width: isFullLogo ? 'auto' : 'auto',
                maxWidth: isFullLogo ? `${logoSize * 4}px` : undefined,
                display: 'block',
                pointerEvents: 'none',
              }}
              draggable={false}
            />
          ) : (
            <img
              src={fallbackSrc}
              alt="The Agency logo"
              style={{
                height: `${logoSize}px`,
                width: 'auto',
                display: 'block',
                pointerEvents: 'none',
                mixBlendMode: (selectedLogo === 'red-a' || selectedLogo === 'red-full') ? 'normal' : 'screen',
                filter: (selectedLogo === 'red-a' || selectedLogo === 'red-full') ? 'none' : 'invert(1)',
              }}
              draggable={false}
            />
          )}
          {/* Resize handle */}
          <div
            title="Drag to resize"
            onMouseDown={(e) => handleResizeMouseDown(e, el.id)}
            style={{
              position: 'absolute',
              bottom: '-8px',
              right: '-8px',
              width: '18px',
              height: '18px',
              background: '#E8002A',
              border: '2px solid #fff',
              borderRadius: '3px',
              cursor: 'nwse-resize',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isSelected ? 1 : 0,
              transition: 'opacity 0.15s',
              zIndex: 10,
            }}
            className="group-hover:opacity-100"
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1 7L7 1M4 7L7 4M7 7L7 7" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
      );
    }

    if (el.type === 'newlisting') {
      const listingFont = textFonts?.listingType || 'Cormorant Garamond';
      return (
        <div
          key={el.id}
          data-overlay-el="true"
          data-el-id={el.id}
          style={getElementStyle(el)}
          className={wrapperClass}
          onMouseDown={(e) => handleMouseDown(e, el.id)}
          onDoubleClick={(e) => handleDoubleClick(e, el)}
        >
          {dragHint}
          {isEditing ? (
            <input
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleEditKeyDown}
              onClick={(e) => e.stopPropagation()}
              style={{
                fontFamily: `"${listingFont}", Georgia, "Times New Roman", serif`,
                fontSize: `${2.4 * scale}rem`,
                fontStyle: 'italic',
                fontWeight: 400,
                color: '#fff',
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.5)',
                borderRadius: '4px',
                padding: '2px 8px',
                textAlign: 'center',
                outline: 'none',
                width: '260px',
              }}
            />
          ) : (
            <span
              data-text-span="true"
              style={{
                fontFamily: `"${listingFont}", Georgia, "Times New Roman", serif`,
                fontSize: `${2.4 * scale}rem`,
                fontStyle: 'italic',
                fontWeight: 400,
                color: '#fff',
                textShadow: '0 2px 16px rgba(0,0,0,0.9), 0 1px 4px rgba(0,0,0,0.8)',
                display: 'block',
                lineHeight: 1.1,
              }}
            >
              {el.text}
            </span>
          )}
          {renderResizeHandle(el, isSelected)}
        </div>
      );
    }

    if (el.type === 'address') {
      const addressFont = textFonts?.address || 'Libre Baskerville';
      return (
        <div
          key={el.id}
          data-overlay-el="true"
          data-el-id={el.id}
          style={getElementStyle(el)}
          className={wrapperClass}
          onMouseDown={(e) => handleMouseDown(e, el.id)}
          onDoubleClick={(e) => handleDoubleClick(e, el)}
        >
          {dragHint}
          {isEditing ? (
            <input
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleEditKeyDown}
              onClick={(e) => e.stopPropagation()}
              style={{
                fontFamily: `"${addressFont}", "Helvetica Neue", Arial, sans-serif`,
                fontSize: `${1.05 * scale}rem`,
                fontStyle: 'normal',
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: '#fff',
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.5)',
                borderRadius: '4px',
                padding: '2px 8px',
                textAlign: 'center',
                outline: 'none',
                width: '320px',
              }}
            />
          ) : (
            <span
              data-text-span="true"
              style={{
                fontFamily: `"${addressFont}", "Helvetica Neue", Arial, sans-serif`,
                fontSize: `${1.05 * scale}rem`,
                fontStyle: 'normal',
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: '#fff',
                textShadow: '0 2px 12px rgba(0,0,0,0.95), 0 1px 4px rgba(0,0,0,0.9)',
                display: 'block',
                textTransform: 'uppercase',
              }}
            >
              {el.text}
            </span>
          )}
          {renderResizeHandle(el, isSelected)}
        </div>
      );
    }

    if (el.type === 'stats') {
      const statsFont = textFonts?.stats || 'Raleway';
      return (
        <div
          key={el.id}
          data-overlay-el="true"
          data-el-id={el.id}
          style={getElementStyle(el)}
          className={wrapperClass}
          onMouseDown={(e) => handleMouseDown(e, el.id)}
          onDoubleClick={(e) => handleDoubleClick(e, el)}
        >
          {dragHint}
          {isEditing ? (
            <input
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleEditKeyDown}
              onClick={(e) => e.stopPropagation()}
              style={{
                fontFamily: `"${statsFont}", "Helvetica Neue", Arial, sans-serif`,
                fontSize: `${0.85 * scale}rem`,
                fontStyle: 'normal',
                fontWeight: 600,
                color: '#ffffff',
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.5)',
                borderRadius: '4px',
                padding: '2px 8px',
                textAlign: 'center',
                outline: 'none',
                width: '300px',
              }}
            />
          ) : (
            <span
              data-text-span="true"
              style={{
                fontFamily: `"${statsFont}", "Helvetica Neue", Arial, sans-serif`,
                fontSize: `${0.85 * scale}rem`,
                fontStyle: 'normal',
                fontWeight: 600,
                color: '#ffffff',
                textShadow: '0 1px 8px rgba(0,0,0,0.95), 0 1px 3px rgba(0,0,0,0.9)',
                display: 'block',
              }}
            >
              {el.text}
            </span>
          )}
          {renderResizeHandle(el, isSelected)}
        </div>
      );
    }

    if (el.type === 'price') {
      if (!el.text) return null;
      const priceFont = textFonts?.price || 'Raleway';
      return (
        <div
          key={el.id}
          data-overlay-el="true"
          data-el-id={el.id}
          style={getElementStyle(el)}
          className={wrapperClass}
          onMouseDown={(e) => handleMouseDown(e, el.id)}
          onDoubleClick={(e) => handleDoubleClick(e, el)}
        >
          {dragHint}
          {isEditing ? (
            <input
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleEditKeyDown}
              onClick={(e) => e.stopPropagation()}
              style={{
                fontFamily: `"${priceFont}", "Helvetica Neue", Arial, sans-serif`,
                fontSize: `${0.95 * scale}rem`,
                fontStyle: 'normal',
                fontWeight: 700,
                color: '#ffffff',
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.5)',
                borderRadius: '4px',
                padding: '2px 8px',
                textAlign: 'center',
                outline: 'none',
                width: '260px',
              }}
            />
          ) : (
            <span
              data-text-span="true"
              style={{
                fontFamily: `"${priceFont}", "Helvetica Neue", Arial, sans-serif`,
                fontSize: `${0.95 * scale}rem`,
                fontStyle: 'normal',
                fontWeight: 700,
                color: '#ffffff',
                textShadow: '0 1px 10px rgba(0,0,0,0.95), 0 1px 3px rgba(0,0,0,0.9)',
                display: 'block',
              }}
            >
              {el.text}
            </span>
          )}
          {renderResizeHandle(el, isSelected)}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="rounded-lg border border-white/10 bg-[#1A1A1A] p-5 flex flex-col">
      <h2
        className="text-white mb-4 uppercase tracking-widest"
        style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', letterSpacing: '0.12em', fontWeight: 600 }}
      >
        Branded Preview
      </h2>

      {previewReady && (
        <p className="text-[#B8B8B8] text-xs mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
          <Icon name="CursorArrowRaysIcon" size={12} variant="outline" className="inline mr-1 text-[#E8002A]" />
          Drag elements to reposition · Double-click text to edit · Click any element then drag corner to resize
        </p>
      )}

      {/* Undo / Redo buttons */}
      {previewReady && (
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={undo}
            disabled={historyVersion >= 0 && historyIndexRef.current <= 0}
            title="Undo (Ctrl+Z)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              fontFamily: 'Inter, sans-serif',
              background: historyIndexRef.current > 0 ? 'rgba(232,0,42,0.12)' : 'rgba(255,255,255,0.05)',
              color: historyIndexRef.current > 0 ? '#E8002A' : '#888',
              border: `1px solid ${historyIndexRef.current > 0 ? 'rgba(232,0,42,0.35)' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            <Icon name="ArrowUturnLeftIcon" size={13} variant="outline" />
            Undo
          </button>
          <button
            onClick={redo}
            disabled={historyVersion >= 0 && historyIndexRef.current >= historyRef.current.length - 1}
            title="Redo (Ctrl+Y)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              fontFamily: 'Inter, sans-serif',
              background: historyIndexRef.current < historyRef.current.length - 1 ? 'rgba(232,0,42,0.12)' : 'rgba(255,255,255,0.05)',
              color: historyIndexRef.current < historyRef.current.length - 1 ? '#E8002A' : '#888',
              border: `1px solid ${historyIndexRef.current < historyRef.current.length - 1 ? 'rgba(232,0,42,0.35)' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            <Icon name="ArrowUturnRightIcon" size={13} variant="outline" />
            Redo
          </button>
          <span className="text-[10px] text-white/25 ml-1" style={{ fontFamily: 'Inter, sans-serif' }}>
            Ctrl+Z / Ctrl+Y
          </span>
        </div>
      )}

      {/* Preview container — relative so overlays align to it */}
      <div
        ref={containerRef}
        className="relative w-full rounded-lg overflow-hidden bg-[#111111] border border-white/10"
        style={{ minHeight: previewReady ? undefined : '300px' }}
        onClick={handleContainerClick}
      >
        {previewReady ? (
          <div ref={previewDivRef} className="relative w-full">
            {/* Canvas base layer — sets the container height via h-auto */}
            <canvas
              ref={canvasRef}
              className="w-full h-auto block"
              aria-label="Branded property marketing image preview"
            />
            {/* HTML overlay elements — inset-0 anchors to the relative container */}
            <div
              className="absolute inset-0"
              style={{ pointerEvents: 'none' }}
            >
              {/* Translucent black backdrop banner behind all overlay elements */}
              {backdropEnabled && elements.length > 0 && (
                <>
                  {/* Banner fill */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: `${bannerTopPct * 100}%`,
                      height: `${(bannerBotPct - bannerTopPct) * 100}%`,
                      background: `rgba(0,0,0,${(backdropOpacity / 100).toFixed(3)})`,
                      pointerEvents: 'none',
                    }}
                  />
                  {/* Top drag handle */}
                  <div
                    data-overlay-el="true"
                    onMouseDown={(e) => handleBannerEdgeMouseDown(e, 'top')}
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: `${bannerTopPct * 100}%`,
                      height: '10px',
                      transform: 'translateY(-50%)',
                      cursor: 'ns-resize',
                      pointerEvents: 'auto',
                      zIndex: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '48px',
                        height: '4px',
                        borderRadius: '2px',
                        background: 'rgba(232,0,42,0.85)',
                        border: '1px solid rgba(255,255,255,0.6)',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
                      }}
                    />
                  </div>
                  {/* Bottom drag handle */}
                  <div
                    data-overlay-el="true"
                    onMouseDown={(e) => handleBannerEdgeMouseDown(e, 'bottom')}
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: `${bannerBotPct * 100}%`,
                      height: '10px',
                      transform: 'translateY(-50%)',
                      cursor: 'ns-resize',
                      pointerEvents: 'auto',
                      zIndex: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '48px',
                        height: '4px',
                        borderRadius: '2px',
                        background: 'rgba(232,0,42,0.85)',
                        border: '1px solid rgba(255,255,255,0.6)',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
                      }}
                    />
                  </div>
                </>
              )}
              <div
                className="absolute inset-0"
                style={{ pointerEvents: 'auto' }}
              >
                {elements.map((el) => renderElement(el))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Hidden canvas kept in DOM so ref is valid */}
            <canvas
              ref={canvasRef}
              className="hidden"
              aria-hidden="true"
            />
            {/* Placeholder states */}
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
          Overlay applied successfully. Ready to download.
        </div>
      )}

      {/* Vignette slider */}
      {previewReady && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="vignette-slider"
              className="text-xs font-semibold uppercase tracking-widest text-[#B8B8B8]"
              style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '0.12em' }}
            >
              Vignette
            </label>
            <span
              className="text-xs text-white/70 tabular-nums"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {vignetteIntensity}
            </span>
          </div>
          <input
            id="vignette-slider"
            type="range"
            min={0}
            max={100}
            step={1}
            value={vignetteIntensity}
            onChange={(e) => setVignetteIntensity(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{
              accentColor: '#E8002A',
              background: `linear-gradient(to right, #E8002A ${vignetteIntensity}%, rgba(255,255,255,0.15) ${vignetteIntensity}%)`,
            }}
          />
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-white/30" style={{ fontFamily: 'Inter, sans-serif' }}>Off</span>
            <span className="text-[10px] text-white/30" style={{ fontFamily: 'Inter, sans-serif' }}>Max</span>
          </div>
        </div>
      )}

      {/* Text Backdrop toggle + opacity slider */}
      {previewReady && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-xs font-semibold uppercase tracking-widest text-[#B8B8B8]"
              style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '0.12em' }}
            >
              Text Backdrop
            </span>
            {/* Toggle switch */}
            <button
              type="button"
              role="switch"
              aria-checked={backdropEnabled}
              onClick={handleToggleBackdrop}
              className="relative inline-flex items-center rounded-full transition-colors duration-200 focus:outline-none"
              style={{
                width: '40px',
                height: '22px',
                background: backdropEnabled ? '#E8002A' : 'rgba(255,255,255,0.15)',
                flexShrink: 0,
              }}
              title={backdropEnabled ? 'Disable backdrop' : 'Enable backdrop'}
            >
              <span
                style={{
                  position: 'absolute',
                  top: '3px',
                  left: backdropEnabled ? '21px' : '3px',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                }}
              />
            </button>
          </div>
          {backdropEnabled && (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-white/50" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Opacity
                </span>
                <span className="text-xs text-white/70 tabular-nums" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {backdropOpacity}%
                </span>
              </div>
              <input
                id="backdrop-opacity-slider"
                type="range"
                min={0}
                max={100}
                step={1}
                value={backdropOpacity}
                onChange={(e) => setBackdropOpacity(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  accentColor: '#E8002A',
                  background: `linear-gradient(to right, #E8002A ${backdropOpacity}%, rgba(255,255,255,0.15) ${backdropOpacity}%)`,
                }}
              />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-white/30" style={{ fontFamily: 'Inter, sans-serif' }}>Transparent</span>
                <span className="text-[10px] text-white/30" style={{ fontFamily: 'Inter, sans-serif' }}>Solid</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
});

export default CanvasPreview;