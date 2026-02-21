
/**
 * @fileoverview Robust Multi-Engine PSD Processing Service
 * Responsibility: High-fidelity PSD parsing with a multi-engine fallback system (ag-psd -> PSD.js).
 * Author: GlassPDF Team
 * License: MIT
 */

import { readPsd } from 'ag-psd';
import PSD from 'psd';
import { PDFDocument } from 'pdf-lib';

/**
 * Parses a PSD file and returns its composite (flattened) canvas.
 * Implements a dual-engine fallback system to ensure maximum compatibility.
 */
export const renderPSDToCanvas = async (file: File): Promise<HTMLCanvasElement> => {
  const buffer = await file.arrayBuffer();

  // Engine 1: ag-psd (Primary, faster for modern standard PSDs)
  try {
    const psd = readPsd(buffer, { 
      readCanvas: true, 
      readLayers: false,
      skipLayerImageData: true,
      skipThumbnail: true
    });
    
    if (psd.canvas) return psd.canvas;
  } catch (agError) {
    console.warn('[PSD Service] Primary engine (ag-psd) failed, trying fallback engine...', agError);
  }

  // Engine 2: PSD.js (Compatibility Fallback for complex metadata/layer structures)
  try {
    const psd = new PSD(new Uint8Array(buffer));
    psd.parse();
    const canvas = psd.image.toCanvas();
    
    if (canvas) return canvas;
    throw new Error('Canvas extraction failed in fallback engine.');
  } catch (psdError) {
    console.error('[PSD Service] Fallback engine (PSD.js) also failed:', psdError);
    throw new Error('This PSD is highly complex or missing a flattened composite image. Please ensure "Maximize Compatibility" is enabled in Photoshop.');
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
  
  // Convert canvas to image bytes (JPEG for better compression in PDF container)
  const imgData = canvas.toDataURL('image/jpeg', 0.90);
  const imgBytes = await fetch(imgData).then(res => res.arrayBuffer());
  const img = await pdfDoc.embedJpg(imgBytes);
  
  const page = pdfDoc.addPage([img.width, img.height]);
  page.drawImage(img, {
    x: 0,
    y: 0,
    width: img.width,
    height: img.height,
  });
  
  return await pdfDoc.save({ useObjectStreams: true });
};
