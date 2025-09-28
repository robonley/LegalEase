import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TemplateUploader } from "@/components/TemplateUploader";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Search, MoreHorizontal, Trash2, Eye, FileText, ChevronDown, ChevronRight } from "lucide-react";
import { useEntityContext } from "@/hooks/useEntityContext";
import { DocumentEditor } from "@/components/DocumentEditor";
import type { Template } from "@shared/schema";

export default function Templates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentEntity } = useEntityContext();
  const [activeTab, setActiveTab] = useState("starter");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showVariablesDialog, setShowVariablesDialog] = useState(false);
  const [showDocumentEditor, setShowDocumentEditor] = useState(false);
  const [selectedStarterTemplate, setSelectedStarterTemplate] = useState<any>(null);

  // Fetch starter templates
  const { data: starterTemplates = [], isLoading: loadingStarter } = useQuery<Template[]>({
    queryKey: ["/api/templates/starter"],
  });

  // Fetch custom templates
  const { data: customTemplates = [], isLoading: loadingCustom } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (templateId: string) => {
      await apiRequest("DELETE", `/api/templates/${templateId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getTemplateBadge = (scope: string, category?: string | null) => {
    if (category === 'minute-book') return <Badge variant="default">Minute Book</Badge>;
    if (scope === 'resolution') return <Badge variant="secondary">Resolution</Badge>;
    if (scope === 'register') return <Badge variant="outline">Register</Badge>;
    if (scope === 'bylaws') return <Badge variant="secondary">By-Laws</Badge>;
    if (scope === 'organization') return <Badge variant="default">Organization</Badge>;
    return <Badge>{scope}</Badge>;
  };

  const getTemplateIcon = (scope: string, category?: string | null) => {
    if (category === 'minute-book') return 'fas fa-book';
    if (scope === 'resolution') return 'fas fa-file-signature';
    if (scope === 'register') return 'fas fa-list-alt';
    if (scope === 'bylaws') return 'fas fa-gavel';
    if (scope === 'organization') return 'fas fa-building';
    return 'fas fa-file-alt';
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Unknown';
    return new Date(date).toLocaleDateString();
  };

  const filteredStarter = starterTemplates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (template.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  const filteredCustom = customTemplates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (template.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  const handlePreviewTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setShowPreviewDialog(true);
  };

  const handleViewVariables = (template: Template) => {
    setSelectedTemplate(template);
    setShowVariablesDialog(true);
  };

  const handleDeleteTemplate = (templateId: string) => {
    deleteMutation.mutate(templateId);
  };

  // Create common corporate resolutions for existing corporations
  const getCommonResolutions = () => {
    return [
      // Annual / Routine Resolutions
      {
        category: 'Annual / Routine Resolutions',
        type: 'Directors\' Resolutions',
        resolutions: [
          { id: 'annual-directors-financial', name: 'Approving Financial Statements', icon: 'fas fa-chart-line', content: '<h1>Resolution of the Board of Directors - Approving Financial Statements</h1><p>RESOLVED THAT the financial statements of the Corporation for the year ending [DATE] be and are hereby approved...</p>' },
          { id: 'annual-directors-officers', name: 'Appointing Officers', icon: 'fas fa-user-tie', content: '<h1>Resolution of the Board of Directors - Appointing Officers</h1><p>RESOLVED THAT the following persons be appointed as officers of the Corporation...</p>' },
          { id: 'annual-directors-dividends', name: 'Declaring Dividends', icon: 'fas fa-coins', content: '<h1>Resolution of the Board of Directors - Declaring Dividends</h1><p>RESOLVED THAT a dividend of $[AMOUNT] per share be declared...</p>' },
          { id: 'annual-directors-meeting', name: 'Calling Annual Shareholders Meeting', icon: 'fas fa-calendar', content: '<h1>Resolution of the Board of Directors - Calling Annual Meeting</h1><p>RESOLVED THAT the annual meeting of shareholders be called for [DATE]...</p>' }
        ]
      },
      {
        category: 'Annual / Routine Resolutions',
        type: 'Shareholders\' Resolutions',
        resolutions: [
          { id: 'annual-shareholders-directors', name: 'Electing Directors', icon: 'fas fa-vote-yea', content: '<h1>Resolution of the Shareholders - Electing Directors</h1><p>RESOLVED THAT the following persons be elected as directors of the Corporation...</p>' },
          { id: 'annual-shareholders-auditor', name: 'Appointing Auditor', icon: 'fas fa-user-check', content: '<h1>Resolution of the Shareholders - Appointing Auditor</h1><p>RESOLVED THAT [AUDITOR NAME] be appointed as auditor of the Corporation...</p>' },
          { id: 'annual-shareholders-waive-audit', name: 'Waiving Audit (Small Corps)', icon: 'fas fa-times-circle', content: '<h1>Resolution of the Shareholders - Waiving Audit</h1><p>RESOLVED THAT the shareholders waive the appointment of an auditor...</p>' }
        ]
      },
      
      // Changes in Directors/Officers
      {
        category: 'Changes in Directors/Officers',
        type: 'Director Changes',
        resolutions: [
          { id: 'director-appointment', name: 'Appointment of New Director', icon: 'fas fa-user-plus', content: '<h1>Resolution of the Board of Directors - Appointment of Director</h1><p>RESOLVED THAT [NAME] be appointed as a director of the Corporation...</p>' },
          { id: 'director-resignation', name: 'Resignation of Director', icon: 'fas fa-user-minus', content: '<h1>Resolution of the Board of Directors - Resignation of Director</h1><p>RESOLVED THAT the resignation of [NAME] as a director be accepted...</p>' },
          { id: 'registered-office-change', name: 'Change of Registered Office Address', icon: 'fas fa-map-marker-alt', content: '<h1>Resolution of the Board of Directors - Change of Registered Office</h1><p>RESOLVED THAT the registered office of the Corporation be changed to [ADDRESS]...</p>' }
        ]
      },
      {
        category: 'Changes in Directors/Officers',
        type: 'Officer Changes',
        resolutions: [
          { id: 'officer-appointment', name: 'Appointment of Officer (CEO, CFO, etc.)', icon: 'fas fa-briefcase', content: '<h1>Resolution of the Board of Directors - Appointment of Officer</h1><p>RESOLVED THAT [NAME] be appointed as [TITLE] of the Corporation...</p>' },
          { id: 'officer-resignation', name: 'Resignation/Termination of Officer', icon: 'fas fa-user-times', content: '<h1>Resolution of the Board of Directors - Officer Resignation</h1><p>RESOLVED THAT the resignation of [NAME] as [TITLE] be accepted...</p>' }
        ]
      },

      // Shareholder Matters
      {
        category: 'Shareholder Matters',
        type: 'Share Transactions',
        resolutions: [
          { id: 'share-issuance', name: 'Issuance of Shares', icon: 'fas fa-certificate', content: '<h1>Resolution of the Board of Directors - Share Issuance</h1><p>RESOLVED THAT the Corporation issue [NUMBER] shares to [SHAREHOLDER]...</p>' },
          { id: 'share-transfer', name: 'Transfer of Shares', icon: 'fas fa-exchange-alt', content: '<h1>Resolution of the Board of Directors - Share Transfer</h1><p>RESOLVED THAT the transfer of [NUMBER] shares from [FROM] to [TO] be approved...</p>' },
          { id: 'share-redemption', name: 'Redemption or Repurchase of Shares', icon: 'fas fa-undo', content: '<h1>Resolution of the Board of Directors - Share Redemption</h1><p>RESOLVED THAT the Corporation redeem [NUMBER] shares from [SHAREHOLDER]...</p>' },
          { id: 'dividend-declaration', name: 'Declaration of Dividends', icon: 'fas fa-money-bill-wave', content: '<h1>Resolution of the Shareholders - Dividend Declaration</h1><p>RESOLVED THAT a dividend be declared and paid to shareholders...</p>' }
        ]
      },

      // Financial/Corporate Administration
      {
        category: 'Financial/Corporate Administration',
        type: 'Financial Resolutions',
        resolutions: [
          { id: 'banking-arrangements', name: 'Banking Arrangements & Signing Authority', icon: 'fas fa-university', content: '<h1>Resolution of the Board of Directors - Banking Arrangements</h1><p>RESOLVED THAT the Corporation establish banking arrangements with [BANK]...</p>' },
          { id: 'borrowing-resolution', name: 'Borrowing Resolutions', icon: 'fas fa-hand-holding-usd', content: '<h1>Resolution of the Board of Directors - Borrowing Authority</h1><p>RESOLVED THAT the Corporation be authorized to borrow up to $[AMOUNT]...</p>' },
          { id: 'dividend-approval', name: 'Approval of Dividend Declaration', icon: 'fas fa-check-circle', content: '<h1>Resolution of the Board of Directors - Dividend Approval</h1><p>RESOLVED THAT the dividend declaration be approved...</p>' }
        ]
      },

      // Special but Still Common
      {
        category: 'Special but Still Common',
        type: 'Corporate Changes',
        resolutions: [
          { id: 'bylaw-amendment', name: 'Amendment to By-laws', icon: 'fas fa-gavel', content: '<h1>Resolution of the Shareholders - By-law Amendment</h1><p>RESOLVED THAT the by-laws of the Corporation be amended...</p>' },
          { id: 'contract-ratification', name: 'Ratification of Contracts with Related Parties', icon: 'fas fa-handshake', content: '<h1>Resolution of the Board of Directors - Contract Ratification</h1><p>RESOLVED THAT the contract with [RELATED PARTY] be ratified...</p>' },
          { id: 'usa-adoption', name: 'Unanimous Shareholder Agreement', icon: 'fas fa-users', content: '<h1>Resolution of the Shareholders - USA Adoption</h1><p>RESOLVED THAT the Unanimous Shareholder Agreement be adopted...</p>' }
        ]
      }
    ];
  };

  const commonResolutions = getCommonResolutions();

  // Filter common resolutions based on search term
  const filteredCommonResolutions = searchTerm
    ? commonResolutions
        .map(group => ({
          ...group,
          resolutions: group.resolutions.filter(resolution =>
            resolution.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            group.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            group.type.toLowerCase().includes(searchTerm.toLowerCase())
          )
        }))
        .filter(group => group.resolutions.length > 0) // Only include groups that have matching resolutions
    : commonResolutions;

  const handleOpenStarterTemplate = (template: any) => {
    console.log('Templates Debug:', {
      template: template.name,
      currentEntity,
      entityId: currentEntity?.id
    });
    
    // Always allow opening the editor - we'll handle entity selection within it
    setSelectedStarterTemplate(template);
    setShowDocumentEditor(true);
  };

  const handleSaveDocument = async (content: string) => {
    if (!selectedStarterTemplate) return;
    
    try {
      // Create a new document based on the starter template
      const response = await apiRequest("POST", "/api/documents", {
        orgId: currentEntity?.id,
        templateId: selectedStarterTemplate.id,
        content,
        fileKey: `${selectedStarterTemplate.name} - ${new Date().toLocaleDateString()}`
      });

      toast({
        title: "Success",
        description: "Document created successfully",
      });

      setShowDocumentEditor(false);
      setSelectedStarterTemplate(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save document",
        variant: "destructive",
      });
    }
  };

  const renderTemplateTable = (templates: Template[], isStarter: boolean = false) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Description</TableHead>
          {!isStarter && <TableHead>Created</TableHead>}
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {templates.length === 0 ? (
          <TableRow>
            <TableCell colSpan={isStarter ? 4 : 5} className="text-center py-8 text-muted-foreground">
              No templates found
            </TableCell>
          </TableRow>
        ) : (
          templates.map((template) => (
            <TableRow key={template.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                    <i className={`${getTemplateIcon(template.scope, template.category)} text-sm`}></i>
                  </div>
                  <div>
                    <div className="font-medium">{template.name}</div>
                    <div className="text-xs text-muted-foreground">{template.code}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {getTemplateBadge(template.scope, template.category)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                {template.description || 'No description'}
              </TableCell>
              {!isStarter && (
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(template.createdAt?.toString() ?? null)}
                </TableCell>
              )}
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" data-testid={`template-actions-${template.id}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handlePreviewTemplate(template)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Preview
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleViewVariables(template)}>
                      <Search className="mr-2 h-4 w-4" />
                      View Variables
                    </DropdownMenuItem>
                    {!isStarter && (
                      <>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Template</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{template.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteTemplate(template.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Templates</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage document templates for generating legal documents
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
                data-testid="template-search"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="starter" data-testid="quick-create-tab">
              Create
            </TabsTrigger>
            <TabsTrigger value="custom" data-testid="custom-templates-tab">
              Manage Templates ({customTemplates.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="custom">
            <Card>
              <CardContent className="p-0">
                <div className="border-b p-6">
                  <TemplateUploader orgId={currentEntity?.id || ''} />
                </div>
                <div className="p-0">
                  {renderTemplateTable(filteredCustom)}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="starter">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {filteredCommonResolutions.length === 0 && searchTerm ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No resolutions found for "{searchTerm}"
                    </div>
                  ) : (
                    Object.entries(
                      filteredCommonResolutions.reduce((acc, group) => {
                        if (!acc[group.category]) {
                          acc[group.category] = [];
                        }
                        acc[group.category].push(group);
                        return acc;
                      }, {} as Record<string, typeof filteredCommonResolutions>)
                    ).map(([category, groups]) => (
                      <div key={category}>
                        <h3 className="text-lg font-semibold mb-4 text-primary">{category}</h3>
                        
                        {/* Render each group type within the category */}
                        {groups.map((group, groupIndex) => (
                          <Collapsible key={`${category}-${groupIndex}`} className="mb-6">
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-between p-4 h-auto"
                                data-testid={`resolution-group-${group.type.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                    <i className="fas fa-file-signature text-primary"></i>
                                  </div>
                                  <div className="text-left">
                                    <div className="font-medium">{group.type}</div>
                                    <div className="text-sm text-muted-foreground">{group.resolutions.length} resolutions</div>
                                  </div>
                                </div>
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-2 mt-2">
                              {group.resolutions.map((resolution) => (
                                <div
                                  key={resolution.id}
                                  className="flex items-center gap-3 p-3 ml-4 border border-border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                                  onClick={() => handleOpenStarterTemplate(resolution)}
                                  data-testid={`resolution-${resolution.id}`}
                                >
                                  <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center">
                                    <i className={`${resolution.icon} text-sm text-muted-foreground`}></i>
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium">{resolution.name}</div>
                                  </div>
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                </div>
                              ))}
                            </CollapsibleContent>
                          </Collapsible>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <i className={`${getTemplateIcon(selectedTemplate?.scope || '', selectedTemplate?.category)}`}></i>
              {selectedTemplate?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate?.description}
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">Category:</span>
                  <div className="mt-1">{getTemplateBadge(selectedTemplate.scope, selectedTemplate.category)}</div>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Code:</span>
                  <div className="mt-1 font-mono text-xs">{selectedTemplate.code}</div>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Type:</span>
                  <div className="mt-1">{selectedTemplate.isStarter ? 'Starter Template' : 'Custom Template'}</div>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Created:</span>
                  <div className="mt-1">{formatDate(selectedTemplate.createdAt?.toString() ?? null)}</div>
                </div>
              </div>
              <Separator />
              <div>
                <span className="font-medium text-muted-foreground">Schema Fields:</span>
                <div className="mt-2 p-3 bg-muted rounded-lg font-mono text-xs max-h-48 overflow-y-auto">
                  <pre>{JSON.stringify(selectedTemplate.schema, null, 2)}</pre>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Variables Dialog */}
      <Dialog open={showVariablesDialog} onOpenChange={setShowVariablesDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Template Variables</DialogTitle>
            <DialogDescription>
              Available variables for {selectedTemplate?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Variable</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedTemplate.variables && typeof selectedTemplate.variables === 'object' ? (
                      Object.entries(selectedTemplate.variables as Record<string, any>).map(([key, value]) => (
                        <TableRow key={key}>
                          <TableCell className="font-mono text-sm">
                            {`{{${key}}}`}
                          </TableCell>
                          <TableCell className="text-sm">{value.description || 'No description'}</TableCell>
                          <TableCell className="text-sm">
                            <Badge variant="outline">{value.type || 'string'}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                          No variables defined for this template
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Document Editor Modal */}
      {showDocumentEditor && selectedStarterTemplate && (
        <Dialog open={showDocumentEditor} onOpenChange={setShowDocumentEditor}>
          <DialogContent className="max-w-6xl max-h-[90vh] p-0 top-[5%] translate-y-0">
            <DocumentEditor
              documentId={null}
              orgId={currentEntity?.id || ''}
              initialContent={selectedStarterTemplate.content}
              initialTitle={selectedStarterTemplate.name}
              onSave={handleSaveDocument}
              onClose={() => {
                setShowDocumentEditor(false);
                setSelectedStarterTemplate(null);
              }}
              isFullscreen={false}
              onToggleFullscreen={() => {}}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}