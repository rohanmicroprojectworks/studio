
/**
 * @fileoverview High-Performance PSD Processing Service
 * Responsibility: Browser-native PSD parsing using ag-psd, optimized for composite rendering.
 * Author: GlassPDF Team
 * License: MIT
 */

import { readPsd } from 'ag-psd';
import { PDFDocument } from 'pdf-lib';

/**
 * Parses a PSD file and returns its composite (flattened) canvas.
 * Configured to bypass complex layer data and strictly target the flattened preview.
 */
export const renderPSDToCanvas = async (file: File): Promise<HTMLCanvasElement> => {
  const buffer = await file.arrayBuffer();

  try {
    // We only need the composite image (canvas). 
    // skipLayerImageData and skipThumbnail are set to true to increase performance and avoid parsing errors.
    const psd = readPsd(buffer, { 
      readCanvas: true, 
      readLayers: false,
      skipLayerImageData: true,
      skipThumbnail: true
    });
    
    if (psd.canvas) {
      return psd.canvas;
    }
    
    throw new Error('No composite image found in this PSD. Ensure "Maximize Compatibility" is enabled in Photoshop.');
  } catch (error: any) {
    console.error('[PSD Service] Rendering failed:', error);
    // If ag-psd specifically reports an implementation gap, provide a more helpful message.
    if (error?.message?.includes('Not Implemented')) {
      throw new Error('This PSD contains complex features (like specific layer masks) that require "Maximize Compatibility" to be enabled during save for browser preview.');
    }
    throw error;
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
  
  // Use JPEG for PDF embedding to balance quality and file size
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
  
  return await pdfDoc.save({ 
    useObjectStreams: true,
    objectsPerStream: 50 
  });
};
