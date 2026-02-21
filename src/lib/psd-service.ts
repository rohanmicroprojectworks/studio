
/**
 * @fileoverview High-Performance PSD Processing Service
 * Responsibility: Robust PSD rendering with composite extraction.
 * Author: GlassPDF Team
 * License: MIT
 */

import { readPsd } from 'ag-psd';
import { PDFDocument } from 'pdf-lib';

/**
 * Parses a PSD file using a robust engine optimized for composite canvas reading.
 * By targeting the composite image directly, we bypass complex layer data (like masks)
 * that might be unsupported in browser-native contexts.
 */
export const renderPSDToCanvas = async (file: File): Promise<HTMLCanvasElement> => {
  const buffer = await file.arrayBuffer();

  try {
    const psd = readPsd(buffer, { 
      readCanvas: true, 
      readLayers: false,
      skipLayerImageData: true,
      skipThumbnail: true
    });
    
    if (psd.canvas) {
      return psd.canvas;
    }
    
    throw new Error('PSD file does not contain a valid composite image. Please ensure "Maximize Compatibility" was enabled when saving.');
  } catch (error: any) {
    console.error('[PSD Service] Render failed:', error);
    throw new Error(error.message || 'Failed to process PSD. Ensure the file is not corrupted.');
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
