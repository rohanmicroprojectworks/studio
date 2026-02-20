
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
    if (indices.length > 0) {
      const copiedPages = await newPdf.copyPages(mainPdf, indices);
      copiedPages.forEach((page) => newPdf.addPage(page));
      results.push(await newPdf.save());
    }
  }

  return results;
};

export const splitAndMergePDF = async (
  file: File,
  ranges: { start: number; end: number }[]
): Promise<Uint8Array> => {
  const bytes = await file.arrayBuffer();
  const mainPdf = await PDFDocument.load(bytes);
  const newPdf = await PDFDocument.create();

  for (const range of ranges) {
    const indices = [];
    for (let i = range.start - 1; i <= range.end - 1; i++) {
      if (i >= 0 && i < mainPdf.getPageCount()) {
        indices.push(i);
      }
    }
    const copiedPages = await newPdf.copyPages(mainPdf, indices);
    copiedPages.forEach((page) => newPdf.addPage(page));
  }

  return await newPdf.save();
};

export const compressPDF = async (file: File, level: 'low' | 'medium' | 'high'): Promise<Uint8Array> => {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes);
  
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
