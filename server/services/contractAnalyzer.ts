import OpenAI from 'openai';
import { z } from 'zod';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ContractAnalysisResult {
  contractType?: string;
  effectiveDate?: string;
  expirationDate?: string;
  renewalDate?: string;
  contractValue?: number;
  currency?: string;
  governingLaw?: string;
  autoRenewal?: boolean;
  renewalNoticeDays?: number;
  terminationNoticeDays?: number;
  parties: Array<{
    name: string;
    role: string;
    contactInfo?: string;
  }>;
  obligations: Array<{
    party: string;
    description: string;
    dueDate?: string;
    priority: string;
  }>;
  risks: Array<{
    type: string;
    description: string;
    severity: string;
  }>;
  keyDates: Array<{
    date: string;
    description: string;
    type: string;
  }>;
  aiSummary: string;
  complianceStatus?: string;
  riskLevel?: string;
  confidence: number;
}

const contractAnalysisSchema = z.object({
  contractType: z.string().optional(),
  effectiveDate: z.string().optional(),
  expirationDate: z.string().optional(),
  renewalDate: z.string().optional(),
  contractValue: z.coerce.number().optional(),
  currency: z.string().optional(),
  governingLaw: z.string().optional(),
  autoRenewal: z.preprocess((val) => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') {
      const lower = val.toLowerCase().trim();
      if (lower === 'true' || lower === '1' || lower === 'yes') return true;
      if (lower === 'false' || lower === '0' || lower === 'no') return false;
    }
    return val;
  }, z.boolean().optional()),
  renewalNoticeDays: z.coerce.number().optional(),
  terminationNoticeDays: z.coerce.number().optional(),
  parties: z.array(z.object({
    name: z.string(),
    role: z.string(),
    contactInfo: z.string().optional(),
  })),
  obligations: z.array(z.object({
    party: z.string(),
    description: z.string(),
    dueDate: z.string().optional(),
    priority: z.string(),
  })),
  risks: z.array(z.object({
    type: z.string(),
    description: z.string(),
    severity: z.string(),
  })),
  keyDates: z.array(z.object({
    date: z.string(),
    description: z.string(),
    type: z.string(),
  })),
  aiSummary: z.string(),
  complianceStatus: z.string().optional(),
  riskLevel: z.string().optional(),
  confidence: z.coerce.number(),
});

export class ContractAnalyzer {
  private systemPrompt = `
You are an expert contract analyst with deep expertise in legal document analysis. Extract structured information from legal contracts with precision and accuracy.

Return JSON with the following structure:
{
  "contractType": "(vendor|customer|employment|nda|license|other)",
  "effectiveDate": "YYYY-MM-DD format if found",
  "expirationDate": "YYYY-MM-DD format if found",
  "renewalDate": "YYYY-MM-DD format if found",
  "contractValue": numeric value (no currency symbols),
  "currency": "ISO currency code (e.g., USD, CAD, EUR)",
  "governingLaw": "jurisdiction or governing law clause",
  "autoRenewal": true/false if auto-renewal clause exists,
  "renewalNoticeDays": number of days notice required for renewal,
  "terminationNoticeDays": number of days notice required for termination,
  "parties": [
    {
      "name": "Company or individual name",
      "role": "(client|vendor|licensor|licensee|employer|employee|contractor|partner|other)",
      "contactInfo": "Email, phone, or address if present"
    }
  ],
  "obligations": [
    {
      "party": "Party name responsible for this obligation",
      "description": "Clear description of the obligation",
      "dueDate": "YYYY-MM-DD if specific date mentioned",
      "priority": "(high|medium|low)"
    }
  ],
  "risks": [
    {
      "type": "(liability|indemnification|termination|penalty|compliance|other)",
      "description": "Description of the risk or clause",
      "severity": "(high|medium|low)"
    }
  ],
  "keyDates": [
    {
      "date": "YYYY-MM-DD",
      "description": "What happens on this date",
      "type": "(effective|expiration|renewal|milestone|payment|notice|other)"
    }
  ],
  "aiSummary": "2-3 paragraph executive summary covering: purpose of contract, key parties, main obligations, critical dates, notable risks or special terms",
  "complianceStatus": "Assessment of compliance requirements or regulatory considerations",
  "riskLevel": "(low|medium|high) - overall risk assessment",
  "confidence": 0.0 to 1.0 score representing overall confidence in the extraction
}

Guidelines:
- For dates, use ISO format YYYY-MM-DD only when complete dates are found
- Identify contract type based on content and purpose
- Extract all parties mentioned, distinguishing their roles
- Prioritize high-value obligations (financial, legal, compliance)
- Assess risk severity based on potential impact
- For aiSummary, provide actionable insights, not just repetition of facts
- Mark obligations as high priority if they involve: payments, compliance, legal requirements, or have near-term deadlines
- Risk severity should consider: financial exposure, legal liability, reputational impact
- Overall riskLevel should consider: contract value, complexity, liability clauses, termination terms
- Set confidence based on: document clarity, completeness, and certainty of extracted information
- Omit fields where data is uncertain or not present (except arrays which should be empty [])
- For obligations without specific dates, omit the dueDate field
- Extract notice periods as numbers of days (e.g., "30 days notice" → 30)

Focus on accuracy and actionable insights. Better to be conservative than to include uncertain information.
`;

