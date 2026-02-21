
/**
 * @fileoverview Resilient Universal PSD Processing Service
 * Responsibility: High-fidelity PSD rendering with multi-stage fallback for maximum compatibility.
 * Author: GlassPDF Team
 * License: MIT
 */

import { readPsd, Psd } from 'ag-psd';
import { PDFDocument } from 'pdf-lib';

/**
 * Mapping of PSD blend mode keys to HTML5 Canvas composite operations.
 */
const BLEND_MODE_MAP: Record<string, GlobalCompositeOperation> = {
  'norm': 'source-over',
  'mult': 'multiply',
  'scrn': 'screen',
  'over': 'overlay',
  'dark': 'darken',
  'lite': 'lighten',
  'colD': 'color-dodge',
  'colB': 'color-burn',
  'hLit': 'hard-light',
  'sLit': 'soft-light',
  'diff': 'difference',
  'excl': 'exclusion',
  'hue ': 'hue',
  'sat ': 'saturation',
  'colr': 'color',
  'lum ': 'luminosity',
};

/**
 * Renders any PSD file to a canvas using an aggressive multi-stage fallback strategy.
 * This approach ensures that even "corrupt" or complex files saved without compatibility can open.
 */
export const renderPSDToCanvas = async (file: File): Promise<HTMLCanvasElement> => {
  const buffer = await file.arrayBuffer();

  // Signature Validation
  const view = new DataView(buffer);
  if (buffer.byteLength >= 4) {
    const signature = view.getUint32(0);
    if (signature === 0x25504446) { // %PDF
      throw new Error('This is a PDF file. Use the PDF Viewer tool.');
    }
    if (signature !== 0x38425053) { // 8BPS
      throw new Error('Invalid PSD signature. Please upload a valid Photoshop document.');
    }
  }

  let psd: Psd | null = null;
  let errorMsg = '';

  // Stage 1: High Fidelity (Full layers + Canvas)
  try {
    psd = readPsd(buffer, { 
      readCanvas: true, 
      readLayers: true,
      skipLayerImageData: false,
      skipCompositeImageData: false,
      skipThumbnail: true
    });
  } catch (err: any) {
    errorMsg = err.message || '';
    
    // Stage 2: Resilient Layer Read (Skip problematic mask data)
    try {
      psd = readPsd(buffer, { 
        readCanvas: true, 
        readLayers: true,
        skipLayerImageData: false,
        skipLayerMasks: true, // Common crash point
        skipThumbnail: true
      });
    } catch (err2) {
      // Stage 3: Composite Only (Highest success rate)
      try {
        psd = readPsd(buffer, { 
          readCanvas: true, 
          readLayers: false, // Don't even try to parse layers
          skipThumbnail: true
        });
      } catch (err3) {
        throw new Error('This PSD structure is extremely complex and cannot be parsed by the local engine.');
      }
    }
  }

  if (!psd) throw new Error('Failed to parse document data.');

  // Priority 1: Use the pre-rendered composite canvas if available
  if (psd.canvas) {
    return psd.canvas;
  }

  // Priority 2: Manual Composition from Layer Stack
  if (psd.children && psd.children.length > 0) {
    const canvas = document.createElement('canvas');
    canvas.width = psd.width;
    canvas.height = psd.height;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const renderLayerStack = (layers: any[]) => {
        // Draw bottom-up
        for (let i = layers.length - 1; i >= 0; i--) {
          const layer = layers[i];
          if (layer.hidden) continue;

          if (layer.children) {
            renderLayerStack(layer.children);
            continue;
          }

          if (layer.canvas) {
            ctx.save();
            ctx.globalAlpha = (layer.opacity ?? 255) / 255;
            const blendMode = layer.blendMode || 'norm';
            ctx.globalCompositeOperation = BLEND_MODE_MAP[blendMode] || 'source-over';
            ctx.drawImage(layer.canvas, layer.left || 0, layer.top || 0);
            ctx.restore();
          }
        }
      };
      
      renderLayerStack(psd.children);
      return canvas;
    }
  }
  
  throw new Error('The document contains no renderable image data.');
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
  const imgData = canvas.toDataURL('image/jpeg', 0.92);
  const imgBytes = await fetch(imgData).then(res => res.arrayBuffer());
  const img = await pdfDoc.embedJpg(imgBytes);
  
  const page = pdfDoc.addPage([img.width, img.height]);
  page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  
  return await pdfDoc.save({ useObjectStreams: true, objectsPerStream: 50 });
};
