import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useEntityContext } from "@/hooks/useEntityContext";
import { PDFIngestion } from "@/components/PDFIngestion";
import { ExtractionResultsModal } from "@/components/ExtractionResultsModal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Upload, MessageSquarePlus } from "lucide-react";
import type { Org, OrgNote } from "@shared/schema";

export default function EntityDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { setCurrentEntity } = useEntityContext();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [extractionResults, setExtractionResults] = useState<any[]>([]);
  const [showExtractionModal, setShowExtractionModal] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: entity, isLoading } = useQuery<Org>({
    queryKey: ["/api/orgs", id],
    enabled: !!id,
  });

  const { data: notes = [], isLoading: notesLoading } = useQuery<OrgNote[]>({
    queryKey: ["/api/orgs", id, "notes"],
    enabled: !!id,
  });

  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", `/api/orgs/${id}/notes`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orgs", id, "notes"] });
      setNewNoteContent('');
      setShowAddNote(false);
      toast({
        title: "Note Added",
        description: "Your note has been saved successfully.",
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

  // Track this entity as recently accessed when data loads
  useEffect(() => {
    if (entity) {
      setCurrentEntity({
        id: entity.id,
        name: entity.name,
        jurisdiction: entity.jurisdiction,
        number: entity.number || undefined
      });
    }
  }, [entity, setCurrentEntity]);

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'Not set';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getEntityInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase();
  };

  const handleExtractionComplete = (results: any[]) => {
    setExtractionResults(results);
    if (results.length > 0) {
      setShowExtractionModal(true);
    }
  };

  const handleApplyExtractionResults = (selectedData: any) => {
    // Here we could update the entity with extracted data
    // For now, just show a success message
    toast({
      title: 'Data Extracted',
      description: 'Corporate information has been extracted from documents. This feature will be enhanced to auto-update entity records.',
    });
    setShowUploadDialog(false);
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="flex items-center justify-center py-12">
          <i className="fas fa-spinner fa-spin text-2xl text-muted-foreground"></i>
        </div>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <Card>
            <CardContent className="p-12 text-center">
              <i className="fas fa-exclamation-triangle text-4xl text-muted-foreground mb-4"></i>
              <CardTitle className="mb-2">Entity not found</CardTitle>
              <CardDescription className="mb-4">
                The requested entity could not be found.
              </CardDescription>
              <Button onClick={() => setLocation('/entities')}>
                Back to Entities
              </Button>
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
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/entities')}
              data-testid="back-button"
            >
              <i className="fas fa-arrow-left mr-2"></i>
              Back to Entities
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <span className="text-lg font-medium text-primary">
                  {getEntityInitials(entity.name)}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-semibold">{entity.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {entity.jurisdiction} • #{entity.number || 'No number'}
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="upload-documents-button">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Documents
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Upload Corporate Documents</DialogTitle>
                  <DialogDescription>
                    Upload incorporation papers, shareholder agreements, or other corporate documents for {entity.name}
                  </DialogDescription>
                </DialogHeader>
                <PDFIngestion 
                  onExtractionComplete={handleExtractionComplete}
                  className="mt-4"
                />
              </DialogContent>
            </Dialog>
            
            <Button
              onClick={() => setLocation(`/entities/${id}/edit`)}
              data-testid="edit-entity-button"
            >
              <i className="fas fa-edit mr-2"></i>
              Edit Entity
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Corporation Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Corporation Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Entity Name</label>
                <p className="text-sm font-medium mt-1">{entity.name}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Registration Number</label>
                <p className="text-sm font-medium mt-1">{entity.number || 'Not set'}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Jurisdiction</label>
                <p className="text-sm font-medium mt-1">{entity.jurisdiction}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Formation Date</label>
                <p className="text-sm font-medium mt-1">
                  {formatDate(entity.formationAt)}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge variant="success" className="text-xs">Active</Badge>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Last Updated</label>
                <p className="text-sm font-medium mt-1">{formatDate(entity.updatedAt)}</p>
              </div>
            </div>
            
            {/* Amendment Information */}
            {(entity.amendmentDate || entity.previousCorporationName || entity.amendmentDetails) && (
              <>
                <Separator className="my-4" />
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Amendment Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {entity.amendmentDate && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Amendment Date</label>
                        <p className="text-lg font-medium">{formatDate(entity.amendmentDate)}</p>
                      </div>
                    )}
                    {entity.previousCorporationName && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Previous Corporation Name</label>
                        <p className="text-lg font-medium">{entity.previousCorporationName}</p>
                      </div>
                    )}
                  </div>
                  {entity.amendmentDetails && (
                    <div className="mt-4">
                      <label className="text-sm font-medium text-muted-foreground">Amendment Details</label>
                      <p className="text-base mt-1 text-foreground bg-muted/30 p-3 rounded-md">{entity.amendmentDetails}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Address Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Registered Office</CardTitle>
                  <CardDescription>Official registered address</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation(`/entities/${id}/edit`)}
                  data-testid="edit-registered-office-button"
                >
                  <i className="fas fa-edit text-sm"></i>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {entity.registeredOfficeId ? (
                <p className="text-muted-foreground">Address details will be loaded here</p>
              ) : (
                <p className="text-muted-foreground">No registered office address on file</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Mailing Address</CardTitle>
                  <CardDescription>Where corporate correspondence is sent</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation(`/entities/${id}/edit`)}
                  data-testid="edit-mailing-address-button"
                >
                  <i className="fas fa-edit text-sm"></i>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {entity.mailingAddressId ? (
                <p className="text-muted-foreground">Address details will be loaded here</p>
              ) : (
                <p className="text-muted-foreground">No mailing address on file</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks for this entity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                className="h-auto flex-col gap-2 p-4" 
                onClick={() => setLocation('/people')}
                data-testid="manage-people-button"
              >
                <i className="fas fa-users text-xl"></i>
                <span className="text-sm">Manage People</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto flex-col gap-2 p-4"
                onClick={() => setLocation('/cap-table')}
                data-testid="cap-table-button"
              >
                <i className="fas fa-chart-pie text-xl"></i>
                <span className="text-sm">Cap Table</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto flex-col gap-2 p-4"
                onClick={() => setLocation('/documents')}
                data-testid="documents-button"
              >
                <i className="fas fa-file-alt text-xl"></i>
                <span className="text-sm">Documents</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto flex-col gap-2 p-4"
                onClick={() => setLocation('/minute-books')}
                data-testid="minute-book-button"
              >
                <i className="fas fa-book text-xl"></i>
                <span className="text-sm">Minute Book</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notes Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Notes</CardTitle>
                <CardDescription>Add notes and observations about this entity</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddNote(true)}
                data-testid="add-note-button"
              >
                <MessageSquarePlus className="h-4 w-4 mr-2" />
                Add Note
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Note Form */}
            {showAddNote && (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
                <Textarea
                  placeholder="Add your note here..."
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  rows={3}
                  data-testid="new-note-content"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => addNoteMutation.mutate(newNoteContent)}
                    disabled={!newNoteContent.trim() || addNoteMutation.isPending}
                    data-testid="save-note-button"
                  >
                    {addNoteMutation.isPending ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save mr-2"></i>
                        Save Note
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowAddNote(false);
                      setNewNoteContent('');
                    }}
                    data-testid="cancel-note-button"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Notes List */}
            {notesLoading ? (
              <div className="flex items-center justify-center py-6">
                <i className="fas fa-spinner fa-spin text-muted-foreground"></i>
              </div>
            ) : notes.length === 0 ? (
              <div className="text-center py-8">
                <i className="fas fa-sticky-note text-4xl text-muted-foreground mb-3"></i>
                <p className="text-muted-foreground">No notes yet</p>
                <p className="text-sm text-muted-foreground">Add your first note to track important information about this entity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notes.map((note) => (
                  <div key={note.id} className="border rounded-lg p-4 bg-card" data-testid={`note-${note.id}`}>
                    <p className="text-foreground mb-2">{note.content}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Added {formatDate(note.createdAt)}</span>
                      <span>By {note.createdBy}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Extraction Results Modal */}
      <ExtractionResultsModal
        isOpen={showExtractionModal}
        onClose={() => setShowExtractionModal(false)}
        results={extractionResults}
        onApplyResults={handleApplyExtractionResults}
      />
    </div>
  );
}