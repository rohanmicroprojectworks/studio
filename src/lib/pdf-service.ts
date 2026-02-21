/**
 * @fileoverview Enhanced PDF Processing Service
 * Responsibility: Core business logic for PDF manipulation, including security and image integration.
 * Author: GlassPDF Team
 * License: MIT
 */

import { PDFDocument } from 'pdf-lib';

/**
 * Interface for PDF file metadata used within the application state.
 */
export interface PDFFileMetadata {
  file: File;
  id: string;
  name: string;
  size: number;
}

/**
 * Merges multiple PDF files into a single document.
 */
export const mergePDFDocuments = async (files: File[]): Promise<Uint8Array> => {
  try {
    const mergedPdf = await PDFDocument.create();
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(bytes);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }
    return await mergedPdf.save();
  } catch (error) {
    console.error('[PDF Service] Merge failed:', error);
    throw new Error('Failed to merge PDF documents.');
  }
};

/**
 * Extracts specific page ranges from a PDF.
 */
export const splitPDFDocument = async (
  file: File, 
  ranges: { start: number; end: number }[]
): Promise<Uint8Array[]> => {
  try {
    const bytes = await file.arrayBuffer();
    const sourcePdf = await PDFDocument.load(bytes);
    const results: Uint8Array[] = [];

    for (const range of ranges) {
      const newPdf = await PDFDocument.create();
      const pageCount = sourcePdf.getPageCount();
      const indices: number[] = [];
      for (let i = range.start - 1; i <= range.end - 1; i++) {
        if (i >= 0 && i < pageCount) indices.push(i);
      }
      if (indices.length > 0) {
        const copiedPages = await newPdf.copyPages(sourcePdf, indices);
        copiedPages.forEach((page) => newPdf.addPage(page));
        results.push(await newPdf.save());
      }
    }
    return results;
  } catch (error) {
    throw new Error('Failed to split PDF document.');
  }
};

/**
 * Extracts multiple ranges and merges them into a single output file.
 */
export const extractAndMergePDFRanges = async (
  file: File,
  ranges: { start: number; end: number }[]
): Promise<Uint8Array> => {
  const bytes = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(bytes);
  const newPdf = await PDFDocument.create();
  for (const range of ranges) {
    const pageCount = sourcePdf.getPageCount();
    const indices: number[] = [];
    for (let i = range.start - 1; i <= range.end - 1; i++) {
      if (i >= 0 && i < pageCount) indices.push(i);
    }
    const copiedPages = await newPdf.copyPages(sourcePdf, indices);
    copiedPages.forEach((page) => newPdf.addPage(page));
  }
  return await newPdf.save();
};

/**
 * Compresses a PDF file by optimizing internal streams and re-bundling objects.
 * Uses a total structural re-indexing strategy for maximum structural reduction.
 */
export const compressPDFDocument = async (
  file: File, 
  level: 'low' | 'medium' | 'high'
): Promise<Uint8Array> => {
  const bytes = await file.arrayBuffer();
  // We load with ignoreEncryption to maximize structural reach
  const sourcePdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  
  // Create a completely new document context to force total re-indexing
  const compressedPdf = await PDFDocument.create();
  
  // Stripping ALL metadata for Maximum Purge
  if (level === 'high') {
    compressedPdf.setTitle('');
    compressedPdf.setAuthor('');
    compressedPdf.setSubject('');
    compressedPdf.setKeywords([]);
    compressedPdf.setProducer('GlassPDF Ultra-Purge Engine');
    compressedPdf.setCreator('GlassPDF Studio');
  }

  // Deep copy pages deduplicates resources natively in pdf-lib
  const copiedPages = await compressedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
  copiedPages.forEach((page) => compressedPdf.addPage(page));

  // useObjectStreams: Bundles objects into streams for massive structural reduction
  return await compressedPdf.save({
    useObjectStreams: true,
    addDefaultPage: false,
    updateFieldAppearances: false,
  });
};

/**
 * Protects a PDF with a password.
 */
export const protectPDF = async (file: File, password: string): Promise<Uint8Array> => {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes);
  pdf.encrypt({
    userPassword: password,
    ownerPassword: password,
    permissions: {
      printing: 'highResolution',
      modifying: true,
      copying: true,
    },
  });
  return await pdf.save();
};

/**
 * Unlocks a protected PDF.
 */
export const unlockPDF = async (file: File, password: string): Promise<Uint8Array> => {
  const bytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(bytes, { password });
  return await pdf.save();
};

/**
 * Converts images to a single PDF.
 */
export const imagesToPDF = async (files: File[]): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.create();
  for (const file of files) {
    const imgBytes = await file.arrayBuffer();
    let img;
    if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
      img = await pdfDoc.embedJpg(imgBytes);
    } else if (file.type === 'image/png') {
      img = await pdfDoc.embedPng(imgBytes);
    } else {
      continue;
    }
    const page = pdfDoc.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }
  return await pdfDoc.save();
};

/**
 * Triggers a browser download for a given byte array.
 */
export const triggerDownload = (data: Uint8Array, fileName: string, type: string = 'application/pdf') => {
  const blob = new Blob([data], { type });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.URL.revokeObjectURL(url);
};
