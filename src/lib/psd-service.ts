
/**
 * @fileoverview High-Fidelity Universal PSD Composition Service
 * Responsibility: Multi-stage resilient PSD rendering with fallback strategies for complex structures.
 * Author: GlassPDF Team
 * License: MIT
 */

import { readPsd, Psd } from 'ag-psd';
import { PDFDocument } from 'pdf-lib';

/**
 * Renders any PSD file to a canvas using a multi-stage resilient strategy.
 * Stage 1: Full Fidelity (Layers + Masks)
 * Stage 2: Safe Mode (Bypass problematic metadata)
 * Stage 3: Composite Only
 */
export const renderPSDToCanvas = async (file: File): Promise<HTMLCanvasElement> => {
  const buffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(buffer);

  // File Validation: Check signature
  const view = new DataView(buffer);
  if (buffer.byteLength >= 4) {
    const sig = view.getUint32(0);
    if (sig === 0x25504446) throw new Error('This is a PDF file. Use the PDF Viewer tool.');
    if (sig !== 0x38425053) throw new Error('Not a valid PSD file. Signature check failed.');
  }

  // Attempt 1: High Fidelity Render (Layers + Masks + Blend Modes)
  try {
    const psd = readPsd(uint8, { 
      readCanvas: true, 
      readLayers: true,
      skipLayerImageData: false 
    });
    
    if (psd.canvas) return psd.canvas;
    if (psd.children && psd.children.length > 0) {
      const manualCanvas = createCanvasFromLayers(psd);
      if (manualCanvas) return manualCanvas;
    }
  } catch (err: any) {
    console.warn('[PSD Service] Stage 1 (Fidelity) failed:', err.message);
  }

  // Attempt 2: Safe Mode (Bypass metadata parsing that often triggers "Not Implemented")
  try {
    const psdSafe = readPsd(uint8, { 
      readCanvas: true, 
      readLayers: true,
      skipLayerImageData: false,
      skipThumbnail: true
    });
    if (psdSafe.canvas) return psdSafe.canvas;
  } catch (err: any) {
    console.warn('[PSD Service] Stage 2 (Safe Mode) failed:', err.message);
  }

  // Attempt 3: Composite Baseline (Fastest, uses Photoshop's pre-rendered preview)
  try {
    const psdComposite = readPsd(uint8, { 
      readCanvas: true, 
      readLayers: false,
      skipThumbnail: true
    });
    if (psdComposite.canvas) return psdComposite.canvas;
  } catch (err: any) {
    console.warn('[PSD Service] Stage 3 (Composite) failed:', err.message);
  }

  throw new Error('This PSD structure is unsupported by the local engine. Try saving with "Maximize Compatibility" enabled.');
};

/**
 * Manually composites the layer stack if no pre-rendered canvas exists.
 * Supports: Visibility, Opacity, and basic Layer Hierarchy.
 */
function createCanvasFromLayers(psd: Psd): HTMLCanvasElement | null {
  if (!psd.width || !psd.height) return null;
  const canvas = document.createElement('canvas');
  canvas.width = psd.width;
  canvas.height = psd.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const renderLayers = (layers: any[]) => {
    // Photoshop layers are stored top-down, so we render bottom-up
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      if (layer.hidden) continue;

      if (layer.children) {
        renderLayers(layer.children);
        continue;
      }

      if (layer.canvas) {
        ctx.save();
        ctx.globalAlpha = (layer.opacity ?? 255) / 255;
        // Basic mapping for common blend modes
        if (layer.blendMode === 'mul ') ctx.globalCompositeOperation = 'multiply';
        if (layer.blendMode === 'scrn') ctx.globalCompositeOperation = 'screen';
        
        ctx.drawImage(layer.canvas, layer.left || 0, layer.top || 0);
        ctx.restore();
      }
    }
  };

  if (psd.children) renderLayers(psd.children);
  return canvas;
}

/**
 * Exports a canvas as a high-quality image file.
 */
export const exportCanvasAsImage = (canvas: HTMLCanvasElement, format: 'png' | 'jpg', fileName: string) => {
  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
  const ext = format === 'png' ? 'png' : 'jpg';
  
  canvas.toBlob((blob) => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName.split('.')[0]}.${ext}`;
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
