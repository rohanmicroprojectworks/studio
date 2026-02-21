
/**
 * @fileoverview PSD Processing Service
 * Responsibility: Handle PSD parsing and conversion using ag-psd and native canvas APIs.
 * Author: GlassPDF Team
 * License: MIT
 */

import { readPsd, drawPsd } from 'ag-psd';
import { PDFDocument } from 'pdf-lib';

/**
 * Parses a PSD file and returns a canvas containing the flattened preview.
 */
export const renderPSDToCanvas = async (file: File): Promise<HTMLCanvasElement> => {
  const buffer = await file.arrayBuffer();
  try {
    // Read the PSD structure
    const psd = readPsd(buffer, { skipLayerImageData: true, skipThumbnail: true });
    
    // Create a target canvas
    const canvas = document.createElement('canvas');
    canvas.width = psd.width;
    canvas.height = psd.height;
    
    // Draw the PSD composite onto the canvas
    drawPsd(psd, canvas);
    
    return canvas;
  } catch (error) {
    console.error('[PSD Service] Render failed:', error);
    throw new Error('Could not parse PSD file. It may be using an unsupported feature or version.');
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
 * Converts a PSD render to a PDF document.
 */
export const exportCanvasAsPDF = async (canvas: HTMLCanvasElement, fileName: string): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.create();
  
  // Convert canvas to image bytes
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const imgBytes = await fetch(imgData).then(res => res.arrayBuffer());
  const img = await pdfDoc.embedJpg(imgBytes);
  
  // Add page matched to image dimensions
  const page = pdfDoc.addPage([img.width, img.height]);
  page.drawImage(img, {
    x: 0,
    y: 0,
    width: img.width,
    height: img.height,
  });
  
  return await pdfDoc.save();
};
