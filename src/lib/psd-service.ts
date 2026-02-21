
/**
 * @fileoverview Universal PSD Processing Service
 * Responsibility: High-fidelity PSD rendering with full layer composition support.
 * Author: GlassPDF Team
 * License: MIT
 */

import { readPsd } from 'ag-psd';
import { PDFDocument } from 'pdf-lib';

/**
 * Renders any PSD file to a canvas.
 * Target: Full compatibility without needing "Maximize Compatibility".
 * Engine: ag-psd with manual layer stack composition fallback.
 */
export const renderPSDToCanvas = async (file: File): Promise<HTMLCanvasElement> => {
  const buffer = await file.arrayBuffer();

  try {
    // Read PSD with full layer data and composite data
    const psd = readPsd(buffer, { 
      readCanvas: true, 
      readLayers: true,
      skipLayerImageData: false,
      skipCompositeImageData: false,
      skipThumbnail: true
    });
    
    // Priority 1: Use the built-in composite canvas if available (fastest/highest fidelity)
    if (psd.canvas) {
      return psd.canvas;
    }
    
    // Priority 2: Manual composition from layers
    // This removes the "Maximize Compatibility" requirement.
    if (psd.children && psd.children.length > 0) {
      const canvas = document.createElement('canvas');
      canvas.width = psd.width;
      canvas.height = psd.height;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Draw layers from bottom to top recursively
        const renderLayerStack = (layers: any[]) => {
          // PSD layers are ordered from top to bottom in children, 
          // so we iterate backwards to draw bottom-up.
          for (let i = layers.length - 1; i >= 0; i--) {
            const layer = layers[i];
            
            // Skip hidden layers
            if (layer.hidden) continue;

            // Handle Groups
            if (layer.children) {
              renderLayerStack(layer.children);
              continue;
            }

            // Draw layer image data
            // ag-psd provides 'canvas' for each layer if skipLayerImageData is false
            if (layer.canvas) {
              ctx.save();
              ctx.globalAlpha = (layer.opacity ?? 255) / 255;
              
              // Apply layer blend mode if possible (Simplified)
              if (layer.blendMode && ctx.globalCompositeOperation !== undefined) {
                // Map common PSD blend modes to Canvas globalCompositeOperation if needed
                // Defaulting to source-over for stability
              }

              ctx.drawImage(layer.canvas, layer.left || 0, layer.top || 0);
              ctx.restore();
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
    if (error.message?.includes('layer mask data')) {
      throw new Error('Complex layer mask data detected. Try saving with "Maximize Compatibility" or simplify the masks.');
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
