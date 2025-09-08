import { useState, useEffect, useRef } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import type { Org, Person, ShareClass, ShareIssuance } from "@shared/schema";

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

interface EntityData {
  organization: Org;
  people: Person[];
  shareClasses: ShareClass[];
  shareIssuances: ShareIssuance[];
  addresses: any[];
}

const TEMPLATE_VARIABLES = {
  // Company Information
  "{{CompanyName}}": { category: "Company", description: "Legal name of the corporation" },
  "{{COMPANYNAME}}": { category: "Company", description: "Legal name (uppercase)" },
  "{{CompanyNumber}}": { category: "Company", description: "Corporate registration number" },
  "{{Jurisdiction}}": { category: "Company", description: "Jurisdiction of incorporation" },
  "{{FormationDate}}": { category: "Company", description: "Date of incorporation" },
  "{{RegisteredOffice}}": { category: "Company", description: "Registered office address" },
  "{{RecordsOffice}}": { category: "Company", description: "Records office address" },
  "{{MailingAddress}}": { category: "Company", description: "Mailing address" },
  
  // People & Roles
  "{{DirectorNames}}": { category: "People", description: "List of all directors" },
  "{{FirstDirector}}": { category: "People", description: "Primary director name" },
  "{{President}}": { category: "People", description: "President name" },
  "{{Secretary}}": { category: "People", description: "Secretary name" },
  "{{Treasurer}}": { category: "People", description: "Treasurer/CFO name" },
  "{{Officers}}": { category: "People", description: "List of all officers" },
  "{{Shareholders}}": { category: "People", description: "List of shareholders" },
  
  // Financial & Shares
  "{{AuthorizedShares}}": { category: "Shares", description: "Number of authorized shares" },
  "{{IssuedShares}}": { category: "Shares", description: "Number of issued shares" },
  "{{SharePrice}}": { category: "Shares", description: "Price per share" },
  "{{TotalValue}}": { category: "Shares", description: "Total share value" },
  "{{ShareClasses}}": { category: "Shares", description: "Share class names" },
  
  // Dates & Misc
  "{{CurrentDate}}": { category: "System", description: "Current date" },
  "{{FiscalYearEnd}}": { category: "Company", description: "Fiscal year end date" },
  "{{Currency}}": { category: "System", description: "Currency (CAD/USD)" },
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
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [documentName, setDocumentName] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    company: true,
    people: true,
    shares: false,
    variables: false,
  });
  const quillRef = useRef<ReactQuill>(null);
  const { toast } = useToast();

  // Fetch document data
  const { data: documentData } = useQuery({
    queryKey: ["/api/documents", documentId],
    enabled: !!documentId,
  });

  // Fetch entity data for variable insertion
  const { data: entityData, isLoading } = useQuery<EntityData>({
    queryKey: ["/api/orgs", orgId, "editor-data"],
    enabled: !!orgId,
  });

  // Update document name when data is loaded or initial title provided
  useEffect(() => {
    if (documentData && 'fileKey' in documentData && documentData.fileKey) {
      setDocumentName(documentData.fileKey);
    } else if (initialTitle) {
      setDocumentName(initialTitle);
    }
  }, [documentData, initialTitle]);

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
    if (documentData && 'fileKey' in documentData && documentData.fileKey) {
      setDocumentName(documentData.fileKey);
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
      const filename = documentData?.fileKey?.replace('.docx', '.pdf') || 'document.pdf';
      
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
                          onClick={() => insertEntityData(entityData.organization.number)}
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
                  <Card>
                    <CardContent className="p-3 space-y-2">
                      {entityData.people.map((person) => (
                        <button
                          key={person.id}
                          className="text-left text-sm hover:bg-muted p-2 rounded w-full"
                          onClick={() => insertEntityData(`${person.firstName} ${person.lastName}`)}
                          data-testid={`insert-person-${person.id}`}
                        >
                          <div className="font-medium">{person.firstName} {person.lastName}</div>
                          <div className="text-xs text-muted-foreground">{person.email}</div>
                        </button>
                      ))}
                    </CardContent>
                  </Card>
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