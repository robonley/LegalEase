import { useState, useEffect, useRef } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useEntityContext } from "@/hooks/useEntityContext";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import type { Org, ShareClass, ShareIssuance, EntityData } from "@shared/schema";

interface DocumentEditorProps {
  documentId: string | null;
  orgId: string;
  initialContent?: string;
  initialTitle?: string;
  onSave?: (content: string) => Promise<void>;
  onClose?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const TEMPLATE_VARIABLES = {
  // Company Information
  "{{CompanyName}}": { category: "Company", description: "Legal name of the corporation" },
  "{{COMPANYNAME}}": { category: "Company", description: "Legal name (uppercase)" },
  "{{CompanyNumber}}": { category: "Company", description: "Corporate registration number" },
  "{{IncorporationNumber}}": { category: "Company", description: "Corporation registration number" },
  "{{CompanyKey}}": { category: "Company", description: "Unique company identifier key" },
  "{{Jurisdiction}}": { category: "Company", description: "Jurisdiction of incorporation" },
  "{{FormationDate}}": { category: "Company", description: "Date of incorporation" },
  "{{AmendmentDate}}": { category: "Company", description: "Date of last amendment" },
  "{{PreviousCorporationName}}": { category: "Company", description: "Previous name before amendment" },
  "{{AmendmentDetails}}": { category: "Company", description: "Details of corporate amendments" },
  "{{CreatedAt}}": { category: "Company", description: "Entity creation date in system" },
  "{{UpdatedAt}}": { category: "Company", description: "Last update date in system" },
  
  // Addresses
  "{{RegisteredOffice}}": { category: "Addresses", description: "Registered office address" },
  "{{RecordsOffice}}": { category: "Addresses", description: "Records office address" },
  "{{MailingAddress}}": { category: "Addresses", description: "Mailing address" },
  "{{AuthRepAddress}}": { category: "Addresses", description: "Authorized representative address" },
  
  // Compliance & Annual Returns
  "{{AnnualReturnDueAt}}": { category: "Compliance", description: "Annual return due date" },
  "{{AnnualReturnReminderEmail}}": { category: "Compliance", description: "Reminder email for annual return" },
  "{{AnnualReturnReminderDays}}": { category: "Compliance", description: "Days before due date for reminder" },
  
  // Authorized Representative
  "{{AuthRepName}}": { category: "Authorized Rep", description: "Authorized representative name" },
  "{{AuthRepCompany}}": { category: "Authorized Rep", description: "Authorized representative company" },
  "{{AuthRepEmail}}": { category: "Authorized Rep", description: "Authorized representative email" },
  "{{AuthRepPhone}}": { category: "Authorized Rep", description: "Authorized representative phone" },
  
  // People & Roles - Directors
  "{{DirectorNames}}": { category: "People", description: "List of all directors" },
  "{{FirstDirector}}": { category: "People", description: "Primary director name" },
  "{{DirectorCount}}": { category: "People", description: "Total number of directors" },
  "{{DirectorDetails}}": { category: "People", description: "Directors with appointment dates" },
  
  // People & Roles - Officers
  "{{President}}": { category: "People", description: "President name" },
  "{{CEO}}": { category: "People", description: "Chief Executive Officer name" },
  "{{CFO}}": { category: "People", description: "Chief Financial Officer name" },
  "{{CTO}}": { category: "People", description: "Chief Technology Officer name" },
  "{{COO}}": { category: "People", description: "Chief Operating Officer name" },
  "{{Secretary}}": { category: "People", description: "Secretary name" },
  "{{Treasurer}}": { category: "People", description: "Treasurer name" },
  "{{Officers}}": { category: "People", description: "List of all officers with titles" },
  "{{OfficerCount}}": { category: "People", description: "Total number of officers" },
  
  // People & Roles - Shareholders
  "{{Shareholders}}": { category: "People", description: "List of shareholders" },
  "{{ShareholderCount}}": { category: "People", description: "Total number of shareholders" },
  
  // People & Roles - All People
  "{{AllPeople}}": { category: "People", description: "Complete list of all people" },
  "{{PeopleCount}}": { category: "People", description: "Total number of people" },
  "{{FirstPersonFirstName}}": { category: "People", description: "First person's first name" },
  "{{FirstPersonLastName}}": { category: "People", description: "First person's last name" },
  "{{FirstPersonEmail}}": { category: "People", description: "First person's email" },
  "{{FirstPersonDOB}}": { category: "People", description: "First person's date of birth" },
  
  // Share Classes & Capital Structure
  "{{ShareClasses}}": { category: "Shares", description: "Share class names" },
  "{{ShareClassCount}}": { category: "Shares", description: "Number of share classes" },
  "{{ShareClassDetails}}": { category: "Shares", description: "Detailed share class information with rights" },
  "{{AuthorizedShares}}": { category: "Shares", description: "Total authorized shares" },
  "{{FirstShareClassName}}": { category: "Shares", description: "First share class name" },
  "{{FirstShareClassCode}}": { category: "Shares", description: "First share class short code" },
  "{{FirstShareClassRights}}": { category: "Shares", description: "First share class special rights" },
  
  // Share Issuances & Financial
  "{{IssuedShares}}": { category: "Shares", description: "Total number of issued shares" },
  "{{IssuanceCount}}": { category: "Shares", description: "Number of share issuances" },
  "{{TotalShareValue}}": { category: "Shares", description: "Total value of all issued shares" },
  "{{LatestIssuanceDate}}": { category: "Shares", description: "Most recent share issuance date" },
  "{{LatestIssuanceShares}}": { category: "Shares", description: "Shares in most recent issuance" },
  "{{LatestIssuancePrice}}": { category: "Shares", description: "Price of most recent issuance" },
  "{{LatestIssuanceCert}}": { category: "Shares", description: "Certificate number of latest issuance" },
  "{{SharePrice}}": { category: "Shares", description: "Price per share" },
  "{{TotalValue}}": { category: "Shares", description: "Total share value" },
  
  // System & Dates
  "{{CurrentDate}}": { category: "System", description: "Current date" },
  "{{CurrentYear}}": { category: "System", description: "Current year" },
  "{{Currency}}": { category: "System", description: "Currency (CAD/USD)" },
  "{{FiscalYearEnd}}": { category: "System", description: "Fiscal year end date" },
  
  // Entity Relationships
  "{{ParentCompany}}": { category: "Relationships", description: "Parent company name (if exists)" },
  "{{ParentCompanies}}": { category: "Relationships", description: "List of all parent companies" },
  "{{SubsidiaryCompanies}}": { category: "Relationships", description: "List of subsidiary companies" },
  "{{RelatedEntities}}": { category: "Relationships", description: "List of related companies" },
  "{{CorporateStructure}}": { category: "Relationships", description: "Formatted corporate hierarchy with relationship types" },
  "{{OwnershipPercentages}}": { category: "Relationships", description: "Ownership information and percentages for related entities" },
};

export function DocumentEditor({
  documentId,
  orgId,
  initialContent = "",
  initialTitle = "",
  onSave,
  onClose,
  isFullscreen = false,
  onToggleFullscreen,
}: DocumentEditorProps) {
  const { currentEntity, setCurrentEntity } = useEntityContext();
  const { toast } = useToast();
  const [content, setContent] = useState(initialContent);
  const [originalTemplate, setOriginalTemplate] = useState(initialContent); // Store original template
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [documentName, setDocumentName] = useState("");
  const [selectedEntityId, setSelectedEntityId] = useState(orgId || currentEntity?.id || "");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    company: true,
    people: true,
    shares: false,
    relationships: false,
    variables: false,
  });
  const quillRef = useRef<ReactQuill>(null);

  // Register custom Quill format once on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).Quill) {
      const Quill = (window as any).Quill;
      
      // Check if already registered to avoid duplicate registration
      if (!Quill.imports['formats/data-field']) {
        const Inline = Quill.import('blots/inline');
        
        class DataFieldBlot extends Inline {
          static blotName = 'data-field';
          static tagName = 'span';
          static className = 'data-field';
          
          static create(value: string) {
            const node = super.create();
            node.setAttribute('data-field-name', value);
            node.setAttribute('title', `Field: ${value.replace(/[{}]/g, '')}`);
            return node;
          }
          
          static formats(node: HTMLElement) {
            return node.getAttribute('data-field-name');
          }
        }
        
        Quill.register(DataFieldBlot);
      }
    }
  }, []);

  // Fetch all entities for entity selection
  const { data: allEntities = [] } = useQuery({
    queryKey: ["/api/orgs"],
  });

  // Fetch document data
  const { data: documentData } = useQuery({
    queryKey: ["/api/documents", documentId],
    enabled: !!documentId,
  });

  // Use selected entity ID for fetching entity data
  const effectiveOrgId = selectedEntityId || orgId;
  
  // Fetch entity data for variable insertion
  const { data: entityData, isLoading, error } = useQuery<EntityData>({
    queryKey: ["/api/orgs", effectiveOrgId, "editor-data"],
    enabled: !!effectiveOrgId,
  });


  // Update document name when data is loaded or initial title provided
  useEffect(() => {
    if (documentData && typeof documentData === 'object' && 'fileKey' in documentData && documentData.fileKey) {
      setDocumentName(documentData.fileKey as string);
    } else if (initialTitle) {
      setDocumentName(initialTitle);
    }
  }, [documentData, initialTitle]);

  // Function to auto-populate template placeholders with entity data
  const populateTemplatePlaceholders = (templateContent: string) => {
    if (!entityData?.organization) return { content: templateContent, replacements: [] };

    const replacements: Array<{start: number, length: number, variable: string}> = [];
    let result = templateContent;
    let offset = 0;

    const regex = /\{\{([^}]+)\}\}/g;
    let match;

    while ((match = regex.exec(templateContent)) !== null) {
      const placeholder = match[0];
      const value = computeTemplateValue(placeholder);

      if (value !== 'Not set') {
        const startPos = match.index + offset;
        result = result.substring(0, startPos) + value + result.substring(startPos + placeholder.length);

        replacements.push({
          start: startPos,
          length: value.length,
          variable: placeholder
        });

        offset += value.length - placeholder.length;
      }
    }

    return { content: result, replacements };
  };

  // Store original template when initialContent changes
  useEffect(() => {
    if (initialContent) {
      setOriginalTemplate(initialContent);
      setContent(initialContent);
    }
  }, [initialContent]);

  // Auto-populate template when entity selection changes or document loads
  useEffect(() => {
    if (!entityData?.organization) return;
    
    const quill = quillRef.current?.getEditor();
    if (!quill) return;
    
    // Get current plain text to find placeholder positions
    const currentText = quill.getText();
    
    // Check if content has any template variables to replace
    const hasVariables = /\{\{([^}]+)\}\}/.test(currentText);
    if (!hasVariables) return;
    
    // Find all placeholder matches and their positions
    const regex = /\{\{([^}]+)\}\}/g;
    const matches: Array<{index: number, placeholder: string, value: string}> = [];
    let match;
    
    while ((match = regex.exec(currentText)) !== null) {
      const placeholder = match[0];
      const value = computeTemplateValue(placeholder);
      
      if (value !== 'Not set') {
        matches.push({
          index: match.index,
          placeholder,
          value
        });
      }
    }
    
    if (matches.length === 0) return;
    
    // Disable undo/redo during batch operations
    quill.history.clear();
    
    // Process matches in reverse order to maintain correct indices
    matches.reverse().forEach(({ index, placeholder, value }) => {
      // Delete the placeholder text
      quill.deleteText(index, placeholder.length);
      
      // Insert the replacement value with data-field formatting
      quill.insertText(index, value, {
        'data-field': placeholder
      });
    });
    
    // Update the content state to match editor
    setContent(quill.root.innerHTML);
    
  }, [entityData, selectedEntityId, documentId, initialContent]);

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(content);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNameSave = async () => {
    if (!documentName.trim() || !documentId) return;
    
    setIsSaving(true);
    try {
      await apiRequest("PUT", `/api/documents/${documentId}/rename`, {
        fileKey: documentName.trim()
      });
      
      toast({
        title: "Success",
        description: "Document renamed successfully",
      });
      
      setIsEditingName(false);
      
      // Refresh the document data to get the updated name
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to rename document",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleNameEdit = () => {
    setIsEditingName(true);
  };

  const handleNameCancel = () => {
    setIsEditingName(false);
    if (documentData && typeof documentData === 'object' && 'fileKey' in documentData && documentData.fileKey) {
      setDocumentName(documentData.fileKey as string);
    }
  };

  const handleExportPDF = async () => {
    if (!documentId || !content) {
      toast({
        title: "Error",
        description: "No content to export",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/export-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error('Failed to export PDF');
      }

      // Get the filename from response headers or use document name
      const filename = (documentData && typeof documentData === 'object' && 'fileKey' in documentData && documentData.fileKey 
        ? (documentData.fileKey as string).replace('.docx', '.pdf') 
        : 'document.pdf');
      
      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "PDF exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export PDF",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Keyboard shortcuts for professional editing experience
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // Escape to close
      if (e.key === 'Escape') {
        onClose?.();
      }
      // Ctrl/Cmd + E to toggle fullscreen
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        onToggleFullscreen?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, onClose, onToggleFullscreen]);

  // Helper function to compute actual template values from entityData
  const computeTemplateValue = (variable: string): string => {
    if (!entityData?.organization) return 'Not set';

    const formatDate = (date: string | Date | null | undefined): string => {
      if (!date) return 'Not set';
      try {
        return format(new Date(date), 'MMMM dd, yyyy');
      } catch {
        return 'Not set';
      }
    };

    const formatAddress = (address: any): string => {
      if (!address) return 'Not set';
      const parts = [
        address.line1,
        address.line2,
        address.city,
        address.region,
        address.postal,
        address.country
      ].filter(Boolean);
      return parts.length > 0 ? parts.join(', ') : 'Not set';
    };

    const getAddressByRef = (refId: string | null): string => {
      if (!refId || !entityData.addresses) return 'Not set';
      const address = entityData.addresses.find(addr => addr.id === refId);
      return formatAddress(address);
    };

    switch (variable) {
      // Company Information
      case '{{CompanyName}}':
        return entityData.organization.name || 'Not set';
      case '{{COMPANYNAME}}':
        return entityData.organization.name?.toUpperCase() || 'NOT SET';
      case '{{CompanyNumber}}':
      case '{{IncorporationNumber}}':
        return entityData.organization.number || 'Not set';
      case '{{Jurisdiction}}':
        return entityData.organization.jurisdiction || 'Not set';
      case '{{FormationDate}}':
        return formatDate(entityData.organization.formationAt);
      case '{{AmendmentDate}}':
        return formatDate(entityData.organization.amendmentDate);
      case '{{PreviousCorporationName}}':
        return entityData.organization.previousCorporationName || 'Not set';
      case '{{AmendmentDetails}}':
        return entityData.organization.amendmentDetails || 'Not set';
      case '{{CreatedAt}}':
        return formatDate(entityData.organization.createdAt);
      case '{{UpdatedAt}}':
        return formatDate(entityData.organization.updatedAt);

      // Addresses
      case '{{RegisteredOffice}}':
        return getAddressByRef(entityData.organization.registeredOfficeId);
      case '{{RecordsOffice}}':
        return getAddressByRef(entityData.organization.recordsOfficeId);
      case '{{MailingAddress}}':
        return getAddressByRef(entityData.organization.mailingAddressId);
      case '{{AuthRepAddress}}':
        return getAddressByRef(entityData.organization.authRepAddressId);

      // Authorized Representative
      case '{{AuthRepName}}':
        return entityData.organization.authRepName || 'Not set';
      case '{{AuthRepCompany}}':
        return entityData.organization.authRepCompany || 'Not set';
      case '{{AuthRepEmail}}':
        return entityData.organization.authRepEmail || 'Not set';
      case '{{AuthRepPhone}}':
        return entityData.organization.authRepPhone || 'Not set';

      // Compliance
      case '{{AnnualReturnDueAt}}':
        return formatDate(entityData.organization.annualReturnDueAt);
      case '{{AnnualReturnReminderEmail}}':
        return entityData.organization.annualReturnReminderEmail || 'Not set';
      case '{{AnnualReturnReminderDays}}':
        return entityData.organization.annualReturnReminderDays?.toString() || '30';

      // People & Roles - Directors
      case '{{DirectorNames}}': {
        const directors = entityData.people?.filter(p => p.roles.some(r => r.role.toLowerCase() === 'director')) || [];
        return directors.length > 0 
          ? directors.map(p => `${p.firstName} ${p.lastName}`).join(', ')
          : 'Not set';
      }
      case '{{FirstDirector}}': {
        const directors = entityData.people?.filter(p => p.roles.some(r => r.role.toLowerCase() === 'director')) || [];
        return directors.length > 0 ? `${directors[0].firstName} ${directors[0].lastName}` : 'Not set';
      }
      case '{{DirectorCount}}': {
        const directors = entityData.people?.filter(p => p.roles.some(r => r.role.toLowerCase() === 'director')) || [];
        return directors.length.toString();
      }
      case '{{DirectorDetails}}': {
        const directors = entityData.people?.filter(p => p.roles.some(r => r.role.toLowerCase() === 'director')) || [];
        return directors.length > 0
          ? directors.map(p => {
              const role = p.roles.find(r => r.role.toLowerCase() === 'director');
              const start = role?.startAt ? formatDate(role.startAt) : 'Unknown';
              const end = role?.endAt ? formatDate(role.endAt) : 'Present';
              return `${p.firstName} ${p.lastName} (${start} - ${end})`;
            }).join(', ')
          : 'Not set';
      }

      // Officers by Title
      case '{{President}}':
      case '{{CEO}}':
      case '{{CFO}}':
      case '{{CTO}}':
      case '{{COO}}':
      case '{{Secretary}}':
      case '{{Treasurer}}': {
        const title = variable.replace(/[{}]/g, '').toLowerCase();
        const officer = entityData.people?.find(p => 
          p.roles.some(r => r.role.toLowerCase() === 'officer' && r.title?.toLowerCase().includes(title))
        );
        return officer ? `${officer.firstName} ${officer.lastName}` : 'Not set';
      }
      case '{{Officers}}': {
        const officers = entityData.people?.filter(p => p.roles.some(r => r.role.toLowerCase() === 'officer')) || [];
        return officers.length > 0
          ? officers.map(p => {
              const role = p.roles.find(r => r.role.toLowerCase() === 'officer');
              return `${p.firstName} ${p.lastName} (${role?.title || 'Officer'})`;
            }).join(', ')
          : 'Not set';
      }
      case '{{OfficerCount}}': {
        const officers = entityData.people?.filter(p => p.roles.some(r => r.role.toLowerCase() === 'officer')) || [];
        return officers.length.toString();
      }

      // Shareholders
      case '{{Shareholders}}': {
        const shareholders = entityData.people?.filter(p => p.roles.some(r => r.role.toLowerCase() === 'shareholder')) || [];
        return shareholders.length > 0
          ? shareholders.map(p => `${p.firstName} ${p.lastName}`).join(', ')
          : 'Not set';
      }
      case '{{ShareholderCount}}': {
        const shareholders = entityData.people?.filter(p => p.roles.some(r => r.role.toLowerCase() === 'shareholder')) || [];
        return shareholders.length.toString();
      }

      // All People
      case '{{AllPeople}}':
        return entityData.people && entityData.people.length > 0
          ? entityData.people.map(p => `${p.firstName} ${p.lastName}`).join(', ')
          : 'Not set';
      case '{{PeopleCount}}':
        return entityData.people?.length.toString() || '0';
      case '{{FirstPersonFirstName}}':
        return entityData.people?.[0]?.firstName || 'Not set';
      case '{{FirstPersonLastName}}':
        return entityData.people?.[0]?.lastName || 'Not set';
      case '{{FirstPersonEmail}}':
        return entityData.people?.[0]?.email || 'Not set';
      case '{{FirstPersonDOB}}':
        return formatDate(entityData.people?.[0]?.dob);

      // Share Classes
      case '{{ShareClasses}}':
        return entityData.shareClasses && entityData.shareClasses.length > 0
          ? entityData.shareClasses.map(sc => sc.name).join(', ')
          : 'Not set';
      case '{{ShareClassCount}}':
        return entityData.shareClasses?.length.toString() || '0';
      case '{{ShareClassDetails}}': {
        if (!entityData.shareClasses || entityData.shareClasses.length === 0) return 'Not set';
        return entityData.shareClasses.map(sc => {
          const rights = [];
          if (sc.voting) rights.push('Voting');
          if (sc.participating) rights.push('Participating');
          if (sc.redemption) rights.push('Redeemable');
          return `${sc.name} (${sc.shortCode}) - ${rights.join(', ')}`;
        }).join('; ');
      }
      case '{{AuthorizedShares}}':
        return '0';
      case '{{FirstShareClassName}}':
        return entityData.shareClasses?.[0]?.name || 'Not set';
      case '{{FirstShareClassCode}}':
        return entityData.shareClasses?.[0]?.shortCode || 'Not set';
      case '{{FirstShareClassRights}}':
        return entityData.shareClasses?.[0]?.specialRights || 'Not set';

      // Share Issuances
      case '{{IssuedShares}}': {
        const total = entityData.shareIssuances?.reduce((sum, iss) => sum + (iss.quantity || 0), 0) || 0;
        return total.toLocaleString();
      }
      case '{{IssuanceCount}}':
        return entityData.shareIssuances?.length.toString() || '0';
      case '{{TotalShareValue}}': {
        const total = entityData.shareIssuances?.reduce((sum, iss) => 
          sum + ((iss.quantity || 0) * parseFloat(iss.issuePrice || '0')), 0) || 0;
        return total.toLocaleString();
      }
      case '{{LatestIssuanceDate}}': {
        const sorted = entityData.shareIssuances?.sort((a, b) => 
          new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()) || [];
        return sorted[0] ? formatDate(sorted[0].issueDate) : 'Not set';
      }
      case '{{LatestIssuanceShares}}': {
        const sorted = entityData.shareIssuances?.sort((a, b) => 
          new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()) || [];
        return sorted[0]?.quantity?.toLocaleString() || 'Not set';
      }
      case '{{LatestIssuancePrice}}': {
        const sorted = entityData.shareIssuances?.sort((a, b) => 
          new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()) || [];
        return sorted[0]?.issuePrice || 'Not set';
      }
      case '{{LatestIssuanceCert}}': {
        const sorted = entityData.shareIssuances?.sort((a, b) => 
          new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()) || [];
        return sorted[0]?.certNumber || 'Not set';
      }

      // System & Dates
      case '{{CurrentDate}}':
        return format(new Date(), 'MMMM dd, yyyy');
      case '{{CurrentYear}}':
        return new Date().getFullYear().toString();
      case '{{Currency}}':
        return entityData.organization.jurisdiction?.includes('Canada') || 
               entityData.organization.jurisdiction?.includes('CA') ? 'CAD' : 'USD';
      case '{{FiscalYearEnd}}':
        return entityData.organization.formationAt 
          ? `December 31, ${new Date(entityData.organization.formationAt).getFullYear()}`
          : `December 31, ${new Date().getFullYear()}`;

      // Entity Relationships
      case '{{ParentCompany}}':
        return entityData.parentCompanies?.[0]?.name || 'Not set';
      case '{{ParentCompanies}}':
        return entityData.parentCompanies && entityData.parentCompanies.length > 0
          ? entityData.parentCompanies.map(p => p.name).join(', ')
          : 'Not set';
      case '{{SubsidiaryCompanies}}':
        return entityData.subsidiaryCompanies && entityData.subsidiaryCompanies.length > 0
          ? entityData.subsidiaryCompanies.map(s => s.name).join(', ')
          : 'Not set';
      case '{{RelatedEntities}}':
        return entityData.relatedEntities && entityData.relatedEntities.length > 0
          ? entityData.relatedEntities.map(r => r.name).join(', ')
          : 'Not set';
      case '{{CorporateStructure}}': {
        const parts = [];
        if (entityData.parentCompanies?.length) {
          parts.push(`Parents: ${entityData.parentCompanies.map(p => p.name).join(', ')}`);
        }
        if (entityData.subsidiaryCompanies?.length) {
          parts.push(`Subsidiaries: ${entityData.subsidiaryCompanies.map(s => s.name).join(', ')}`);
        }
        return parts.length > 0 ? parts.join('; ') : 'Not set';
      }
      case '{{OwnershipPercentages}}': {
        const ownerships = entityData.relationships?.filter(rel => 
          rel.ownershipPercentage && Number(rel.ownershipPercentage) > 0
        ) || [];
        return ownerships.length > 0
          ? ownerships.map(rel => `${rel.ownershipPercentage}% ownership`).join(', ')
          : 'Not set';
      }

      default:
        return 'Not set';
    }
  };

  // Get friendly field name from variable
  const getFriendlyFieldName = (variable: string): string => {
    const name = variable.replace(/[{}]/g, '');
    return name.replace(/([A-Z])/g, ' $1').trim();
  };

  const insertVariable = (variable: string) => {
    // Insert the actual computed value instead of the placeholder
    const actualValue = computeTemplateValue(variable);
    const quill = quillRef.current?.getEditor();
    if (quill) {
      const range = quill.getSelection();
      if (range) {
        quill.insertText(range.index, actualValue);
        // Apply the data-field format to the inserted text
        quill.formatText(range.index, actualValue.length, 'data-field', variable);
        quill.setSelection(range.index + actualValue.length);
      }
    }
  };

  const insertEntityData = (data: string) => {
    const quill = quillRef.current?.getEditor();
    if (quill) {
      const range = quill.getSelection();
      if (range) {
        quill.insertText(range.index, data);
        quill.setSelection(range.index + data.length);
      }
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const groupedVariables = Object.entries(TEMPLATE_VARIABLES).reduce((acc, [variable, info]) => {
    if (!acc[info.category]) acc[info.category] = [];
    acc[info.category].push({ variable, description: info.description });
    return acc;
  }, {} as Record<string, Array<{ variable: string; description: string }>>);

  const handleEntitySelect = (entityId: string) => {
    setSelectedEntityId(entityId);
    const selectedEntity = (allEntities as any[]).find((entity: any) => entity.id === entityId);
    if (selectedEntity) {
      setCurrentEntity(selectedEntity);
      toast({
        title: "Entity Selected",
        description: `Now using ${selectedEntity.name} for document generation`,
      });
    }
  };

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'direction': 'rtl' }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'font': [] }],
      [{ 'align': [] }],
      ['clean'],
      ['link', 'image'],
    ],
  };

  return (
    <>
      {/* Full-screen backdrop overlay */}
      <div className="fixed inset-0 z-50 bg-black/50 animate-in fade-in-0" onClick={onClose} />
      
      {/* Document Editor Modal */}
      <div className={`fixed inset-4 z-50 bg-background border rounded-lg shadow-2xl animate-in slide-in-from-bottom-4 duration-300 ${isFullscreen ? 'inset-0 rounded-none' : ''} flex h-[calc(100vh-2rem)]`}>
        {/* Data Panel Sidebar */}
        <div className="w-80 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b bg-background">
          <h3 className="font-semibold text-lg">Document Data</h3>
          <p className="text-sm text-muted-foreground">Insert data into your document</p>
        </div>

        {/* Selected Entity Indicator */}
        {effectiveOrgId && entityData?.organization && (
          <div className="px-4 py-2 border-b bg-green-50 dark:bg-green-950/20">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-green-100 dark:bg-green-900 rounded flex items-center justify-center">
                <span className="text-xs font-medium text-green-700 dark:text-green-300">
                  {entityData.organization.name.split(' ').map((word: string) => word[0]).join('').toUpperCase().slice(0, 2)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-green-800 dark:text-green-200 truncate">
                  {entityData.organization.name}
                </div>
                <div className="text-xs text-green-600 dark:text-green-400">
                  {entityData.organization.jurisdiction}
                </div>
              </div>
              <i className="fas fa-check-circle text-green-600 dark:text-green-400 text-sm"></i>
            </div>
          </div>
        )}

        {/* Entity Selector */}
        {!effectiveOrgId && (
          <div className="p-4 border-b bg-red-50 dark:bg-red-950/20">
            <div className="mb-3">
              <h4 className="font-semibold text-red-800 dark:text-red-200 mb-1">No Entity Selected</h4>
              <p className="text-sm text-red-600 dark:text-red-300">
                Please select an entity to use templates with entity data
              </p>
            </div>
            <Select value={selectedEntityId} onValueChange={handleEntitySelect}>
              <SelectTrigger className="w-full" data-testid="entity-selector-dropdown">
                <SelectValue placeholder="Select an entity..." />
              </SelectTrigger>
              <SelectContent>
                {(allEntities as any[]).map((entity: any) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-primary/20 rounded flex items-center justify-center">
                        <span className="text-xs font-medium text-primary">
                          {entity.name.split(' ').map((word: string) => word[0]).join('').toUpperCase().slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{entity.name}</div>
                        <div className="text-xs text-muted-foreground">{entity.jurisdiction}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Company Information */}
            <Collapsible 
              open={expandedSections.company} 
              onOpenChange={() => toggleSection('company')}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <h4 className="font-medium flex items-center gap-2">
                  <i className="fas fa-building text-primary"></i>
                  Company Information
                </h4>
                <i className={`fas fa-chevron-${expandedSections.company ? 'down' : 'right'} text-sm`}></i>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-2">
                {entityData?.organization && (
                  <Card>
                    <CardContent className="p-3 space-y-2">
                      <button
                        className="text-left text-sm hover:bg-muted p-2 rounded w-full"
                        onClick={() => insertEntityData(entityData.organization.name)}
                        data-testid="insert-company-name"
                      >
                        <div className="font-medium">{entityData.organization.name}</div>
                        <div className="text-xs text-muted-foreground">Company Name</div>
                      </button>
                      {entityData.organization.number && (
                        <button
                          className="text-left text-sm hover:bg-muted p-2 rounded w-full"
                          onClick={() => insertEntityData(entityData.organization.number || '')}
                          data-testid="insert-company-number"
                        >
                          <div className="font-medium">{entityData.organization.number}</div>
                          <div className="text-xs text-muted-foreground">Corporation Number</div>
                        </button>
                      )}
                      <button
                        className="text-left text-sm hover:bg-muted p-2 rounded w-full"
                        onClick={() => insertEntityData(entityData.organization.jurisdiction)}
                        data-testid="insert-jurisdiction"
                      >
                        <div className="font-medium">{entityData.organization.jurisdiction}</div>
                        <div className="text-xs text-muted-foreground">Jurisdiction</div>
                      </button>
                      {entityData.organization.formationAt && (
                        <button
                          className="text-left text-sm hover:bg-muted p-2 rounded w-full"
                          onClick={() => insertEntityData(format(new Date(entityData.organization.formationAt!), 'MMMM dd, yyyy'))}
                          data-testid="insert-formation-date"
                        >
                          <div className="font-medium">{format(new Date(entityData.organization.formationAt), 'MMMM dd, yyyy')}</div>
                          <div className="text-xs text-muted-foreground">Formation Date</div>
                        </button>
                      )}
                      {entityData.organization.amendmentDate && (
                        <button
                          className="text-left text-sm hover:bg-muted p-2 rounded w-full"
                          onClick={() => insertEntityData(format(new Date(entityData.organization.amendmentDate!), 'MMMM dd, yyyy'))}
                          data-testid="insert-amendment-date"
                        >
                          <div className="font-medium">{format(new Date(entityData.organization.amendmentDate), 'MMMM dd, yyyy')}</div>
                          <div className="text-xs text-muted-foreground">Amendment Date</div>
                        </button>
                      )}
                      {entityData.organization.previousCorporationName && (
                        <button
                          className="text-left text-sm hover:bg-muted p-2 rounded w-full"
                          onClick={() => insertEntityData(entityData.organization.previousCorporationName || '')}
                          data-testid="insert-previous-name"
                        >
                          <div className="font-medium">{entityData.organization.previousCorporationName}</div>
                          <div className="text-xs text-muted-foreground">Previous Corporation Name</div>
                        </button>
                      )}
                      {entityData.organization.amendmentDetails && (
                        <button
                          className="text-left text-sm hover:bg-muted p-2 rounded w-full"
                          onClick={() => insertEntityData(entityData.organization.amendmentDetails || '')}
                          data-testid="insert-amendment-details"
                        >
                          <div className="font-medium">{entityData.organization.amendmentDetails}</div>
                          <div className="text-xs text-muted-foreground">Amendment Details</div>
                        </button>
                      )}
                      {entityData.organization.registeredOfficeId && entityData.addresses && (() => {
                        const address = entityData.addresses.find(addr => addr.id === entityData.organization.registeredOfficeId);
                        if (!address) return null;
                        const addressStr = [address.line1, address.line2, address.city, address.region, address.postal, address.country].filter(Boolean).join(', ');
                        return (
                          <button
                            className="text-left text-sm hover:bg-muted p-2 rounded w-full"
                            onClick={() => insertEntityData(addressStr)}
                            data-testid="insert-registered-office"
                          >
                            <div className="font-medium">{addressStr}</div>
                            <div className="text-xs text-muted-foreground">Registered Office</div>
                          </button>
                        );
                      })()}
                      {entityData.organization.recordsOfficeId && entityData.addresses && (() => {
                        const address = entityData.addresses.find(addr => addr.id === entityData.organization.recordsOfficeId);
                        if (!address) return null;
                        const addressStr = [address.line1, address.line2, address.city, address.region, address.postal, address.country].filter(Boolean).join(', ');
                        return (
                          <button
                            className="text-left text-sm hover:bg-muted p-2 rounded w-full"
                            onClick={() => insertEntityData(addressStr)}
                            data-testid="insert-records-office"
                          >
                            <div className="font-medium">{addressStr}</div>
                            <div className="text-xs text-muted-foreground">Records Office</div>
                          </button>
                        );
                      })()}
                      {entityData.organization.mailingAddressId && entityData.addresses && (() => {
                        const address = entityData.addresses.find(addr => addr.id === entityData.organization.mailingAddressId);
                        if (!address) return null;
                        const addressStr = [address.line1, address.line2, address.city, address.region, address.postal, address.country].filter(Boolean).join(', ');
                        return (
                          <button
                            className="text-left text-sm hover:bg-muted p-2 rounded w-full"
                            onClick={() => insertEntityData(addressStr)}
                            data-testid="insert-mailing-address"
                          >
                            <div className="font-medium">{addressStr}</div>
                            <div className="text-xs text-muted-foreground">Mailing Address</div>
                          </button>
                        );
                      })()}
                      {entityData.organization.authRepName && (
                        <button
                          className="text-left text-sm hover:bg-muted p-2 rounded w-full"
                          onClick={() => insertEntityData(entityData.organization.authRepName || '')}
                          data-testid="insert-auth-rep-name"
                        >
                          <div className="font-medium">{entityData.organization.authRepName}</div>
                          <div className="text-xs text-muted-foreground">Authorized Representative Name</div>
                        </button>
                      )}
                      {entityData.organization.authRepCompany && (
                        <button
                          className="text-left text-sm hover:bg-muted p-2 rounded w-full"
                          onClick={() => insertEntityData(entityData.organization.authRepCompany || '')}
                          data-testid="insert-auth-rep-company"
                        >
                          <div className="font-medium">{entityData.organization.authRepCompany}</div>
                          <div className="text-xs text-muted-foreground">Authorized Representative Company</div>
                        </button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* People & Roles */}
            <Collapsible 
              open={expandedSections.people} 
              onOpenChange={() => toggleSection('people')}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <h4 className="font-medium flex items-center gap-2">
                  <i className="fas fa-users text-primary"></i>
                  People & Roles
                </h4>
                <i className={`fas fa-chevron-${expandedSections.people ? 'down' : 'right'} text-sm`}></i>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-2">
                {entityData?.people && entityData.people.length > 0 ? (
                  (() => {
                    // Consolidate people to avoid duplicates
                    const consolidatedPeople = entityData.people.reduce((acc, person) => {
                      const existingPerson = acc.find(p => p.id === person.id);
                      if (existingPerson) {
                        // Merge roles from duplicate person entries and deduplicate by role id
                        const roleIds = new Set(existingPerson.roles.map(r => r.id));
                        const newRoles = person.roles.filter(r => !roleIds.has(r.id));
                        existingPerson.roles = [...existingPerson.roles, ...newRoles];
                      } else {
                        acc.push({ ...person });
                      }
                      return acc;
                    }, [] as typeof entityData.people);

                    const directors = consolidatedPeople.filter(p => p.roles.some(r => r.role.toLowerCase() === 'director'));
                    const officers = consolidatedPeople.filter(p => p.roles.some(r => r.role.toLowerCase() === 'officer'));
                    const shareholders = consolidatedPeople.filter(p => p.roles.some(r => r.role.toLowerCase() === 'shareholder'));

                    return (
                      <div className="space-y-3">
                        {/* Directors */}
                        {directors.length > 0 && (
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium text-primary">Directors</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0 space-y-2">
                              {directors.map((person) => (
                                <button
                                  key={`director-${person.id}`}
                                  className="text-left text-sm hover:bg-muted p-2 rounded w-full"
                                  onClick={() => insertEntityData(`${person.firstName} ${person.lastName}`)}
                                  data-testid={`insert-director-${person.id}`}
                                >
                                  <div className="font-medium">{person.firstName} {person.lastName}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {person.email}
                                    <span className="ml-2 text-primary">
                                      {person.roles.filter(r => r.role.toLowerCase() === 'director').map(r => r.title).filter(Boolean).join(', ')}
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </CardContent>
                          </Card>
                        )}

                        {/* Officers */}
                        {officers.length > 0 && (
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium text-primary">Officers</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0 space-y-2">
                              {officers.map((person) => (
                                <button
                                  key={`officer-${person.id}`}
                                  className="text-left text-sm hover:bg-muted p-2 rounded w-full"
                                  onClick={() => insertEntityData(`${person.firstName} ${person.lastName}`)}
                                  data-testid={`insert-officer-${person.id}`}
                                >
                                  <div className="font-medium">{person.firstName} {person.lastName}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {person.email}
                                    <span className="ml-2 text-primary">
                                      {person.roles.filter(r => r.role.toLowerCase() === 'officer').map(r => r.title).filter(Boolean).join(', ')}
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </CardContent>
                          </Card>
                        )}

                        {/* Shareholders */}
                        {shareholders.length > 0 && (
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-medium text-primary">Shareholders</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0 space-y-2">
                              {shareholders.map((person) => (
                                <button
                                  key={`shareholder-${person.id}`}
                                  className="text-left text-sm hover:bg-muted p-2 rounded w-full"
                                  onClick={() => insertEntityData(`${person.firstName} ${person.lastName}`)}
                                  data-testid={`insert-shareholder-${person.id}`}
                                >
                                  <div className="font-medium">{person.firstName} {person.lastName}</div>
                                  <div className="text-xs text-muted-foreground">{person.email}</div>
                                </button>
                              ))}
                            </CardContent>
                          </Card>
                        )}

                        {/* All People (fallback) */}
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">All People</CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0 space-y-2">
                            {consolidatedPeople.map((person) => (
                              <button
                                key={person.id}
                                className="text-left text-sm hover:bg-muted p-2 rounded w-full"
                                onClick={() => insertEntityData(`${person.firstName} ${person.lastName}`)}
                                data-testid={`insert-person-${person.id}`}
                              >
                                <div className="font-medium">{person.firstName} {person.lastName}</div>
                                <div className="text-xs text-muted-foreground">
                                  {person.email}
                                  {person.roles.length > 0 && (
                                    <div className="mt-1">
                                      {person.roles.map(role => (
                                        <Badge key={role.id} variant="secondary" className="text-xs mr-1">
                                          {role.title || role.role}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </button>
                            ))}
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-sm text-muted-foreground italic">No people found</div>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Share Information */}
            <Collapsible 
              open={expandedSections.shares} 
              onOpenChange={() => toggleSection('shares')}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <h4 className="font-medium flex items-center gap-2">
                  <i className="fas fa-chart-pie text-primary"></i>
                  Share Information
                </h4>
                <i className={`fas fa-chevron-${expandedSections.shares ? 'down' : 'right'} text-sm`}></i>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-2">
                {entityData?.shareClasses && entityData.shareClasses.length > 0 ? (
                  <Card>
                    <CardContent className="p-3 space-y-2">
                      {entityData.shareClasses.map((shareClass) => (
                        <button
                          key={shareClass.id}
                          className="text-left text-sm hover:bg-muted p-2 rounded w-full"
                          onClick={() => insertEntityData(shareClass.name)}
                        >
                          <div className="font-medium">{shareClass.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Code: {shareClass.shortCode} • 
                            {shareClass.voting ? ' Voting' : ' Non-voting'}
                          </div>
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-sm text-muted-foreground italic">No share classes found</div>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Entity Relationships */}
            <Collapsible 
              open={expandedSections.relationships} 
              onOpenChange={() => toggleSection('relationships')}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <h4 className="font-medium flex items-center gap-2">
                  <i className="fas fa-sitemap text-primary"></i>
                  Entity Relationships
                </h4>
                <i className={`fas fa-chevron-${expandedSections.relationships ? 'down' : 'right'} text-sm`}></i>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-2">
                {entityData?.relationships && entityData.relationships.length > 0 ? (
                  <div className="space-y-3">
                    {/* Parent Companies */}
                    {entityData.parentCompanies && entityData.parentCompanies.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-primary">Parent Companies</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-2">
                          {entityData.parentCompanies.map((parent) => (
                            <button
                              key={`parent-${parent.id}`}
                              className="text-left text-sm hover:bg-muted p-2 rounded w-full"
                              onClick={() => insertEntityData(parent.name)}
                              data-testid={`insert-parent-${parent.id}`}
                            >
                              <div className="font-medium">{parent.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {parent.jurisdiction}
                                {parent.number && <span className="ml-2">#{parent.number}</span>}
                              </div>
                            </button>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {/* Subsidiary Companies */}
                    {entityData.subsidiaryCompanies && entityData.subsidiaryCompanies.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-primary">Subsidiaries</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-2">
                          {entityData.subsidiaryCompanies.map((subsidiary) => (
                            <button
                              key={`subsidiary-${subsidiary.id}`}
                              className="text-left text-sm hover:bg-muted p-2 rounded w-full"
                              onClick={() => insertEntityData(subsidiary.name)}
                              data-testid={`insert-subsidiary-${subsidiary.id}`}
                            >
                              <div className="font-medium">{subsidiary.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {subsidiary.jurisdiction}
                                {subsidiary.number && <span className="ml-2">#{subsidiary.number}</span>}
                              </div>
                            </button>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {/* Related Entities */}
                    {entityData.relatedEntities && entityData.relatedEntities.length > 0 && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-primary">Related Entities</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-2">
                          {entityData.relatedEntities.map((related) => (
                            <button
                              key={`related-${related.id}`}
                              className="text-left text-sm hover:bg-muted p-2 rounded w-full"
                              onClick={() => insertEntityData(related.name)}
                              data-testid={`insert-related-${related.id}`}
                            >
                              <div className="font-medium">{related.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {related.jurisdiction}
                                {related.number && <span className="ml-2">#{related.number}</span>}
                              </div>
                            </button>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {/* Ownership Information */}
                    {entityData.relationships?.some(rel => rel.ownershipPercentage && Number(rel.ownershipPercentage) > 0) && (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-primary">Ownership Information</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-2">
                          {entityData.relationships
                            .filter(rel => rel.ownershipPercentage && Number(rel.ownershipPercentage) > 0)
                            .map((rel) => {
                              const entityName = `Entity ${rel.parentEntityId || rel.childEntityId}`;
                              const ownershipText = `${entityName}: ${rel.ownershipPercentage}%`;
                              return (
                                <button
                                  key={`ownership-${rel.id}`}
                                  className="text-left text-sm hover:bg-muted p-2 rounded w-full"
                                  onClick={() => insertEntityData(ownershipText)}
                                  data-testid={`insert-ownership-${rel.id}`}
                                >
                                  <div className="font-medium">{entityName}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {rel.ownershipPercentage}% ownership • {rel.relationshipType}
                                  </div>
                                </button>
                              );
                            })}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground italic">No entity relationships found</div>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Template Variables */}
            <Collapsible 
              open={expandedSections.variables} 
              onOpenChange={() => toggleSection('variables')}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <h4 className="font-medium flex items-center gap-2">
                  <i className="fas fa-code text-primary"></i>
                  Template Variables
                </h4>
                <i className={`fas fa-chevron-${expandedSections.variables ? 'down' : 'right'} text-sm`}></i>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-3">
                {Object.entries(groupedVariables).map(([category, variables]) => (
                  <div key={category}>
                    <h5 className="text-xs font-medium text-muted-foreground uppercase mb-2">{category}</h5>
                    <div className="space-y-1">
                      {variables
                        .filter(({ variable }) => variable !== '{{CompanyKey}}')
                        .map(({ variable }) => {
                          const actualValue = computeTemplateValue(variable);
                          const fieldName = getFriendlyFieldName(variable);
                          const isEmpty = actualValue === 'Not set' || actualValue === 'NOT SET' || actualValue === '0';
                          
                          return (
                            <button
                              key={variable}
                              className="text-left text-xs hover:bg-muted p-2 rounded w-full"
                              onClick={() => insertVariable(variable)}
                              data-testid={`insert-variable-${variable.replace(/[{}]/g, '')}`}
                            >
                              <div className={`font-medium ${isEmpty ? 'text-muted-foreground' : 'text-foreground'}`}>
                                {actualValue}
                              </div>
                              <div className="text-xs text-muted-foreground">{fieldName}</div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </ScrollArea>
        </div>

        {/* Editor Panel */}
        <div className="flex-1 flex flex-col">
        {/* Enhanced Header */}
        <div className="border-b bg-background px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-full"
            >
              <i className="fas fa-arrow-left"></i>
            </Button>
            <div className="flex-1">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    value={documentName}
                    onChange={(e) => setDocumentName(e.target.value)}
                    className="text-xl font-semibold bg-transparent border-b border-primary focus:outline-none flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleNameSave();
                      if (e.key === 'Escape') handleNameCancel();
                    }}
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNameSave}
                    disabled={isSaving}
                  >
                    <i className="fas fa-check text-green-600"></i>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNameCancel}
                  >
                    <i className="fas fa-times text-red-600"></i>
                  </Button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <h1 
                      className="text-xl font-semibold cursor-pointer hover:text-primary transition-colors"
                      onClick={handleNameEdit}
                      title="Click to rename document"
                    >
                      {documentName || "Document Editor"}
                    </h1>
                    <Badge variant="outline" className="text-xs">
                      .docx
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {entityData?.organization?.name}
                    {isLoading && (
                      <Badge variant="secondary" className="ml-2">
                        <i className="fas fa-spinner fa-spin mr-1"></i>
                        Loading data...
                      </Badge>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportPDF}
              disabled={isSaving || !content}
              data-testid="export-pdf"
              title="Export as PDF"
              className="text-red-600 hover:text-red-700"
            >
              {isSaving ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <i className="fas fa-file-pdf"></i>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleFullscreen}
              data-testid="toggle-fullscreen"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              <i className={`fas fa-${isFullscreen ? 'compress' : 'expand'}`}></i>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              data-testid="save-document"
              className="text-primary hover:text-primary/80"
            >
              {isSaving ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <i className="fas fa-save"></i>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              data-testid="close-editor"
              title="Close Editor"
            >
              <i className="fas fa-times"></i>
            </Button>
          </div>
        </div>

        {/* Rich Text Editor */}
        <div className="flex-1 p-6 bg-white dark:bg-gray-900">
          <div className="h-full max-w-4xl mx-auto">
            <ReactQuill
              ref={quillRef}
              theme="snow"
              value={content}
              onChange={setContent}
              modules={quillModules}
              className="h-full border-0 shadow-none"
              placeholder="Start typing your document..."
              style={{
                height: '100%',
                border: 'none'
              }}
            />
          </div>
        </div>
        </div>
      </div>
    </>
  );
}