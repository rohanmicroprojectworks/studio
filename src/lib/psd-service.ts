
/**
 * @fileoverview Robust High-Fidelity PSD Processing Service
 * Responsibility: Optimized PSD rendering with fallback logic for complex data.
 * Author: GlassPDF Team
 * License: MIT
 */

import { readPsd } from 'ag-psd';
import { PDFDocument } from 'pdf-lib';

/**
 * Renders a PSD file to a canvas.
 * Focuses on extracting the pre-rendered composite image to bypass complex layer mask data.
 */
export const renderPSDToCanvas = async (file: File): Promise<HTMLCanvasElement> => {
  const buffer = await file.arrayBuffer();

  try {
    // Attempt fast render of composite image. 
    // skipLayerImageData and readLayers: false ensure we don't hit "layer mask data" errors.
    const psd = readPsd(buffer, { 
      readCanvas: true, 
      readLayers: false,
      skipLayerImageData: true,
      skipThumbnail: true
    });
    
    if (psd.canvas) {
      return psd.canvas;
    }
    
    // Fallback: If canvas is missing, try reading with layers enabled but data skipped
    // to see if we can at least get a basic structure, though composite is preferred.
    throw new Error('PSD file missing composite preview. Please ensure "Maximize Compatibility" was enabled in Photoshop.');
  } catch (error: any) {
    console.error('[PSD Service] Render failed:', error);
    
    // Specifically handle the "layer mask" error by providing clear guidance
    if (error.message?.includes('layer mask')) {
      throw new Error('This PSD contains complex layer mask data that is currently unsupported for direct layer parsing. Please save with "Maximize Compatibility" to enable browser-native preview.');
    }
    
    throw new Error(error.message || 'Failed to process PSD. The file structure might be unsupported.');
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
