import { storage } from "./storage";
import { CBCA_TEMPLATE_VARIABLES } from "./templateProcessor";
import type { MinuteBook, Template, Org, Person, ShareClass, ShareIssuance, PersonOnOrg } from "@shared/schema";

export interface EntityData {
  organization: Org & {
    registeredOffice?: any;
    recordsOffice?: any;
    mailingAddress?: any;
  };
  people: (Person & { roles?: PersonOnOrg[] })[];
  shareClasses: ShareClass[];
  shareIssuances: ShareIssuance[];
  directors: Person[];
  officers: Person[];
  shareholders: Person[];
}

export class DocumentGeneratorService {
  
  /**
   * Generate minute book bundle by processing all templates with entity data
   */
  async generateMinuteBookBundle(minuteBookId: string): Promise<{ success: boolean; bundleKey?: string; error?: string }> {
    try {
      console.log(`Starting minute book generation for ${minuteBookId}`);
      
      // Get minute book and its documents
      const minuteBook = await storage.getMinuteBookById(minuteBookId);
      if (!minuteBook) {
        return { success: false, error: "Minute book not found" };
      }

      const minuteBookDocs = await storage.getMinuteBookDocs(minuteBookId);
      if (minuteBookDocs.length === 0) {
        return { success: false, error: "No documents found for minute book" };
      }

      // Get entity data for variable substitution
      const entityData = await this.getEntityData(minuteBook.orgId);
      
      // Update minute book status to generating
      await storage.updateMinuteBook(minuteBookId, { 
        status: "generating",
        generationData: entityData 
      });

      // Process each document
      const generatedDocs = [];
      
      for (const doc of minuteBookDocs) {
        try {
          console.log(`Processing template ${doc.templateId}`);
          
          const template = await storage.getTemplateById(doc.templateId);
          if (!template) {
            await storage.updateMinuteBookDoc(doc.id, { 
              status: "error", 
              errorMessage: "Template not found" 
            });
            continue;
          }

          // Generate document content with entity data
          const generatedContent = await this.generateDocumentContent(template, entityData);
          
          // Create generated document record
          const generatedDoc = await storage.createGeneratedDoc({
            orgId: minuteBook.orgId,
            templateId: template.id,
            fileKey: `minute-book-${minuteBookId}-doc-${doc.id}.docx`,
            content: generatedContent,
            dataUsed: entityData,
            createdBy: minuteBook.createdBy,
          });

          // Update minute book doc status
          await storage.updateMinuteBookDoc(doc.id, { 
            status: "generated",
            generatedDocId: generatedDoc.id 
          });

          generatedDocs.push(generatedDoc);
          
        } catch (docError) {
          console.error(`Error processing document ${doc.id}:`, docError);
          await storage.updateMinuteBookDoc(doc.id, { 
            status: "error", 
            errorMessage: docError.message 
          });
        }
      }

      if (generatedDocs.length === 0) {
        await storage.updateMinuteBook(minuteBookId, { status: "error" });
        return { success: false, error: "No documents were generated successfully" };
      }

      // Create bundle (in a real implementation, this would combine all documents into a PDF/ZIP)
      const bundleKey = `minute-book-bundle-${minuteBookId}.pdf`;
      
      // Update minute book as ready
      await storage.updateMinuteBook(minuteBookId, { 
        status: "ready",
        bundleFileKey: bundleKey 
      });

      console.log(`Minute book generation completed: ${generatedDocs.length} documents generated`);
      
      return { success: true, bundleKey };
      
    } catch (error) {
      console.error(`Error generating minute book ${minuteBookId}:`, error);
      
      // Update status to error
      await storage.updateMinuteBook(minuteBookId, { status: "error" });
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Get comprehensive entity data for template variable substitution
   */
  private async getEntityData(orgId: string): Promise<EntityData> {
    // Get organization with addresses
    const organization = await storage.getOrgById(orgId);
    if (!organization) {
      throw new Error("Organization not found");
    }

    // Get addresses
    const registeredOffice = organization.registeredOfficeId 
      ? await storage.getAddressById(organization.registeredOfficeId) 
      : null;
    
    const recordsOffice = organization.recordsOfficeId 
      ? await storage.getAddressById(organization.recordsOfficeId) 
      : null;

    const mailingAddress = organization.mailingAddressId 
      ? await storage.getAddressById(organization.mailingAddressId) 
      : null;

    // Get people and their roles
    const allPeople = await storage.getPeopleByOrg(orgId);
    const personRoles = await storage.getPersonOrgRelations(orgId);
    
    // Enrich people with their roles
    const people = allPeople.map(person => ({
      ...person,
      roles: personRoles.filter(role => role.personId === person.id)
    }));

    // Categorize people by roles
    const directors = people.filter(person => 
      person.roles?.some(role => role.role.toLowerCase().includes('director'))
    );
    
    const officers = people.filter(person => 
      person.roles?.some(role => 
        role.role.toLowerCase().includes('officer') ||
        role.role.toLowerCase().includes('president') ||
        role.role.toLowerCase().includes('secretary') ||
        role.role.toLowerCase().includes('treasurer')
      )
    );
    
    const shareholders = people.filter(person => 
      person.roles?.some(role => role.role.toLowerCase().includes('shareholder'))
    );

    // Get share information
    const shareClasses = await storage.getShareClassesByOrg(orgId);
    const shareIssuances = await storage.getShareIssuancesByOrg(orgId);

    return {
      organization: {
        ...organization,
        registeredOffice,
        recordsOffice,
        mailingAddress
      },
      people,
      directors,
      officers,
      shareholders,
      shareClasses,
      shareIssuances
    };
  }

  /**
   * Generate document content by substituting template variables with entity data
   */
  private async generateDocumentContent(template: Template, entityData: EntityData): Promise<string> {
    // Start with template content or generate basic content
    let content = template.description || `Document: ${template.name}`;
    
    // Add professional header
    content = `
<!DOCTYPE html>
<html>
<head>
    <title>${template.name}</title>
    <style>
        body { font-family: 'Times New Roman', serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 40px; }
        .company-name { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .document-title { font-size: 18px; margin-bottom: 20px; }
        .section { margin: 30px 0; }
        .signature-block { margin-top: 60px; }
        .date { margin-bottom: 40px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">${entityData.organization.name}</div>
        <div class="document-title">${template.name}</div>
        <div class="date">${new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</div>
    </div>
    
    <div class="content">
`;

    // Add entity-specific content based on template type
    switch (template.category) {
      case 'minute-book':
        content += this.generateMinuteBookContent(entityData);
        break;
      case 'bylaws':
        content += this.generateBylawsContent(entityData);
        break;
      case 'resolution':
        content += this.generateResolutionContent(entityData);
        break;
      default:
        content += this.generateOrganizationContent(entityData);
    }

    // Add signature block
    content += `
    </div>
    
    <div class="signature-block">
        <p><strong>Authorized Signatory:</strong></p>
        <br><br>
        <p>_________________________<br>
        ${entityData.directors[0]?.firstName} ${entityData.directors[0]?.lastName}<br>
        ${entityData.directors[0]?.roles?.[0]?.title || 'Director'}</p>
    </div>
</body>
</html>
`;

    // Substitute template variables
    content = this.substituteVariables(content, entityData);

    return content;
  }

  /**
   * Generate minute book specific content
   */
  private generateMinuteBookContent(entityData: EntityData): string {
    return `
        <div class="section">
            <h2>Corporate Information</h2>
            <p><strong>Corporation Name:</strong> ${entityData.organization.name}</p>
            <p><strong>Registration Number:</strong> ${entityData.organization.number || 'N/A'}</p>
            <p><strong>Jurisdiction:</strong> ${entityData.organization.jurisdiction}</p>
            <p><strong>Date of Incorporation:</strong> ${entityData.organization.formationAt ? new Date(entityData.organization.formationAt).toLocaleDateString() : 'N/A'}</p>
        </div>
        
        <div class="section">
            <h2>Registered Office</h2>
            ${entityData.organization.registeredOffice ? `
                <p>${entityData.organization.registeredOffice.line1}</p>
                ${entityData.organization.registeredOffice.line2 ? `<p>${entityData.organization.registeredOffice.line2}</p>` : ''}
                <p>${entityData.organization.registeredOffice.city}, ${entityData.organization.registeredOffice.region}</p>
                <p>${entityData.organization.registeredOffice.country} ${entityData.organization.registeredOffice.postal}</p>
            ` : '<p>No registered office on file</p>'}
        </div>
        
        <div class="section">
            <h2>Directors</h2>
            ${entityData.directors.length > 0 ? `
                <ul>
                    ${entityData.directors.map(director => `
                        <li>${director.firstName} ${director.lastName}
                            ${director.roles?.[0]?.title ? ` - ${director.roles[0].title}` : ''}
                        </li>
                    `).join('')}
                </ul>
            ` : '<p>No directors on file</p>'}
        </div>
        
        <div class="section">
            <h2>Officers</h2>
            ${entityData.officers.length > 0 ? `
                <ul>
                    ${entityData.officers.map(officer => `
                        <li>${officer.firstName} ${officer.lastName}
                            ${officer.roles?.[0]?.title ? ` - ${officer.roles[0].title}` : ''}
                        </li>
                    `).join('')}
                </ul>
            ` : '<p>No officers on file</p>'}
        </div>
        
        <div class="section">
            <h2>Share Structure</h2>
            ${entityData.shareClasses.length > 0 ? `
                <table border="1" style="border-collapse: collapse; width: 100%;">
                    <tr>
                        <th style="padding: 8px;">Class</th>
                        <th style="padding: 8px;">Voting Rights</th>
                        <th style="padding: 8px;">Participating</th>
                        <th style="padding: 8px;">Special Rights</th>
                    </tr>
                    ${entityData.shareClasses.map(shareClass => `
                        <tr>
                            <td style="padding: 8px;">${shareClass.name}</td>
                            <td style="padding: 8px;">${shareClass.voting ? 'Yes' : 'No'}</td>
                            <td style="padding: 8px;">${shareClass.participating ? 'Yes' : 'No'}</td>
                            <td style="padding: 8px;">${shareClass.specialRights || 'None'}</td>
                        </tr>
                    `).join('')}
                </table>
            ` : '<p>No share classes defined</p>'}
        </div>
    `;
  }

  /**
   * Generate bylaws specific content
   */
  private generateBylawsContent(entityData: EntityData): string {
    return `
        <div class="section">
            <h2>BYLAW NO. 1</h2>
            <p>A bylaw relating generally to the conduct of the affairs of ${entityData.organization.name} (the "Corporation").</p>
            
            <h3>SECTION 1 - INTERPRETATION</h3>
            <p>In this bylaw and all other bylaws of the Corporation, unless the context otherwise requires:</p>
            <p>"Act" means the ${entityData.organization.jurisdiction} Business Corporations Act and, where applicable, includes the regulations made under that Act;</p>
            <p>"Corporation" means ${entityData.organization.name};</p>
            
            <h3>SECTION 2 - BUSINESS OF THE CORPORATION</h3>
            <p>The registered office of the Corporation shall be located at such place within ${entityData.organization.jurisdiction} as the directors may from time to time determine.</p>
        </div>
    `;
  }

  /**
   * Generate resolution specific content
   */
  private generateResolutionContent(entityData: EntityData): string {
    return `
        <div class="section">
            <h2>DIRECTORS' RESOLUTION</h2>
            <p>WHEREAS it is deemed advisable to pass certain resolutions relating to the affairs of the Corporation;</p>
            <p>NOW THEREFORE BE IT RESOLVED THAT:</p>
            <ol>
                <li>The actions taken by the directors and officers of the Corporation are hereby ratified and confirmed.</li>
                <li>This resolution shall be effective as of the date set forth above.</li>
            </ol>
        </div>
    `;
  }

  /**
   * Generate general organization content
   */
  private generateOrganizationContent(entityData: EntityData): string {
    return `
        <div class="section">
            <p>This document pertains to the corporate affairs of ${entityData.organization.name}, 
            a corporation incorporated under the laws of ${entityData.organization.jurisdiction}.</p>
        </div>
    `;
  }

  /**
   * Substitute template variables with actual entity data
   */
  private substituteVariables(content: string, entityData: EntityData): string {
    // Common variable substitutions
    const substitutions = {
      '{{CompanyName}}': entityData.organization.name,
      '{{COMPANYNAME}}': entityData.organization.name.toUpperCase(),
      '{{CompanyNumber}}': entityData.organization.number || '',
      '{{Jurisdiction}}': entityData.organization.jurisdiction,
      '{{FormationDate}}': entityData.organization.formationAt ? 
        new Date(entityData.organization.formationAt).toLocaleDateString() : '',
      '{{CurrentDate}}': new Date().toLocaleDateString(),
      '{{DirectorNames}}': entityData.directors.map(d => `${d.firstName} ${d.lastName}`).join(', '),
      '{{FirstDirector}}': entityData.directors[0] ? 
        `${entityData.directors[0].firstName} ${entityData.directors[0].lastName}` : '',
      '{{Officers}}': entityData.officers.map(o => 
        `${o.firstName} ${o.lastName} - ${o.roles?.[0]?.title || 'Officer'}`).join(', '),
      '{{ShareClasses}}': entityData.shareClasses.map(sc => sc.name).join(', '),
      '{{AuthorizedShares}}': entityData.shareClasses.reduce((sum, sc) => sum + (sc.voting ? 1000000 : 0), 0).toString(),
      '{{IssuedShares}}': entityData.shareIssuances.reduce((sum, si) => sum + si.quantity, 0).toString(),
    };

    // Apply all substitutions
    let result = content;
    for (const [variable, value] of Object.entries(substitutions)) {
      result = result.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), value || '');
    }

    return result;
  }
}

export const documentGenerator = new DocumentGeneratorService();