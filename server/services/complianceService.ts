// Reference to javascript_openai blueprint integration
import OpenAI from "openai";
import { format } from "date-fns";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ComplianceGap {
  id: string;
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  recommendation: string;
  documentName?: string;
  status: "pending" | "reviewing" | "resolved";
}

export interface ComplianceReview {
  id: string;
  status: "pending" | "analyzing" | "completed" | "error";
  overallScore: number;
  gaps: ComplianceGap[];
  lastRunAt: string;
  documentsAnalyzed: number;
  recommendations: string[];
}

interface DocumentContent {
  name: string;
  content: string;
  type: string;
}

export class ComplianceService {
  async analyzeDocuments(documents: DocumentContent[]): Promise<ComplianceReview> {
    try {
      const analysisPrompt = `
        You are an expert legal compliance analyst specializing in corporate governance. 
        Please analyze the following corporate documents and identify potential compliance gaps.
        
        Focus on these areas:
        - Annual return filings and deadlines
        - Board meeting requirements and minutes
        - Shareholder meeting compliance
        - Corporate record maintenance
        - Regulatory filing requirements
        - Director and officer obligations
        - Share issuance compliance
        - Statutory compliance gaps
        
        For each document, identify:
        1. Missing required elements
        2. Incomplete documentation
        3. Potential regulatory violations
        4. Best practice recommendations
        
        Documents to analyze:
        ${documents.map((doc, index) => `
        Document ${index + 1}: ${doc.name}
        Type: ${doc.type}
        Content: ${doc.content.substring(0, 2000)}...
        `).join('\n')}
        
        Please respond with a JSON object containing:
        {
          "overallScore": number (0-100),
          "gaps": [
            {
              "category": string,
              "severity": "low" | "medium" | "high" | "critical",
              "description": string,
              "recommendation": string,
              "documentName": string
            }
          ],
          "recommendations": [string]
        }
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "You are a legal compliance expert. Provide thorough, accurate compliance analysis in JSON format.",
          },
          {
            role: "user",
            content: analysisPrompt,
          },
        ],
        response_format: { type: "json_object" },
      });

      const analysisResult = JSON.parse(response.choices[0].message.content || '{}');

      // Generate gaps with unique IDs
      const gaps: ComplianceGap[] = (analysisResult.gaps || []).map((gap: any, index: number) => ({
        id: `gap-${Date.now()}-${index}`,
        category: gap.category || "general",
        severity: gap.severity || "medium",
        description: gap.description || "Compliance issue identified",
        recommendation: gap.recommendation || "Review and address this issue",
        documentName: gap.documentName,
        status: "pending" as const,
      }));

      const review: ComplianceReview = {
        id: `review-${Date.now()}`,
        status: "completed",
        overallScore: Math.max(0, Math.min(100, analysisResult.overallScore || 75)),
        gaps,
        lastRunAt: new Date().toISOString(),
        documentsAnalyzed: documents.length,
        recommendations: analysisResult.recommendations || [],
      };

      return review;
    } catch (error) {
      console.error('Compliance analysis error:', error);
      throw new Error('Failed to analyze documents for compliance');
    }
  }

  async generateComplianceDeadlines(orgData: any): Promise<any[]> {
    try {
      const deadlinePrompt = `
        Based on the following corporate entity information, generate a comprehensive list of compliance deadlines and filing requirements.
        
        Entity Information:
        - Name: ${orgData.name}
        - Jurisdiction: ${orgData.jurisdiction}
        - Formation Date: ${orgData.formationAt}
        - Annual Return Due: ${orgData.annualReturnDueAt || 'Not set'}
        
        Generate deadlines for:
        1. Annual return filings
        2. Required board meetings
        3. Shareholder meetings
        4. Tax filing deadlines
        5. Regulatory compliance requirements
        6. Corporate record updates
        
        Please respond with a JSON array of deadlines:
        [
          {
            "title": string,
            "description": string,
            "dueDate": "YYYY-MM-DD",
            "category": string,
            "priority": "low" | "medium" | "high" | "critical",
            "isAutoGenerated": true
          }
        ]
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "You are a corporate compliance expert. Generate accurate compliance deadlines based on jurisdiction requirements.",
          },
          {
            role: "user",
            content: deadlinePrompt,
          },
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{"deadlines": []}');
      return result.deadlines || [];
    } catch (error) {
      console.error('Error generating compliance deadlines:', error);
      return [];
    }
  }

  generateCalendarFile(deadlines: any[], calendarFormat: 'google' | 'outlook'): string {
    if (calendarFormat === 'google') {
      // Generate .ics file for Google Calendar
      const icsHeader = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Legal Entity Manager//Compliance Calendar//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH'
      ].join('\r\n');

      const events = deadlines.map(deadline => {
        const startDate = format(new Date(deadline.dueDate), 'yyyyMMdd');
        return [
          'BEGIN:VEVENT',
          `UID:${deadline.id}@legalentity.com`,
          `DTSTART;VALUE=DATE:${startDate}`,
          `DTEND;VALUE=DATE:${startDate}`,
          `SUMMARY:${deadline.title}`,
          `DESCRIPTION:${deadline.description || ''}`,
          `CATEGORIES:${deadline.category}`,
          'END:VEVENT'
        ].join('\r\n');
      }).join('\r\n');

      const icsFooter = 'END:VCALENDAR';
      
      return [icsHeader, events, icsFooter].join('\r\n');
    } else {
      // Generate .ics file for Outlook (same format)
      return this.generateCalendarFile(deadlines, 'google');
    }
  }
}

export const complianceService = new ComplianceService();