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
    variables: false,
  });
  const quillRef = useRef<ReactQuill>(null);

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
    if (!entityData?.organization) return templateContent;

    let populatedContent = templateContent;

    // COMPANY INFORMATION
    populatedContent = populatedContent.replace(/\{\{CompanyName\}\}/g, entityData.organization.name || '');
    populatedContent = populatedContent.replace(/\{\{Jurisdiction\}\}/g, entityData.organization.jurisdiction || '');
    populatedContent = populatedContent.replace(/\{\{IncorporationNumber\}\}/g, entityData.organization.number || '');
    populatedContent = populatedContent.replace(/\{\{CompanyKey\}\}/g, entityData.organization.companyKey || '');
    
    // DATES
    const formatDate = (date: string | Date | null) => {
      if (!date) return '';
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    populatedContent = populatedContent.replace(/\{\{FormationDate\}\}/g, formatDate(entityData.organization.formationAt));
    populatedContent = populatedContent.replace(/\{\{AmendmentDate\}\}/g, formatDate(entityData.organization.amendmentDate));
    populatedContent = populatedContent.replace(/\{\{CreatedAt\}\}/g, formatDate(entityData.organization.createdAt));
    populatedContent = populatedContent.replace(/\{\{UpdatedAt\}\}/g, formatDate(entityData.organization.updatedAt));

    // AMENDMENT INFORMATION  
    populatedContent = populatedContent.replace(/\{\{PreviousCorporationName\}\}/g, entityData.organization.previousCorporationName || '');
    populatedContent = populatedContent.replace(/\{\{AmendmentDetails\}\}/g, entityData.organization.amendmentDetails || '');

    // ANNUAL RETURN & COMPLIANCE
    populatedContent = populatedContent.replace(/\{\{AnnualReturnDueAt\}\}/g, formatDate(entityData.organization.annualReturnDueAt));
    populatedContent = populatedContent.replace(/\{\{AnnualReturnReminderEmail\}\}/g, entityData.organization.annualReturnReminderEmail || '');
    populatedContent = populatedContent.replace(/\{\{AnnualReturnReminderDays\}\}/g, entityData.organization.annualReturnReminderDays?.toString() || '30');

    // AUTHORIZED REPRESENTATIVE
    populatedContent = populatedContent.replace(/\{\{AuthRepName\}\}/g, entityData.organization.authRepName || '');
    populatedContent = populatedContent.replace(/\{\{AuthRepCompany\}\}/g, entityData.organization.authRepCompany || '');
    populatedContent = populatedContent.replace(/\{\{AuthRepEmail\}\}/g, entityData.organization.authRepEmail || '');
    populatedContent = populatedContent.replace(/\{\{AuthRepPhone\}\}/g, entityData.organization.authRepPhone || '');

    // ADDRESSES
    const formatAddress = (address: any) => {
      if (!address) return '';
      return [
        address.line1,
        address.line2,
        address.city,
        address.region,
        address.postal,
        address.country
      ].filter(Boolean).join(', ');
    };

    // Find addresses by type in the addresses array
    const getAddressByType = (type: string) => {
      if (!entityData.addresses) return null;
      // This is a simplified approach - actual address linking would need proper relations
      return entityData.addresses[0] || null; // Fallback to first address for now
    };

    populatedContent = populatedContent.replace(/\{\{RegisteredOffice\}\}/g, formatAddress(getAddressByType('registered')));
    populatedContent = populatedContent.replace(/\{\{RecordsOffice\}\}/g, formatAddress(getAddressByType('records')));
    populatedContent = populatedContent.replace(/\{\{MailingAddress\}\}/g, formatAddress(getAddressByType('mailing')));
    populatedContent = populatedContent.replace(/\{\{AuthRepAddress\}\}/g, formatAddress(getAddressByType('authRep')));

    // PEOPLE & ROLES
    if (entityData.people) {
      // Directors
      const directors = entityData.people.filter(person => 
        person.roles.some(role => role.role.toLowerCase() === 'director')
      );
      
      const directorNames = directors.map(person => `${person.firstName} ${person.lastName}`);
      populatedContent = populatedContent.replace(/\{\{DirectorNames\}\}/g, directorNames.join(', '));
      populatedContent = populatedContent.replace(/\{\{FirstDirector\}\}/g, directorNames[0] || '');
      populatedContent = populatedContent.replace(/\{\{DirectorCount\}\}/g, directors.length.toString());

      // Detailed director information with dates
      const directorDetails = directors.map(person => {
        const directorRole = person.roles.find(role => role.role.toLowerCase() === 'director');
        const startDate = directorRole?.startAt ? formatDate(directorRole.startAt) : '';
        const endDate = directorRole?.endAt ? formatDate(directorRole.endAt) : 'Present';
        return `${person.firstName} ${person.lastName} (${startDate} - ${endDate})`;
      });
      populatedContent = populatedContent.replace(/\{\{DirectorDetails\}\}/g, directorDetails.join(', '));

      // Officers by title
      const getOfficerByTitle = (title: string) => {
        const officer = entityData.people?.find(person => 
          person.roles.some(role => role.role.toLowerCase() === 'officer' && role.title?.toLowerCase().includes(title.toLowerCase()))
        );
        return officer ? `${officer.firstName} ${officer.lastName}` : '';
      };

      populatedContent = populatedContent.replace(/\{\{President\}\}/g, getOfficerByTitle('president'));
      populatedContent = populatedContent.replace(/\{\{CEO\}\}/g, getOfficerByTitle('ceo'));
      populatedContent = populatedContent.replace(/\{\{CFO\}\}/g, getOfficerByTitle('cfo'));
      populatedContent = populatedContent.replace(/\{\{Secretary\}\}/g, getOfficerByTitle('secretary'));
      populatedContent = populatedContent.replace(/\{\{Treasurer\}\}/g, getOfficerByTitle('treasurer'));
      populatedContent = populatedContent.replace(/\{\{CTO\}\}/g, getOfficerByTitle('cto'));
      populatedContent = populatedContent.replace(/\{\{COO\}\}/g, getOfficerByTitle('coo'));

      // All officers with titles
      const officers = entityData.people.filter(person => 
        person.roles.some(role => role.role.toLowerCase() === 'officer')
      );
      
      const officerList = officers.map(person => {
        const officerRole = person.roles.find(role => role.role.toLowerCase() === 'officer');
        return `${person.firstName} ${person.lastName} (${officerRole?.title || 'Officer'})`;
      });
      populatedContent = populatedContent.replace(/\{\{Officers\}\}/g, officerList.join(', '));
      populatedContent = populatedContent.replace(/\{\{OfficerCount\}\}/g, officers.length.toString());

      // Shareholders
      const shareholders = entityData.people.filter(person => 
        person.roles.some(role => role.role.toLowerCase() === 'shareholder')
      );
      
      const shareholderNames = shareholders.map(person => `${person.firstName} ${person.lastName}`);
      populatedContent = populatedContent.replace(/\{\{Shareholders\}\}/g, shareholderNames.join(', '));
      populatedContent = populatedContent.replace(/\{\{ShareholderCount\}\}/g, shareholders.length.toString());

      // All people (complete list)
      const allPeople = entityData.people.map(person => `${person.firstName} ${person.lastName}`);
      populatedContent = populatedContent.replace(/\{\{AllPeople\}\}/g, allPeople.join(', '));
      populatedContent = populatedContent.replace(/\{\{PeopleCount\}\}/g, entityData.people.length.toString());

      // Individual person details (for first person as example)
      if (entityData.people[0]) {
        const firstPerson = entityData.people[0];
        populatedContent = populatedContent.replace(/\{\{FirstPersonFirstName\}\}/g, firstPerson.firstName || '');
        populatedContent = populatedContent.replace(/\{\{FirstPersonLastName\}\}/g, firstPerson.lastName || '');
        populatedContent = populatedContent.replace(/\{\{FirstPersonEmail\}\}/g, firstPerson.email || '');
        populatedContent = populatedContent.replace(/\{\{FirstPersonDOB\}\}/g, formatDate(firstPerson.dob));
      }
    }

    // SHARE CLASSES & CAPITAL STRUCTURE
    if (entityData.shareClasses) {
      const shareClassNames = entityData.shareClasses.map(sc => sc.name);
      populatedContent = populatedContent.replace(/\{\{ShareClasses\}\}/g, shareClassNames.join(', '));
      populatedContent = populatedContent.replace(/\{\{ShareClassCount\}\}/g, entityData.shareClasses.length.toString());
      
      // Detailed share class information
      const shareClassDetails = entityData.shareClasses.map(sc => {
        const rights = [];
        if (sc.voting) rights.push('Voting');
        if (sc.participating) rights.push('Participating');
        if (sc.redemption) rights.push('Redeemable');
        return `${sc.name} (${sc.shortCode}) - ${rights.join(', ')}`;
      });
      populatedContent = populatedContent.replace(/\{\{ShareClassDetails\}\}/g, shareClassDetails.join('; '));
      
      // Calculate total authorized shares
      // Note: authorizedShares property doesn't exist in schema, using placeholder
      const totalAuthorized = 0; // entityData.shareClasses.reduce((sum, sc) => sum + (sc.authorizedShares || 0), 0);
      populatedContent = populatedContent.replace(/\{\{AuthorizedShares\}\}/g, totalAuthorized.toLocaleString());

      // First share class details
      if (entityData.shareClasses[0]) {
        const firstClass = entityData.shareClasses[0];
        populatedContent = populatedContent.replace(/\{\{FirstShareClassName\}\}/g, firstClass.name);
        populatedContent = populatedContent.replace(/\{\{FirstShareClassCode\}\}/g, firstClass.shortCode);
        populatedContent = populatedContent.replace(/\{\{FirstShareClassRights\}\}/g, firstClass.specialRights || '');
      }
    }

    // SHARE ISSUANCES
    if (entityData.shareIssuances) {
      const totalIssued = entityData.shareIssuances.reduce((sum, issuance) => sum + (issuance.quantity || 0), 0);
      populatedContent = populatedContent.replace(/\{\{IssuedShares\}\}/g, totalIssued.toLocaleString());
      populatedContent = populatedContent.replace(/\{\{IssuanceCount\}\}/g, entityData.shareIssuances.length.toString());
      
      // Calculate total value
      const totalValue = entityData.shareIssuances.reduce((sum, issuance) => 
        sum + ((issuance.quantity || 0) * (parseFloat(issuance.issuePrice || '0') || 0)), 0);
      populatedContent = populatedContent.replace(/\{\{TotalShareValue\}\}/g, totalValue.toLocaleString());
      
      // Most recent issuance
      const sortedIssuances = [...entityData.shareIssuances].sort((a, b) => 
        new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
      
      if (sortedIssuances[0]) {
        const latest = sortedIssuances[0];
        populatedContent = populatedContent.replace(/\{\{LatestIssuanceDate\}\}/g, formatDate(latest.issueDate));
        populatedContent = populatedContent.replace(/\{\{LatestIssuanceShares\}\}/g, latest.quantity?.toLocaleString() || '');
        populatedContent = populatedContent.replace(/\{\{LatestIssuancePrice\}\}/g, latest.issuePrice || '');
        populatedContent = populatedContent.replace(/\{\{LatestIssuanceCert\}\}/g, latest.certNumber || '');
      }
    }

    // SYSTEM & METADATA
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });
    populatedContent = populatedContent.replace(/\{\{CurrentDate\}\}/g, currentDate);
    
    const currentYear = new Date().getFullYear().toString();
    populatedContent = populatedContent.replace(/\{\{CurrentYear\}\}/g, currentYear);

    // Currency based on jurisdiction
    const currency = entityData.organization.jurisdiction?.includes('Canada') || 
                    entityData.organization.jurisdiction?.includes('CA') ? 'CAD' : 'USD';
    populatedContent = populatedContent.replace(/\{\{Currency\}\}/g, currency);

    // Fiscal year end (using formation month or default Dec 31)
    const formationDate = entityData.organization.formationAt ? new Date(entityData.organization.formationAt) : null;
    const fiscalYearEnd = formationDate ? 
      `December 31, ${formationDate.getFullYear()}` : 
      `December 31, ${currentYear}`;
    populatedContent = populatedContent.replace(/\{\{FiscalYearEnd\}\}/g, fiscalYearEnd);

    return populatedContent;
  };

  // Store original template when initialContent changes
  useEffect(() => {
    if (initialContent) {
      setOriginalTemplate(initialContent);
      setContent(initialContent);
    }
  }, [initialContent]);

  // Auto-populate template when entity data loads or entity selection changes
  useEffect(() => {
    if (originalTemplate && entityData?.organization && !documentId) {
      // Always re-populate from original template to ensure clean substitution
      const populatedContent = populateTemplatePlaceholders(originalTemplate);
      setContent(populatedContent);
    } else if (originalTemplate && !entityData?.organization) {
      // If no entity data, just use the original template
      setContent(originalTemplate);
    }
  }, [originalTemplate, entityData, selectedEntityId, documentId]);

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

  const insertVariable = (variable: string) => {
    const quill = quillRef.current?.getEditor();
    if (quill) {
      const range = quill.getSelection();
      if (range) {
        quill.insertText(range.index, variable);
        quill.setSelection(range.index + variable.length);
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
                        >
                          <div className="font-medium">{entityData.organization.number}</div>
                          <div className="text-xs text-muted-foreground">Corporation Number</div>
                        </button>
                      )}
                      <button
                        className="text-left text-sm hover:bg-muted p-2 rounded w-full"
                        onClick={() => insertEntityData(entityData.organization.jurisdiction)}
                      >
                        <div className="font-medium">{entityData.organization.jurisdiction}</div>
                        <div className="text-xs text-muted-foreground">Jurisdiction</div>
                      </button>
                      {entityData.organization.formationAt && (
                        <button
                          className="text-left text-sm hover:bg-muted p-2 rounded w-full"
                          onClick={() => insertEntityData(entityData.organization.formationAt ? format(entityData.organization.formationAt, 'MMM dd, yyyy') : 'Not set')}
                        >
                          <div className="font-medium">{entityData.organization.formationAt ? format(entityData.organization.formationAt, 'MMM dd, yyyy') : 'Not set'}</div>
                          <div className="text-xs text-muted-foreground">Formation Date</div>
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
                        // Merge roles from duplicate person entries
                        existingPerson.roles = [...existingPerson.roles, ...person.roles];
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
                      {variables.map(({ variable, description }) => (
                        <button
                          key={variable}
                          className="text-left text-xs hover:bg-muted p-2 rounded w-full"
                          onClick={() => insertVariable(variable)}
                          data-testid={`insert-variable-${variable.replace(/[{}]/g, '')}`}
                        >
                          <div className="font-mono text-primary">{variable}</div>
                          <div className="text-muted-foreground">{description}</div>
                        </button>
                      ))}
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