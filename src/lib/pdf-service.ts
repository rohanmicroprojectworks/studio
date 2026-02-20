/**
 * @fileoverview PDF Processing Service
 * Responsibility: Core business logic for PDF manipulation using pdf-lib.
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
 * @param files Array of File objects to merge.
 * @returns Uint8Array of the merged PDF.
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
 * Extracts specific page ranges from a PDF as individual files.
 * @param file The source PDF file.
 * @param ranges Array of start and end page numbers.
 * @returns Array of Uint8Arrays, one for each range.
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
        if (i >= 0 && i < pageCount) {
          indices.push(i);
        }
      }

      if (indices.length > 0) {
        const copiedPages = await newPdf.copyPages(sourcePdf, indices);
        copiedPages.forEach((page) => newPdf.addPage(page));
        results.push(await newPdf.save());
      }
    }

    return results;
  } catch (error) {
    console.error('[PDF Service] Split failed:', error);
    throw new Error('Failed to split PDF document.');
  }
};

/**
 * Extracts multiple ranges and merges them into a single output file.
 * @param file Source PDF file.
 * @param ranges Ranges to extract.
 * @returns Uint8Array of the merged extraction.
 */
export const extractAndMergePDFRanges = async (
  file: File,
  ranges: { start: number; end: number }[]
): Promise<Uint8Array> => {
  try {
    const bytes = await file.arrayBuffer();
    const sourcePdf = await PDFDocument.load(bytes);
    const newPdf = await PDFDocument.create();

    for (const range of ranges) {
      const pageCount = sourcePdf.getPageCount();
      const indices: number[] = [];
      for (let i = range.start - 1; i <= range.end - 1; i++) {
        if (i >= 0 && i < pageCount) {
          indices.push(i);
        }
      }
      const copiedPages = await newPdf.copyPages(sourcePdf, indices);
      copiedPages.forEach((page) => newPdf.addPage(page));
    }

    return await newPdf.save();
  } catch (error) {
    console.error('[PDF Service] Extract and merge failed:', error);
    throw new Error('Failed to process and merge PDF ranges.');
  }
};

/**
 * Compresses a PDF file by optimizing internal streams.
 * @param file Source PDF file.
 * @param level Compression intensity.
 * @returns Uint8Array of the compressed PDF.
 */
export const compressPDFDocument = async (
  file: File, 
  level: 'low' | 'medium' | 'high'
): Promise<Uint8Array> => {
  try {
    const bytes = await file.arrayBuffer();
    const pdf = await PDFDocument.load(bytes);
    
    return await pdf.save({
      useObjectStreams: level !== 'low',
      addDefaultPage: false,
    });
  } catch (error) {
    console.error('[PDF Service] Compression failed:', error);
    throw new Error('Failed to compress PDF document.');
  }
};

/**
 * Triggers a browser download for a given byte array.
 * @param data PDF byte data.
 * @param fileName Intended filename.
 */
export const triggerDownload = (data: Uint8Array, fileName: string) => {
  const blob = new Blob([data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.URL.revokeObjectURL(url);
};
