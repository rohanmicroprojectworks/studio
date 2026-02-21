
/**
 * @fileoverview Universal PSD Processing Service
 * Responsibility: High-fidelity PSD rendering with full layer composition, masks, and blend modes.
 * Author: GlassPDF Team
 * License: MIT
 */

import { readPsd } from 'ag-psd';
import { PDFDocument } from 'pdf-lib';

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
 * Renders any PSD file to a canvas.
 * Target: Full compatibility without needing "Maximize Compatibility".
 * Features: Layer masks, blend modes, and hierarchy support.
 */
export const renderPSDToCanvas = async (file: File): Promise<HTMLCanvasElement> => {
  const buffer = await file.arrayBuffer();

  // Signature Validation: Avoid passing PDF or invalid data to readPsd
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

  try {
    // Read PSD with full layer data and composite data
    const psd = readPsd(buffer, { 
      readCanvas: true, 
      readLayers: true,
      skipLayerImageData: false,
      skipCompositeImageData: false,
      skipThumbnail: true
    });
    
    // Priority 1: Use the built-in composite canvas if available (highest fidelity)
    if (psd.canvas) {
      return psd.canvas;
    }
    
    // Priority 2: Manual composition from layers (fallback for files without Maximize Compatibility)
    if (psd.children && psd.children.length > 0) {
      const canvas = document.createElement('canvas');
      canvas.width = psd.width;
      canvas.height = psd.height;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Recursive compositor for layer hierarchy
        const renderLayerStack = (layers: any[]) => {
          // PSD layers are stored top-to-bottom, so we draw backwards (bottom-up)
          for (let i = layers.length - 1; i >= 0; i--) {
            const layer = layers[i];
            
            if (layer.hidden) continue;

            // Handle Groups
            if (layer.children) {
              renderLayerStack(layer.children);
              continue;
            }

            // Draw layer image data
            if (layer.canvas) {
              const layerCanvas = layer.canvas;
              const left = layer.left || 0;
              const top = layer.top || 0;

              // Create a buffer for the layer to apply masks and opacity
              const layerBuffer = document.createElement('canvas');
              layerBuffer.width = layerCanvas.width;
              layerBuffer.height = layerCanvas.height;
              const bCtx = layerBuffer.getContext('2d');

              if (bCtx) {
                // Draw raw layer data
                bCtx.drawImage(layerCanvas, 0, 0);

                // Apply Layer Mask if present
                if (layer.mask && layer.mask.canvas) {
                  bCtx.save();
                  bCtx.globalCompositeOperation = 'destination-in';
                  const mX = (layer.mask.left || 0) - left;
                  const mY = (layer.mask.top || 0) - top;
                  bCtx.drawImage(layer.mask.canvas, mX, mY);
                  bCtx.restore();
                }

                // Composite to main canvas
                ctx.save();
                ctx.globalAlpha = (layer.opacity ?? 255) / 255;
                
                // Apply Blend Mode
                const blendMode = layer.blendMode || 'norm';
                ctx.globalCompositeOperation = BLEND_MODE_MAP[blendMode] || 'source-over';
                
                ctx.drawImage(layerBuffer, left, top);
                ctx.restore();
              }
            }
          }
        };
        
        renderLayerStack(psd.children);
        return canvas;
      }
    }
    
    throw new Error('This PSD contains no renderable image data. Ensure layers are visible.');
  } catch (error: any) {
    console.error('[PSD Service] Render failed:', error);
    // If it's our custom validation error, re-throw it directly
    if (error.message?.includes('PDF') || error.message?.includes('signature')) {
      throw error;
    }
    throw new Error(error.message || 'The PSD structure is unsupported or corrupted.');
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
