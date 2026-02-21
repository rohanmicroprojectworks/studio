
/**
 * @fileoverview High-Performance PSD Processing Service
 * Responsibility: Dual-engine fallback system (ag-psd + PSD.js) for max compatibility.
 * Author: GlassPDF Team
 * License: MIT
 */

import { readPsd } from 'ag-psd';
import { PDFDocument } from 'pdf-lib';

/**
 * Parses a PSD file using a robust dual-engine fallback system.
 * 1. Tries ag-psd (Fast engine) with strictly composite canvas reading.
 * 2. If ag-psd fails (e.g. layer mask data), falls back to PSD.js (Compatibility engine).
 */
export const renderPSDToCanvas = async (file: File): Promise<HTMLCanvasElement> => {
  const buffer = await file.arrayBuffer();

  // Try Fast Engine (ag-psd) - Optimized for Composite Canvas
  try {
    const psd = readPsd(buffer, { 
      readCanvas: true, 
      readLayers: false,
      skipLayerImageData: true,
      skipThumbnail: true
    });
    if (psd.canvas) return psd.canvas;
  } catch (error) {
    console.warn('[PSD Service] Fast engine failed, switching to compatibility fallback...');
  }

  // Fallback to Compatibility Engine (PSD.js / 'psd' package)
  try {
    // Dynamic import to avoid Turbopack coffee-script conflicts during static analysis
    const PSDModule = await import('psd');
    const PSD = PSDModule.default || PSDModule;
    const psdInstance = new (PSD as any)(new Uint8Array(buffer));
    psdInstance.parse();
    const canvas = psdInstance.image.toCanvas();
    if (canvas) return canvas;
    throw new Error('Fallback engine returned empty canvas');
  } catch (error) {
    console.error('[PSD Service] All engines failed:', error);
    throw new Error('Complex PSD data detected. Ensure "Maximize Compatibility" was enabled in Photoshop.');
  }
};

/**
 * Exports a canvas as a high-quality image file.
 */
export const exportCanvasAsImage = (canvas: HTMLCanvasElement, format: 'png' | 'jpg', fileName: string) => {
  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
  const extension = format === 'png' ? 'png' : 'jpg';
  
  canvas.toBlob((blob) => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName.split('.')[0]}.${extension}`;
      link.click();
      URL.revokeObjectURL(url);
    }
  }, mimeType, 0.95);
};

/**
 * Converts a PSD render to an optimized PDF document.
 */
export const exportCanvasAsPDF = async (canvas: HTMLCanvasElement, fileName: string): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.create();
  
  // High-quality JPEG embedding for the PDF container
  const imgData = canvas.toDataURL('image/jpeg', 0.92);
  const imgBytes = await fetch(imgData).then(res => res.arrayBuffer());
  const img = await pdfDoc.embedJpg(imgBytes);
  
  const page = pdfDoc.addPage([img.width, img.height]);
  page.drawImage(img, {
    x: 0,
    y: 0,
    width: img.width,
    height: img.height,
  });
  
  return await pdfDoc.save({ 
    useObjectStreams: true,
    objectsPerStream: 50 
  });
};
