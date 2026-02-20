
import { PDFDocument } from 'pdf-lib';

export interface PDFFile {
  file: File;
  id: string;
  name: string;
  size: number;
}

export const mergePDFs = async (files: File[]): Promise<Uint8Array> => {
  const mergedPdf = await PDFDocument.create();
  
  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const pdf = await PDFDocument.load(bytes);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  
  return await mergedPdf.save();
};

export const splitPDF = async (
  file: File, 
  ranges: { start: number; end: number }[]
): Promise<Uint8Array[]> => {
  const bytes = await file.arrayBuffer();
  const mainPdf = await PDFDocument.load(bytes);
  const results: Uint8Array[] = [];

  for (const range of ranges) {
    const newPdf = await PDFDocument.create();
    const indices = [];
    for (let i = range.start - 1; i <= range.end - 1; i++) {
      if (i >= 0 && i < mainPdf.getPageCount()) {
        indices.push(i);
      }
    }
    const copiedPages = await newPdf.copyPages(mainPdf, indices);
    copiedPages.forEach((page) => newPdf.addPage(page));
    results.push(await newPdf.save());
  }

  return results;
};

export const compressPDF = async (file: File, level: 'low' | 'medium' | 'high'): Promise<Uint8Array> => {
  // Client-side compression is limited. We simulate it by re-saving with metadata removal
  // and potentially downscaling if we had an advanced engine. 
  // pdf-lib's save({ useObjectStreams: true }) provides some compression.
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes);
  
  // Simulation of different levels:
  // In a real WASM MuPDF environment, we'd adjust image quality.
  return await pdf.save({
    useObjectStreams: level !== 'low',
    addDefaultPage: false,
  });
};

export const downloadBlob = (data: Uint8Array, fileName: string) => {
  const blob = new Blob([data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  window.URL.revokeObjectURL(url);
};
