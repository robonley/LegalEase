import OpenAI from 'openai';
import { z } from 'zod';
import { ExtractionResult, extractionResultSchema } from '@shared/schema';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class AIExtractor {
  private systemPrompt = `
You are an expert at extracting clean, normalized corporate registry data from legal documents such as minute books, share registers, and share certificates.

Return only JSON conforming to the provided schema. Do not invent data that is not explicitly present in the document.

Guidelines:
- For dates, output ISO format (YYYY-MM-DD) if a complete date exists; otherwise omit the field
- Set role flags accurately: isDirector/isOfficer/isShareholder based on document content
- Extract officerTitle if present (e.g., "President", "Secretary", "Treasurer")
- Map share details: shareClass, shareSeries, shares (number), issueDate (ISO format)
- Extract addresses as single lines when possible; separate city/province/postalCode if explicitly listed
- Include per-field confidence scores between 0 and 1 based on clarity and certainty of the data
- For names, extract both fullName and attempt to parse firstName/lastName
- Normalize jurisdiction codes (e.g., "Federal" or "Canada" → "CBCA", "Ontario" → "OBCA")
- Corporation numbers should be clean numeric strings without prefixes

Focus on accuracy over completeness. Better to omit uncertain data than include incorrect information.
`;

  async extractFromText(text: string, filename: string): Promise<ExtractionResult> {
    try {
      const chunks = this.chunkText(text);
      let result: ExtractionResult;

      if (chunks.length === 1) {
        result = await this.processChunk(chunks[0], filename);
      } else {
        // Process multiple chunks and merge results
        result = await this.processMultipleChunks(chunks, filename);
      }

      // Validate result against schema
      return extractionResultSchema.parse(result);
    } catch (error) {
      console.error('AI extraction error:', error);
      throw new Error(`Failed to extract data: ${error.message}`);
    }
  }

  private async processChunk(text: string, filename: string): Promise<ExtractionResult> {
    const userPrompt = `
Document text (${text.length} characters):
--- BEGIN DOCUMENT ---
${text}
--- END DOCUMENT ---

Extract all corporate information, people, and shareholding details from this document.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using cost-efficient model for structured extraction
      messages: [
        { role: "system", content: this.systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1, // Low temperature for consistent extraction
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    try {
      const parsed = JSON.parse(content);
      
      // Ensure required fields are present
      return {
        organization: parsed.organization || {},
        people: parsed.people || [],
        shareholders: parsed.shareholders || parsed.people?.filter((p: any) => p.isShareholder) || [],
        confidence: parsed.confidence || 0.5,
        confidences: parsed.confidences || {},
        sourceMeta: {
          filename,
          pages: this.estimatePages(text),
        },
      };
    } catch (parseError) {
      throw new Error(`Failed to parse OpenAI response: ${parseError.message}`);
    }
  }

  private async processMultipleChunks(chunks: string[], filename: string): Promise<ExtractionResult> {
    const results: ExtractionResult[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkResult = await this.processChunk(chunk, `${filename} (part ${i + 1})`);
      results.push(chunkResult);
    }

    // Merge results from multiple chunks
    return this.mergeExtractionResults(results, filename);
  }

  private mergeExtractionResults(results: ExtractionResult[], filename: string): ExtractionResult {
    const merged: ExtractionResult = {
      organization: {},
      people: [],
      shareholders: [],
      confidence: 0,
      confidences: {},
      sourceMeta: {
        filename,
        pages: results.reduce((sum, r) => sum + r.sourceMeta.pages, 0),
      },
    };

    // Merge organization data (take first non-empty value for each field)
    for (const result of results) {
      if (result.organization) {
        Object.keys(result.organization).forEach(key => {
          if (!merged.organization[key] && result.organization[key]) {
            merged.organization[key] = result.organization[key];
          }
        });
      }
    }

    // Merge people (deduplicate by fullName)
    const peopleMap = new Map<string, any>();
    for (const result of results) {
      result.people.forEach(person => {
        const key = person.fullName.toLowerCase().trim();
        if (!peopleMap.has(key)) {
          peopleMap.set(key, person);
        } else {
          // Merge additional info for existing person
          const existing = peopleMap.get(key);
          peopleMap.set(key, { ...existing, ...person });
        }
      });
    }
    merged.people = Array.from(peopleMap.values());

    // Filter shareholders from merged people
    merged.shareholders = merged.people.filter(p => p.isShareholder);

    // Calculate average confidence
    const totalConfidence = results.reduce((sum, r) => sum + r.confidence, 0);
    merged.confidence = totalConfidence / results.length;

    return merged;
  }

  private chunkText(text: string, maxChunkSize: number = 50000): string[] {
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
        
        if (paragraph.length > maxChunkSize) {
          // Split large paragraphs by sentences
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

  private estimatePages(text: string): number {
    // Rough estimate: ~3000 characters per page for typical legal documents
    return Math.max(1, Math.ceil(text.length / 3000));
  }

  async estimateTokenUsage(text: string): Promise<number> {
    // Rough estimate: ~4 characters per token
    const inputTokens = Math.ceil(text.length / 4);
    const outputTokens = 2000; // Estimated output size
    return inputTokens + outputTokens;
  }
}