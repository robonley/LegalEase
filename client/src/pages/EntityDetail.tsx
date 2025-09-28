import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useEntityContext } from "@/hooks/useEntityContext";
import { PDFIngestion } from "@/components/PDFIngestion";
import { ExtractionResultsModal } from "@/components/ExtractionResultsModal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Upload, MessageSquarePlus, ChevronDown, ChevronUp } from "lucide-react";
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
  const [showMoreInfo, setShowMoreInfo] = useState(false);
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

  // Fetch registered office address
  const { data: registeredOffice } = useQuery({
    queryKey: ["/api/addresses", entity?.registeredOfficeId],
    queryFn: async () => {
      if (!entity?.registeredOfficeId) return null;
      const response = await fetch(`/api/addresses/${entity.registeredOfficeId}`);
      if (!response.ok) return null;
      return await response.json();
    },
    enabled: !!entity?.registeredOfficeId,
  });

  // Fetch mailing address
  const { data: mailingAddress } = useQuery({
    queryKey: ["/api/addresses", entity?.mailingAddressId],
    queryFn: async () => {
      if (!entity?.mailingAddressId) return null;
      const response = await fetch(`/api/addresses/${entity.mailingAddressId}`);
      if (!response.ok) return null;
      return await response.json();
    },
    enabled: !!entity?.mailingAddressId,
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

  const formatAddress = (address: any) => {
    if (!address) return null;
    const parts = [
      address.line1,
      address.line2,
      address.city,
      address.region,
      address.country,
      address.postal
    ].filter(Boolean);
    
    if (parts.length === 0) return null;
    
    // Format as: Line1, Line2, City, Region, Country Postal
    const formatted = [];
    if (address.line1) formatted.push(address.line1);
    if (address.line2) formatted.push(address.line2);
    if (address.city) formatted.push(address.city);
    if (address.region) formatted.push(address.region);
    const countryPostal = [address.country, address.postal].filter(Boolean).join(' ');
    if (countryPostal) formatted.push(countryPostal);
    
    return formatted.join(', ');
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
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <span className="text-lg font-medium text-primary">
                  {getEntityInitials(entity.name)}
                </span>
              </div>
              <div>
                <h1 className="text-xl font-semibold">{entity.name}</h1>
                <p className="text-xs text-muted-foreground">
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
                  Upload
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
              Edit
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Corporation Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Corporate Information</CardTitle>
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
                <label className="text-xs font-medium text-muted-foreground">Annual Return Due</label>
                {entity.annualReturnDueAt ? (
                  <div className="mt-1">
                    <p className={`text-sm font-medium ${
                      new Date(entity.annualReturnDueAt) < new Date() 
                        ? 'text-red-600' 
                        : new Date(entity.annualReturnDueAt) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                        ? 'text-yellow-600'
                        : 'text-foreground'
                    }`}>
                      {formatDate(entity.annualReturnDueAt)}
                    </p>
                    {new Date(entity.annualReturnDueAt) < new Date() && (
                      <Badge variant="destructive" className="text-xs mt-1">Overdue</Badge>
                    )}
                    {new Date(entity.annualReturnDueAt) >= new Date() && 
                     new Date(entity.annualReturnDueAt) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
                      <Badge variant="outline" className="text-xs mt-1 border-yellow-400 text-yellow-600">Due Soon</Badge>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">Not set</p>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Last Updated</label>
                  <p className="text-sm font-medium mt-1">{formatDate(entity.updatedAt)}</p>
                </div>
                <Button 
                  variant="ghost" 
                  className="justify-between p-2 h-auto"
                  data-testid="more-info-toggle"
                  onClick={() => setShowMoreInfo(!showMoreInfo)}
                >
                  <span className="text-xs font-medium text-muted-foreground mr-2">More Info</span>
                  {showMoreInfo ? (
                    <ChevronUp className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  )}
                </Button>
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

            {/* More Info Collapsible Content - Address Information */}
            <Collapsible open={showMoreInfo} onOpenChange={setShowMoreInfo}>
              <CollapsibleContent className="space-y-4 mt-4">
                {/* Address Information */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium">Registered Office</h4>
                        <p className="text-xs text-muted-foreground">Official registered address</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLocation(`/entities/${id}/edit`)}
                        data-testid="edit-registered-office-button"
                      >
                        <i className="fas fa-edit text-xs"></i>
                      </Button>
                    </div>
                    <div className="bg-muted/20 p-3 rounded-md">
                      {entity.registeredOfficeId ? (
                        registeredOffice ? (
                          <p className="text-sm text-foreground leading-relaxed">
                            {formatAddress(registeredOffice)}
                          </p>
                        ) : (
                          <p className="text-muted-foreground text-sm">Loading address details...</p>
                        )
                      ) : (
                        <p className="text-muted-foreground text-sm">No registered office address on file</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium">Mailing Address</h4>
                        <p className="text-xs text-muted-foreground">Where corporate correspondence is sent</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLocation(`/entities/${id}/edit`)}
                        data-testid="edit-mailing-address-button"
                      >
                        <i className="fas fa-edit text-xs"></i>
                      </Button>
                    </div>
                    <div className="bg-muted/20 p-3 rounded-md">
                      {entity.mailingAddressId ? (
                        mailingAddress ? (
                          <p className="text-sm text-foreground leading-relaxed">
                            {formatAddress(mailingAddress)}
                          </p>
                        ) : (
                          <p className="text-muted-foreground text-sm">Loading address details...</p>
                        )
                      ) : (
                        <p className="text-muted-foreground text-sm">No mailing address on file</p>
                      )}
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>


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

        {/* Recent Activity Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Activity</CardTitle>
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
                <i className="fas fa-history text-4xl text-muted-foreground mb-3"></i>
                <p className="text-muted-foreground">No activity yet</p>
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