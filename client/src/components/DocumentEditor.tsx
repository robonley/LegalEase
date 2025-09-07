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
import { format } from "date-fns";
import type { Org, Person, ShareClass, ShareIssuance } from "@shared/schema";

interface DocumentEditorProps {
  documentId: string;
  orgId: string;
  initialContent?: string;
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
  onSave,
  onClose,
  isFullscreen = false,
  onToggleFullscreen,
}: DocumentEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    company: true,
    people: true,
    shares: false,
    variables: false,
  });
  const quillRef = useRef<ReactQuill>(null);

  // Fetch entity data for variable insertion
  const { data: entityData, isLoading } = useQuery<EntityData>({
    queryKey: ["/api/orgs", orgId, "editor-data"],
    enabled: !!orgId,
  });

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave(content);
    } finally {
      setIsSaving(false);
    }
  };

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
    <div className={`flex h-full ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}>
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
                          onClick={() => insertEntityData(format(entityData.organization.formationAt!, 'MMM dd, yyyy'))}
                        >
                          <div className="font-medium">{format(entityData.organization.formationAt, 'MMM dd, yyyy')}</div>
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
        {/* Toolbar */}
        <div className="border-b bg-background p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="font-semibold">Document Editor</h2>
            {isLoading && (
              <Badge variant="secondary">
                <i className="fas fa-spinner fa-spin mr-1"></i>
                Loading data...
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleFullscreen}
              data-testid="toggle-fullscreen"
            >
              <i className={`fas fa-${isFullscreen ? 'compress' : 'expand'} mr-2`}></i>
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              data-testid="save-document"
            >
              {isSaving ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Saving...
                </>
              ) : (
                <>
                  <i className="fas fa-save mr-2"></i>
                  Save
                </>
              )}
            </Button>
            {onClose && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                data-testid="close-editor"
              >
                <i className="fas fa-times mr-2"></i>
                Close
              </Button>
            )}
          </div>
        </div>

        {/* Rich Text Editor */}
        <div className="flex-1 p-4">
          <div className="h-full border rounded-lg overflow-hidden">
            <ReactQuill
              ref={quillRef}
              theme="snow"
              value={content}
              onChange={setContent}
              modules={quillModules}
              className="h-full"
              placeholder="Start typing your document..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}