import { Job } from 'bullmq';
import { storage } from './storage';
import { PDFProcessor } from './pdfProcessor';
import { AIExtractor } from './aiExtractor';
import { IngestionJobData, IngestionJobResult } from './queueService';
import { ExtractionResult } from '@shared/schema';
import fs from 'fs';
import path from 'path';

export class IngestionWorker {
  private pdfProcessor: PDFProcessor;
  private aiExtractor: AIExtractor;

  constructor() {
    this.pdfProcessor = new PDFProcessor();
    this.aiExtractor = new AIExtractor();
  }

  async processJob(job: Job<IngestionJobData>): Promise<IngestionJobResult> {
    const { jobId, userId, filename, fileKey } = job.data;
    const startTime = Date.now();

    try {
      // Update job status to processing
      await storage.updateIngestionJob(jobId, {
        status: 'processing',
        progress: 10,
      });

      // Validate file exists and get file path
      const filePath = this.getFilePath(fileKey);
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${fileKey}`);
      }

      // Validate file type and size
      const validation = await this.pdfProcessor.validateFile(filePath);
      if (!validation.valid) {
        throw new Error(validation.error || 'File validation failed');
      }

      await storage.updateIngestionJob(jobId, { progress: 20 });

      // Parse the document (PDF or image)
      console.log(`Processing file: ${filename}`);
      const parsedDoc = await this.pdfProcessor.parseFile(filePath);

      await storage.updateIngestionJob(jobId, { progress: 50 });

      // Extract structured data using AI
      console.log(`Extracting data from ${parsedDoc.pages} pages of text...`);
      const extractionResult = await this.aiExtractor.extractFromText(parsedDoc.text, filename);

      await storage.updateIngestionJob(jobId, { progress: 80 });

      // Estimate token usage
      const tokensUsed = await this.aiExtractor.estimateTokenUsage(parsedDoc.text);

      // Update job with results
      const processingTimeMs = Date.now() - startTime;
      await storage.updateIngestionJob(jobId, {
        status: 'completed',
        progress: 100,
        extractionResult: extractionResult as any, // Cast for JSON storage
        tokensUsed,
        processingTimeMs,
        completedAt: new Date(),
      });

      console.log(`Job ${jobId} completed in ${processingTimeMs}ms, used ~${tokensUsed} tokens`);

      // Clean up temporary file (optional, depending on storage strategy)
      this.cleanupFile(filePath);

      return {
        success: true,
        extractionResult,
        tokensUsed,
        processingTimeMs,
      };

    } catch (error) {
      console.error(`Job ${jobId} failed:`, error);

      // Update job with error
      await storage.updateIngestionJob(jobId, {
        status: 'failed',
        errorMessage: error.message,
        completedAt: new Date(),
      });

      return {
        success: false,
        error: error.message,
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  private getFilePath(fileKey: string): string {
    // For now, assume files are stored in a uploads directory
    // In production, this would integrate with your object storage system
    return path.join(process.cwd(), 'uploads', fileKey);
  }

  private cleanupFile(filePath: string): void {
    try {
      // Only clean up if it's in the temp uploads directory and older than 1 hour
      const stats = fs.statSync(filePath);
      const oneHourAgo = Date.now() - (60 * 60 * 1000);
      
      if (stats.mtime.getTime() < oneHourAgo) {
        fs.unlinkSync(filePath);
        console.log(`Cleaned up temporary file: ${filePath}`);
      }
    } catch (error) {
      console.warn(`Failed to cleanup file ${filePath}:`, error.message);
    }
  }

  // Utility method to ensure uploads directory exists
  static ensureUploadsDirectory(): void {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('Created uploads directory:', uploadsDir);
    }
  }
}