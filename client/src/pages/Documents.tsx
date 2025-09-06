import { useState } from "react";
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
import { useEntityContext } from "@/hooks/useEntityContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { GeneratedDoc } from "@shared/schema";

export default function Documents() {
  const { currentEntity } = useEntityContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showBundleDialog, setShowBundleDialog] = useState(false);
  const [isCreatingBundle, setIsCreatingBundle] = useState(false);
  const [activeTab, setActiveTab] = useState("documents");
  const [selectedDoc, setSelectedDoc] = useState<GeneratedDoc | null>(null);
  const [showDocViewer, setShowDocViewer] = useState(false);

  // Fetch documents for current entity
  const { data: documents = [], isLoading } = useQuery<GeneratedDoc[]>({
    queryKey: ["/api/documents", currentEntity?.id],
    queryFn: () => fetch(`/api/documents/${currentEntity?.id}`).then(res => res.json()),
    enabled: !!currentEntity?.id,
  });

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

  const handleCreateBundle = async () => {
    setIsCreatingBundle(true);
    try {
      await createBundleMutation.mutateAsync();
    } finally {
      setIsCreatingBundle(false);
    }
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
      <div className="p-6 space-y-6">
        {/* Documents List */}
        {isLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <i className="fas fa-spinner fa-spin text-4xl text-muted-foreground mb-4"></i>
              <CardTitle className="mb-2">Loading Documents</CardTitle>
              <CardDescription>
                Fetching documents for {currentEntity.name}...
              </CardDescription>
            </CardContent>
          </Card>
        ) : documents.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <i className="fas fa-file-alt text-4xl text-muted-foreground mb-4"></i>
              <CardTitle className="mb-2">No Documents Yet</CardTitle>
              <CardDescription className="mb-4">
                Get started by creating your first document using Quick Create above.
              </CardDescription>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {documents.map((doc) => (
              <Card key={doc.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <i className={`${getDocumentTypeIcon(doc.templateId)} text-primary`}></i>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{doc.fileKey}</h3>
                        <p className="text-sm text-muted-foreground">
                          Created {formatDate(doc.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getDocumentTypeBadge(doc.templateId)}
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          data-testid={`view-doc-${doc.id}`}
                          onClick={() => {
                            setSelectedDoc(doc);
                            setShowDocViewer(true);
                          }}
                        >
                          <i className="fas fa-eye mr-2"></i>
                          View
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          data-testid={`download-doc-${doc.id}`}
                          onClick={() => {
                            window.open(`/api/documents/${doc.id}/download`, '_blank');
                          }}
                        >
                          <i className="fas fa-download mr-2"></i>
                          Download
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
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

      {/* Document Viewer Modal */}
      <Dialog open={showDocViewer} onOpenChange={setShowDocViewer}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <i className="fas fa-file-alt text-primary"></i>
              {selectedDoc?.fileKey}
            </DialogTitle>
            <DialogDescription>
              Created {selectedDoc && formatDate(selectedDoc.createdAt)} • Template ID: {selectedDoc?.templateId}
            </DialogDescription>
          </DialogHeader>
          
          {selectedDoc && (
            <div className="space-y-4">
              {/* Document Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Document ID</label>
                  <div className="font-mono text-sm">{selectedDoc.id}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">File Key</label>
                  <div className="text-sm">{selectedDoc.fileKey}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Template</label>
                  <div className="text-sm">{selectedDoc.templateId}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created By</label>
                  <div className="text-sm">{selectedDoc.createdBy}</div>
                </div>
              </div>

              {/* Data Used in Document */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Entity Data Used</label>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-sm overflow-auto max-h-32">
                    {JSON.stringify(selectedDoc.dataUsed, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Document Preview Placeholder */}
              <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                <i className="fas fa-file-pdf text-4xl text-muted-foreground mb-4"></i>
                <div className="text-lg font-medium mb-2">Document Preview</div>
                <div className="text-muted-foreground mb-4">
                  PDF preview will be available once document processing is implemented
                </div>
                <Button 
                  variant="outline"
                  onClick={() => window.open(`/api/documents/${selectedDoc.id}/download`, '_blank')}
                >
                  <i className="fas fa-download mr-2"></i>
                  Download Document
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDocViewer(false)}>
              Close
            </Button>
            <Button onClick={() => {
              if (selectedDoc) {
                window.open(`/api/documents/${selectedDoc.id}/download`, '_blank');
              }
            }}>
              <i className="fas fa-download mr-2"></i>
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
