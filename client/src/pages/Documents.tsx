import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TemplateUploader } from "@/components/TemplateUploader";
import { TemplateSelector } from "@/components/TemplateSelector";
import { useEntityContext } from "@/hooks/useEntityContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { DocumentEditor } from "@/components/DocumentEditor";
import type { GeneratedDoc, IngestionJob, ExtractionResult } from "@shared/schema";

export default function Documents() {
  const { currentEntity } = useEntityContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showBundleDialog, setShowBundleDialog] = useState(false);
  const [isCreatingBundle, setIsCreatingBundle] = useState(false);
  const [activeTab, setActiveTab] = useState("uploads");
  const [selectedDoc, setSelectedDoc] = useState<GeneratedDoc | null>(null);
  const [showDocViewer, setShowDocViewer] = useState(false);
  const [showDocEditor, setShowDocEditor] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [newJobIds, setNewJobIds] = useState<string[]>([]);

  // Fetch documents for current entity
  const { data: documents = [], isLoading } = useQuery<GeneratedDoc[]>({
    queryKey: ["/api/documents", currentEntity?.id],
    enabled: !!currentEntity?.id,
  });

  // Fetch user's ingestion jobs
  const { data: ingestionJobs = [], isLoading: loadingJobs } = useQuery<IngestionJob[]>({
    queryKey: ["/api/ingest/jobs"],
  });

  // Track new jobs - mark completed jobs as "new" within the last 5 minutes
  useEffect(() => {
    if (ingestionJobs.length > 0) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recentCompleted = ingestionJobs.filter((job) => 
        job.status === 'completed' && 
        job.completedAt &&
        new Date(job.completedAt) > fiveMinutesAgo
      ).map((job) => job.id);
      setNewJobIds(recentCompleted);
    }
  }, [ingestionJobs]);

  // Single document creation mutation
  const createDocumentMutation = useMutation({
    mutationFn: async (documentType: string) => {
      if (!currentEntity?.id) throw new Error("No entity selected");
      return await apiRequest("POST", `/api/orgs/${currentEntity.id}/documents`, {
        documentType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Success",
        description: "Document created successfully",
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

  // New Corporation Bundle creation
  const createBundleMutation = useMutation({
    mutationFn: async () => {
      if (!currentEntity?.id) throw new Error("No entity selected");
      return await apiRequest("POST", `/api/orgs/${currentEntity.id}/documents/bundle`, {
        bundleType: "new-corporation",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Success",
        description: "New Corporation Bundle created successfully",
      });
      setShowBundleDialog(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Save document content mutation
  const saveDocumentMutation = useMutation({
    mutationFn: async ({ documentId, content }: { documentId: string; content: string }) => {
      return await apiRequest("PUT", `/api/documents/${documentId}/content`, { content });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Document saved successfully",
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

  const handleSaveDocument = async (content: string) => {
    if (!selectedDoc) return;
    await saveDocumentMutation.mutateAsync({ documentId: selectedDoc.id, content });
  };

  const handleOpenEditor = (doc: GeneratedDoc) => {
    setSelectedDoc(doc);
    setShowDocEditor(true);
  };

  const handleCloseEditor = () => {
    setShowDocEditor(false);
    setSelectedDoc(null);
    setIsFullscreen(false);
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleCreateBundle = async () => {
    setIsCreatingBundle(true);
    try {
      await createBundleMutation.mutateAsync();
    } finally {
      setIsCreatingBundle(false);
    }
  };

  const handleTemplateSelect = (templateId: string, templateType: 'starter' | 'custom') => {
    // TODO: Implement document generation from selected template
    console.log('Selected template:', templateId, templateType);
    toast({
      title: "Template Selected",
      description: `Document generation from ${templateType} template will be implemented next`,
    });
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'Not set';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDocumentTypeIcon = (scope: string) => {
    switch (scope) {
      case 'minute-book': return 'fas fa-book';
      case 'bylaws': return 'fas fa-gavel';
      case 'resolution': return 'fas fa-file-signature';
      case 'register': return 'fas fa-list-alt';
      default: return 'fas fa-file-alt';
    }
  };

  const getDocumentTypeBadge = (scope: string) => {
    switch (scope) {
      case 'minute-book': return <Badge variant="secondary">Minute Book</Badge>;
      case 'bylaws': return <Badge variant="outline">By-Laws</Badge>;
      case 'resolution': return <Badge variant="default">Resolution</Badge>;
      case 'register': return <Badge variant="secondary">Register</Badge>;
      default: return <Badge>{scope}</Badge>;
    }
  };

  if (!currentEntity) {
    return (
      <div className="flex-1 overflow-auto">
        <header className="bg-card border-b border-border px-6 py-4">
          <div>
            <h1 className="text-2xl font-semibold">Documents</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Select an entity to view and manage documents
            </p>
          </div>
        </header>
        <div className="p-6">
          <Card>
            <CardContent className="p-12 text-center">
              <i className="fas fa-building text-4xl text-muted-foreground mb-4"></i>
              <CardTitle className="mb-2">No Entity Selected</CardTitle>
              <CardDescription>
                Please select an entity from the sidebar to view its documents.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Documents</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Generate and manage legal documents for {currentEntity.name}
            </p>
          </div>
          <div className="flex gap-2">
            {/* Quick Create Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button data-testid="quick-create-button">
                  <i className="fas fa-plus mr-2"></i>
                  Quick Create
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Individual Documents</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => createDocumentMutation.mutate("minute-book")}
                  disabled={createDocumentMutation.isPending}
                >
                  <i className="fas fa-book mr-2"></i>
                  Minute Book
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => createDocumentMutation.mutate("bylaws")}
                  disabled={createDocumentMutation.isPending}
                >
                  <i className="fas fa-gavel mr-2"></i>
                  By-Laws
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => createDocumentMutation.mutate("founding-resolution")}
                  disabled={createDocumentMutation.isPending}
                >
                  <i className="fas fa-file-signature mr-2"></i>
                  Founding Resolution
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => createDocumentMutation.mutate("dividend-resolution")}
                  disabled={createDocumentMutation.isPending}
                >
                  <i className="fas fa-money-bill mr-2"></i>
                  Dividend Resolution
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Document Bundles</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => setShowBundleDialog(true)}
                  disabled={createDocumentMutation.isPending}
                >
                  <i className="fas fa-folder-plus mr-2"></i>
                  New Corporation Bundle
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="uploads" data-testid="uploads-tab">
              <i className="fas fa-cloud-upload-alt mr-2"></i>
              Uploads
              {newJobIds.length > 0 && (
                <Badge variant="secondary" className="ml-2 bg-blue-500 text-white">
                  {newJobIds.length} New
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="templates" data-testid="templates-tab">
              <i className="fas fa-file-text mr-2"></i>
              Templates
            </TabsTrigger>
          </TabsList>

          {/* Uploads Tab - User Uploaded Documents */}
          <TabsContent value="uploads" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Uploaded Documents</h3>
                <p className="text-sm text-muted-foreground">
                  User-uploaded corporate documents and records
                </p>
              </div>
              <Button data-testid="upload-document-button">
                <i className="fas fa-upload mr-2"></i>
                Upload Document
              </Button>
            </div>

            {/* Uploaded Documents */}
            {loadingJobs ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <i className="fas fa-spinner fa-spin text-4xl text-muted-foreground mb-4"></i>
                  <CardTitle className="mb-2">Loading...</CardTitle>
                </CardContent>
              </Card>
            ) : ingestionJobs.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <i className="fas fa-cloud-upload-alt text-4xl text-muted-foreground mb-4"></i>
                  <CardTitle className="mb-2">No Uploaded Documents</CardTitle>
                  <CardDescription>
                    Use the Entity Scan feature to upload and extract data from corporate documents.
                  </CardDescription>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {ingestionJobs.map((job) => (
                  <Card key={job.id} className={newJobIds.includes(job.id) ? "border-blue-500 border-2" : ""} data-testid={`ingestion-job-${job.id}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <i className="fas fa-file-pdf text-2xl text-blue-500"></i>
                          <div>
                            <CardTitle className="text-base">{job.filename}</CardTitle>
                            <CardDescription className="text-xs">
                              Uploaded {job.createdAt ? new Date(job.createdAt).toLocaleString() : 'Unknown'}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {newJobIds.includes(job.id) && (
                            <Badge variant="secondary" className="bg-blue-500 text-white" data-testid={`new-badge-${job.id}`}>New</Badge>
                          )}
                          <Badge variant={job.status === 'completed' ? 'default' : job.status === 'failed' ? 'destructive' : 'secondary'} data-testid={`status-badge-${job.id}`}>
                            {job.status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    {job.extractionResult ? (
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Extracted: {(job.extractionResult as ExtractionResult).people?.length || 0} people, {(job.extractionResult as ExtractionResult).shareholders?.length || 0} shareholders
                        </p>
                      </CardContent>
                    ) : null}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Document Templates</h3>
                <p className="text-sm text-muted-foreground">
                  Manage and organize templates for document generation
                </p>
              </div>
              <Button 
                onClick={() => setShowTemplateSelector(true)}
                data-testid="upload-template-button"
              >
                <i className="fas fa-upload mr-2"></i>
                Upload Template
              </Button>
            </div>

            {/* Template Selector Component */}
            <TemplateSelector 
              open={false}
              onOpenChange={() => {}}
              onTemplateSelect={handleTemplateSelect}
              orgId={currentEntity.id}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* New Corporation Bundle Dialog */}
      <Dialog open={showBundleDialog} onOpenChange={setShowBundleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Corporation Bundle</DialogTitle>
            <DialogDescription>
              This will create a complete set of founding documents for {currentEntity.name}, including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Minute Book</li>
                <li>By-Laws</li>
                <li>Founding Resolutions</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBundleDialog(false)}
              disabled={isCreatingBundle}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateBundle}
              disabled={isCreatingBundle}
              data-testid="create-bundle-confirm"
            >
              {isCreatingBundle ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Creating Bundle...
                </>
              ) : (
                <>
                  <i className="fas fa-folder-plus mr-2"></i>
                  Create Bundle
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Editor Modal */}
      {showDocEditor && selectedDoc && (
        <DocumentEditor
          documentId={selectedDoc.id}
          orgId={currentEntity.id}
          onSave={handleSaveDocument}
          onClose={handleCloseEditor}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
        />
      )}

      {/* Template Selector */}
      <TemplateSelector
        open={showTemplateSelector}
        onOpenChange={setShowTemplateSelector}
        onTemplateSelect={handleTemplateSelect}
        orgId={currentEntity.id}
      />
    </div>
  );
}
