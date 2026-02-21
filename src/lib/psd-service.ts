
/**
 * @fileoverview Universal PSD Processing Service
 * Responsibility: High-fidelity PSD rendering with full layer composition, resilient parsing, and format export.
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
 * Renders any PSD file to a canvas using a multi-engine fallback approach.
 * Target: Full compatibility without needing "Maximize Compatibility".
 */
export const renderPSDToCanvas = async (file: File): Promise<HTMLCanvasElement> => {
  const buffer = await file.arrayBuffer();

  // Signature Validation
  const view = new DataView(buffer);
  if (buffer.byteLength >= 4) {
    const signature = view.getUint32(0);
    if (signature === 0x25504446) { // %PDF
      throw new Error('This is a PDF file. Please use the PDF Viewer tool to open it.');
    }
    if (signature !== 0x38425053) { // 8BPS
      throw new Error('Invalid PSD file signature. Please upload a valid Photoshop (.psd) document.');
    }
  }

  let psd: Psd;

  try {
    // Attempt 1: Full High-Fidelity Read
    psd = readPsd(buffer, { 
      readCanvas: true, 
      readLayers: true,
      skipLayerImageData: false,
      skipCompositeImageData: false,
      skipThumbnail: true
    });
  } catch (error: any) {
    // Attempt 2: Fallback if layer masks are problematic (common "Not Implemented" crash site)
    if (error.message?.includes('layer mask data') || error.message?.includes('Not Implemented')) {
      try {
        psd = readPsd(buffer, { 
          readCanvas: true, 
          readLayers: true,
          skipLayerImageData: false,
          skipCompositeImageData: false,
          skipLayerMasks: true, // Bypass the problematic section
          skipThumbnail: true
        });
      } catch (fallbackError) {
        throw new Error('This PSD structure is currently unsupported by our browser-native engine.');
      }
    } else {
      throw error;
    }
  }

  // Priority 1: Use the pre-rendered composite canvas if available
  if (psd.canvas) {
    return psd.canvas;
  }

  // Priority 2: Manual Composition (Fallback for files without Maximize Compatibility)
  if (psd.children && psd.children.length > 0) {
    const canvas = document.createElement('canvas');
    canvas.width = psd.width;
    canvas.height = psd.height;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Clear canvas for transparency
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Recursive compositor for layer hierarchy
      const renderLayerStack = (layers: any[]) => {
        // PSD layers are stored top-to-bottom, so we draw backwards (bottom-up)
        for (let i = layers.length - 1; i >= 0; i--) {
          const layer = layers[i];
          
          if (layer.hidden) continue;

          // Handle Groups/Folders
          if (layer.children) {
            renderLayerStack(layer.children);
            continue;
          }

          // Draw layer image data
          if (layer.canvas) {
            const layerCanvas = layer.canvas;
            const left = layer.left || 0;
            const top = layer.top || 0;

            ctx.save();
            
            // Apply opacity
            ctx.globalAlpha = (layer.opacity ?? 255) / 255;
            
            // Apply Blend Mode mapping
            const blendMode = layer.blendMode || 'norm';
            ctx.globalCompositeOperation = BLEND_MODE_MAP[blendMode] || 'source-over';
            
            ctx.drawImage(layerCanvas, left, top);
            ctx.restore();
          }
        }
      };
      
      renderLayerStack(psd.children);
      return canvas;
    }
  }
  
  throw new Error('The document contains no renderable image data. Ensure your layers are visible.');
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
  
  // Use high-quality JPEG for the PDF container to balance size and quality
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