  async analyzeContract(content: string): Promise<ContractAnalysisResult> {
    try {
      if (!content || content.trim().length === 0) {
        throw new Error('Contract content is empty');
      }

      const chunks = this.chunkText(content);
      let result: ContractAnalysisResult;

      if (chunks.length === 1) {
        result = await this.processChunk(chunks[0]);
      } else {
        // Process multiple chunks and merge results
        result = await this.processMultipleChunks(chunks);
      }

      // Validate result against schema
      return contractAnalysisSchema.parse(result);
    } catch (error: any) {
      console.error('Contract analysis error:', error);
      throw error;
    }
  }

  private async processChunk(text: string): Promise<ContractAnalysisResult> {
    const userPrompt = `
Analyze the following contract text and extract all relevant information:

--- BEGIN CONTRACT ---
${text}
--- END CONTRACT ---

Extract contract metadata, parties, obligations, risks, key dates, and provide an executive summary.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Cost-efficient model for structured extraction
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
      
      // Ensure required fields have defaults
      return {
        contractType: parsed.contractType,
        effectiveDate: parsed.effectiveDate,
        expirationDate: parsed.expirationDate,
        renewalDate: parsed.renewalDate,
        contractValue: parsed.contractValue,
        currency: parsed.currency,
        governingLaw: parsed.governingLaw,
        autoRenewal: parsed.autoRenewal,
        renewalNoticeDays: parsed.renewalNoticeDays,
        terminationNoticeDays: parsed.terminationNoticeDays,
        parties: parsed.parties || [],
        obligations: parsed.obligations || [],
        risks: parsed.risks || [],
        keyDates: parsed.keyDates || [],
        aiSummary: parsed.aiSummary || 'No summary available.',
        complianceStatus: parsed.complianceStatus,
        riskLevel: parsed.riskLevel,
        confidence: parsed.confidence || 0.5,
      };
    } catch (parseError: any) {
      throw new Error(`Failed to parse OpenAI response: ${parseError.message}`);
    }
  }

  private async processMultipleChunks(chunks: string[]): Promise<ContractAnalysisResult> {
    const results: ContractAnalysisResult[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkResult = await this.processChunk(chunk);
      results.push(chunkResult);
    }

    // Merge results from multiple chunks
    return this.mergeAnalysisResults(results);
  }

  private mergeAnalysisResults(results: ContractAnalysisResult[]): ContractAnalysisResult {
    const merged: ContractAnalysisResult = {
      parties: [],
      obligations: [],
      risks: [],
      keyDates: [],
      aiSummary: '',
      confidence: 0,
    };

    // Take first non-empty value for singular fields
    for (const result of results) {
      if (!merged.contractType && result.contractType) merged.contractType = result.contractType;
      if (!merged.effectiveDate && result.effectiveDate) merged.effectiveDate = result.effectiveDate;
      if (!merged.expirationDate && result.expirationDate) merged.expirationDate = result.expirationDate;
      if (!merged.renewalDate && result.renewalDate) merged.renewalDate = result.renewalDate;
      if (!merged.contractValue && result.contractValue) merged.contractValue = result.contractValue;
      if (!merged.currency && result.currency) merged.currency = result.currency;
      if (!merged.governingLaw && result.governingLaw) merged.governingLaw = result.governingLaw;
      if (merged.autoRenewal === undefined && result.autoRenewal !== undefined) merged.autoRenewal = result.autoRenewal;
      if (!merged.renewalNoticeDays && result.renewalNoticeDays) merged.renewalNoticeDays = result.renewalNoticeDays;
      if (!merged.terminationNoticeDays && result.terminationNoticeDays) merged.terminationNoticeDays = result.terminationNoticeDays;
      if (!merged.complianceStatus && result.complianceStatus) merged.complianceStatus = result.complianceStatus;
      if (!merged.riskLevel && result.riskLevel) merged.riskLevel = result.riskLevel;
    }

    // Merge arrays, deduplicating where possible
    const partiesMap = new Map<string, any>();
    for (const result of results) {
      result.parties.forEach(party => {
        const key = party.name.toLowerCase().trim();
        if (!partiesMap.has(key)) {
          partiesMap.set(key, party);
        } else {
          // Merge additional info for existing party
          const existing = partiesMap.get(key);
          partiesMap.set(key, { ...existing, ...party });
        }
      });
    }
    merged.parties = Array.from(partiesMap.values());

    // Merge obligations (deduplicate by description similarity)
    const obligationsMap = new Map<string, any>();
    for (const result of results) {
      result.obligations.forEach(obligation => {
        const key = `${obligation.party}:${obligation.description.substring(0, 50)}`.toLowerCase();
        if (!obligationsMap.has(key)) {
          obligationsMap.set(key, obligation);
        }
      });
    }
    merged.obligations = Array.from(obligationsMap.values());

    // Merge risks (deduplicate by type and description)
    const risksMap = new Map<string, any>();
    for (const result of results) {
      result.risks.forEach(risk => {
        const key = `${risk.type}:${risk.description.substring(0, 50)}`.toLowerCase();
        if (!risksMap.has(key)) {
          risksMap.set(key, risk);
        }
      });
    }
    merged.risks = Array.from(risksMap.values());

    // Merge key dates (deduplicate by date)
    const datesMap = new Map<string, any>();
    for (const result of results) {
      result.keyDates.forEach(date => {
        const key = date.date;
        if (!datesMap.has(key)) {
          datesMap.set(key, date);
        }
      });
    }
    merged.keyDates = Array.from(datesMap.values());

    // Combine summaries
    const summaries = results.map(r => r.aiSummary).filter(s => s && s.length > 0);
    merged.aiSummary = summaries.length > 0 ? summaries.join('\n\n') : 'No summary available.';

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
}
