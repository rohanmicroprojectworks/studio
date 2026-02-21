/**
 * @fileoverview Enhanced PSD Processing Service
 * Responsibility: Handle high-fidelity PSD parsing using composite canvas extraction.
 * Author: GlassPDF Team
 * License: MIT
 */

import { readPsd } from 'ag-psd';
import { PDFDocument } from 'pdf-lib';

/**
 * Parses a PSD file and returns its composite (flattened) canvas.
 * This method is significantly faster and more compatible than layer-by-layer rendering.
 */
export const renderPSDToCanvas = async (file: File): Promise<HTMLCanvasElement> => {
  const buffer = await file.arrayBuffer();
  try {
    // readCanvas: true extracts the pre-rendered flattened image stored in the PSD.
    // skipLayerImageData: true avoids slow parsing of individual layers.
    const psd = readPsd(buffer, { 
      readCanvas: true, 
      skipLayerImageData: true, 
      skipThumbnail: true 
    });
    
    if (!psd.canvas) {
      throw new Error('This PSD does not contain a composite image. Ensure it was saved with "Maximize Compatibility" enabled.');
    }
    
    return psd.canvas;
  } catch (error: any) {
    console.error('[PSD Service] Parsing failure:', error);
    throw new Error(error.message || 'The file structure is incompatible with browser-native rendering.');
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
