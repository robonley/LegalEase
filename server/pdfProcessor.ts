import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import { FileTypeResult, fromBuffer } from 'file-type';

export interface ParsedDocument {
  text: string;
  pages: number;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
  };
}

export interface OCROptions {
  language?: string;
  rotateAuto?: boolean;
}

export class PDFProcessor {
  async parseFile(filePath: string): Promise<ParsedDocument> {
    const buffer = fs.readFileSync(filePath);
    const fileType = await fromBuffer(buffer);
    
    if (!fileType) {
      throw new Error('Unable to determine file type');
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/tiff'];
    if (!allowedTypes.includes(fileType.mime)) {
      throw new Error(`Unsupported file type: ${fileType.mime}`);
    }

    if (fileType.mime === 'application/pdf') {
      return this.parsePDF(buffer);
    } else {
      // Handle image files with OCR
      return this.parseImage(buffer, filePath);
    }
  }

  private async parsePDF(buffer: Buffer): Promise<ParsedDocument> {
    try {
      const data = await pdfParse(buffer);
      
      // Check if PDF has extractable text
      if (data.text && data.text.trim().length > 50) {
        return {
          text: data.text,
          pages: data.numpages,
          metadata: {
            title: data.info?.Title,
            author: data.info?.Author,
            subject: data.info?.Subject,
            creator: data.info?.Creator,
          },
        };
      } else {
        // PDF has no text or very little text - might be scanned
        console.log('PDF has minimal text, attempting OCR...');
        return this.performOCROnPDF(buffer);
      }
    } catch (error) {
      console.error('Error parsing PDF:', error);
      // Fallback to OCR if PDF parsing fails
      return this.performOCROnPDF(buffer);
    }
  }

  private async parseImage(buffer: Buffer, originalPath: string): Promise<ParsedDocument> {
    const text = await this.performOCR(buffer);
    return {
      text,
      pages: 1,
      metadata: {
        title: path.basename(originalPath),
      },
    };
  }

  private async performOCROnPDF(pdfBuffer: Buffer): Promise<ParsedDocument> {
    // For PDF OCR, we would need to convert PDF pages to images first
    // This is a simplified implementation - in production you might use pdf2pic or similar
    throw new Error('PDF OCR not fully implemented - consider using image format or PDF with text');
  }

  private async performOCR(imageBuffer: Buffer, options: OCROptions = {}): Promise<string> {
    const worker = await createWorker('eng');
    
    try {
      if (options.rotateAuto) {
        await worker.setParameters({
          tessedit_pageseg_mode: '1', // Automatic page segmentation with OSD
        });
      }

      const { data } = await worker.recognize(imageBuffer);
      return data.text;
    } finally {
      await worker.terminate();
    }
  }

  async validateFile(filePath: string): Promise<{ valid: boolean; error?: string; fileType?: string }> {
    try {
      const stats = fs.statSync(filePath);
      
      // Check file size (50MB limit)
      const maxSize = 50 * 1024 * 1024;
      if (stats.size > maxSize) {
        return { valid: false, error: 'File size exceeds 50MB limit' };
      }

      const buffer = fs.readFileSync(filePath);
      const fileType = await fromBuffer(buffer);
      
      if (!fileType) {
        return { valid: false, error: 'Unable to determine file type' };
      }

      const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/tiff'];
      if (!allowedTypes.includes(fileType.mime)) {
        return { valid: false, error: `Unsupported file type: ${fileType.mime}` };
      }

      return { valid: true, fileType: fileType.mime };
    } catch (error) {
      return { valid: false, error: `File validation error: ${error.message}` };
    }
  }

  // Utility method to chunk large text for LLM processing
  chunkText(text: string, maxChunkSize: number = 60000): string[] {
    if (text.length <= maxChunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    let currentChunk = '';
    const paragraphs = text.split('\n\n');

    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length > maxChunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        
        // If single paragraph is too large, split by sentences
        if (paragraph.length > maxChunkSize) {
          const sentences = paragraph.split('. ');
          for (const sentence of sentences) {
            if (currentChunk.length + sentence.length > maxChunkSize) {
              if (currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = sentence;
              }
            } else {
              currentChunk += (currentChunk ? '. ' : '') + sentence;
            }
          }
        } else {
          currentChunk = paragraph;
        }
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}