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
import { Search, MoreHorizontal, Trash2, Eye, FileText } from "lucide-react";
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

  // Create entity-specific starter templates
  const getStarterTemplatesForEntity = () => {
    const entityType = currentEntity?.jurisdiction || 'CBCA';
    
    const baseTemplates = [
      {
        id: 'articles-incorporation',
        name: 'Articles of Incorporation (Form 1)',
        description: 'Filed with Corporations Canada',
        category: 'Formation Documents',
        icon: 'fas fa-file-contract',
        content: '<h1>Articles of Incorporation</h1><p>Legal document filed with regulatory authorities...</p>'
      },
      {
        id: 'certificate-incorporation',
        name: 'Certificate of Incorporation',
        description: 'Issued by regulatory authority',
        category: 'Formation Documents', 
        icon: 'fas fa-certificate',
        content: '<h1>Certificate of Incorporation</h1><p>Official certificate issued upon successful incorporation...</p>'
      },
      {
        id: 'bylaws',
        name: 'By-laws',
        description: 'General operating rules of the corporation',
        category: 'Formation Documents',
        icon: 'fas fa-gavel',
        content: '<h1>Corporate By-Laws</h1><p>General operating rules and procedures...</p>'
      },
      {
        id: 'organizational-minute-book',
        name: 'Organizational/Minute Book',
        description: 'Where all corporate records are kept',
        category: 'Formation Documents',
        icon: 'fas fa-book',
        content: '<h1>Corporate Minute Book</h1><p>Official record of corporate proceedings...</p>'
      },
      {
        id: 'incorporator-resolution',
        name: 'Resolution of the Incorporator(s)',
        description: 'Appoint first directors and transfer control',
        category: 'Founding Resolutions',
        icon: 'fas fa-file-signature',
        content: '<h1>Resolution of the Incorporator(s)</h1><p>WHEREAS the incorporators wish to appoint the first directors...</p>'
      },
      {
        id: 'directors-initial-resolution',
        name: 'Board of Directors Initial Resolutions',
        description: 'Adopt bylaws, approve shares, appoint officers',
        category: 'Founding Resolutions',
        icon: 'fas fa-users-cog',
        content: '<h1>Resolutions of the Board of Directors</h1><p>Initial meeting resolutions including adoption of bylaws...</p>'
      },
      {
        id: 'shareholders-initial-resolution',
        name: 'Shareholders Initial Resolutions',
        description: 'Confirm bylaws and appoint auditors',
        category: 'Founding Resolutions',
        icon: 'fas fa-handshake',
        content: '<h1>Resolutions of the Shareholders</h1><p>Initial shareholder meeting resolutions...</p>'
      }
    ];

    // Customize templates based on entity type
    switch (entityType) {
      case 'OBCA':
        return baseTemplates.map(t => 
          t.id === 'articles-incorporation' 
            ? { ...t, name: 'Articles of Incorporation (OBCA)', description: 'Filed with Ontario Ministry of Government Services' }
            : t
        );
      case 'Delaware':
        return baseTemplates.map(t => 
          t.id === 'articles-incorporation' 
            ? { ...t, name: 'Certificate of Incorporation (Delaware)', description: 'Filed with Delaware Division of Corporations' }
            : t
        );
      default: // CBCA
        return baseTemplates;
    }
  };

  const starterTemplatesForEntity = getStarterTemplatesForEntity();

  const handleOpenStarterTemplate = (template: any) => {
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
            <TabsTrigger value="starter" data-testid="starter-templates-tab">
              Starter Templates
            </TabsTrigger>
            <TabsTrigger value="custom" data-testid="custom-templates-tab">
              Custom Templates ({customTemplates.length})
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
              <CardHeader>
                <CardTitle>Starter Templates</CardTitle>
                <CardDescription>
                  Professional legal document templates for {currentEntity?.jurisdiction || 'CBCA'} corporations
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Formation Documents Section */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Constating / Formation Documents</h3>
                    <div className="grid gap-4">
                      {starterTemplatesForEntity
                        .filter(template => template.category === 'Formation Documents')
                        .map((template) => (
                          <div
                            key={template.id}
                            className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                            onClick={() => handleOpenStarterTemplate(template)}
                            data-testid={`starter-template-${template.id}`}
                          >
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                              <i className={`${template.icon} text-primary`}></i>
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{template.name}</div>
                              <div className="text-sm text-muted-foreground">{template.description}</div>
                            </div>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Founding Resolutions Section */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Founding Resolutions</h3>
                    <div className="grid gap-4">
                      {starterTemplatesForEntity
                        .filter(template => template.category === 'Founding Resolutions')
                        .map((template) => (
                          <div
                            key={template.id}
                            className="flex items-center gap-4 p-4 border border-border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                            onClick={() => handleOpenStarterTemplate(template)}
                            data-testid={`starter-template-${template.id}`}
                          >
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                              <i className={`${template.icon} text-primary`}></i>
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{template.name}</div>
                              <div className="text-sm text-muted-foreground">{template.description}</div>
                            </div>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          </div>
                        ))}
                    </div>
                  </div>
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
          <DialogContent className="max-w-6xl max-h-[90vh] p-0">
            <DocumentEditor
              documentId={null}
              orgId={currentEntity?.id || ''}
              initialContent={selectedStarterTemplate.content}
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