import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TemplateUploader } from "./TemplateUploader";
import { useToast } from "@/hooks/use-toast";
import type { Template, GeneratedDoc } from "@shared/schema";

interface TemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateSelect: (templateId: string, templateType: 'starter' | 'custom') => void;
  onDraftSelect: (draftId: string) => void;
  orgId: string;
}

export function TemplateSelector({ open, onOpenChange, onTemplateSelect, onDraftSelect, orgId }: TemplateSelectorProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("starter");

  // Fetch starter templates
  const { data: starterTemplates = [], isLoading: loadingStarter } = useQuery<Template[]>({
    queryKey: ["/api/templates/starter"],
    retry: false,
  });

  // Fetch organization templates
  const { data: orgTemplates = [], isLoading: loadingOrg } = useQuery<Template[]>({
    queryKey: [`/api/orgs/${orgId}/templates`],
    enabled: !!orgId,
    retry: false,
  });

  // Fetch draft documents
  const { data: draftDocs = [], isLoading: loadingDrafts } = useQuery<GeneratedDoc[]>({
    queryKey: [`/api/orgs/${orgId}/drafts`],
    enabled: !!orgId,
    retry: false,
  });

  const handleStarterSelect = (template: Template) => {
    onTemplateSelect(template.id, 'starter');
    onOpenChange(false);
  };

  const handleCustomSelect = (template: Template) => {
    onTemplateSelect(template.id, 'custom');
    onOpenChange(false);
  };

  const getTemplateBadge = (scope: string) => {
    switch (scope) {
      case 'minute-book': return <Badge variant="default">Minute Book</Badge>;
      case 'resolution': return <Badge variant="secondary">Resolution</Badge>;
      case 'register': return <Badge variant="outline">Register</Badge>;
      case 'bylaws': return <Badge variant="secondary">By-Laws</Badge>;
      default: return <Badge>{scope}</Badge>;
    }
  };

  const getTemplateIcon = (scope: string) => {
    switch (scope) {
      case 'minute-book': return 'fas fa-book';
      case 'resolution': return 'fas fa-file-signature';
      case 'register': return 'fas fa-list-alt';
      case 'bylaws': return 'fas fa-gavel';
      default: return 'fas fa-file-alt';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <i className="fas fa-file-word text-primary"></i>
            Select Document Template
          </DialogTitle>
          <DialogDescription>
            Choose from professional starter templates or upload your own custom template
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="starter" data-testid="starter-templates-tab">
                <i className="fas fa-star mr-2"></i>
                Starter Templates
              </TabsTrigger>
              <TabsTrigger value="custom" data-testid="custom-templates-tab">
                <i className="fas fa-upload mr-2"></i>
                Custom Templates
              </TabsTrigger>
              <TabsTrigger value="drafts" data-testid="drafts-tab">
                <i className="fas fa-file-alt mr-2"></i>
                Drafts
              </TabsTrigger>
            </TabsList>

            {/* Starter Templates */}
            <TabsContent value="starter" className="space-y-4 h-96 overflow-y-auto">
              {loadingStarter ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-muted-foreground">Loading starter templates...</div>
                </div>
              ) : starterTemplates.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <i className="fas fa-star text-4xl text-muted-foreground mb-4"></i>
                    <CardTitle className="mb-2">No Starter Templates Available</CardTitle>
                    <CardDescription>
                      Professional templates will be available soon. Use the Custom Templates tab to upload your own.
                    </CardDescription>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {starterTemplates.map((template) => (
                    <Card key={template.id} className="hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => handleStarterSelect(template)}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                              <i className={`${getTemplateIcon(template.scope)} text-primary`}></i>
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">{template.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {template.description}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {getTemplateBadge(template.scope)}
                            <Badge variant="outline" className="text-xs">
                              <i className="fas fa-star mr-1"></i>
                              Starter
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Custom Templates */}
            <TabsContent value="custom" className="space-y-4 h-96 overflow-y-auto">
              <div className="space-y-4">
                {/* Upload Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Upload New Template</CardTitle>
                    <CardDescription>
                      Upload your own Word document template with variables like {"{{company_name}}"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TemplateUploader 
                      orgId={orgId} 
                      onUploadComplete={() => {
                        toast({
                          title: "Template Uploaded",
                          description: "Your custom template is ready to use",
                        });
                      }}
                    />
                  </CardContent>
                </Card>

                {/* Existing Custom Templates */}
                {loadingOrg ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-muted-foreground">Loading your templates...</div>
                  </div>
                ) : orgTemplates.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <i className="fas fa-upload text-4xl text-muted-foreground mb-4"></i>
                      <CardTitle className="mb-2">No Custom Templates Yet</CardTitle>
                      <CardDescription>
                        Upload your first template using the upload area above.
                      </CardDescription>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {orgTemplates.filter(t => !t.isStarter).map((template) => (
                      <Card key={template.id} className="hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => handleCustomSelect(template)}>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                                <i className={`${getTemplateIcon(template.scope)} text-secondary-foreground`}></i>
                              </div>
                              <div>
                                <h3 className="font-semibold text-lg">{template.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {template.description || "Custom template"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {getTemplateBadge(template.scope)}
                              <Badge variant="secondary" className="text-xs">
                                <i className="fas fa-user mr-1"></i>
                                Custom
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Drafts Tab */}
            <TabsContent value="drafts" className="space-y-4 h-96 overflow-y-auto">
              {loadingDrafts ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-muted-foreground">Loading drafts...</div>
                </div>
              ) : draftDocs.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <i className="fas fa-file-alt text-4xl text-muted-foreground mb-4"></i>
                    <CardTitle className="mb-2">No Draft Documents</CardTitle>
                    <CardDescription>
                      Start creating a document from a template to see drafts here
                    </CardDescription>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {draftDocs.map((draft) => (
                    <Card 
                      key={draft.id} 
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        onDraftSelect(draft.id);
                        onOpenChange(false);
                      }}
                      data-testid={`draft-${draft.id}`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900 rounded-lg flex items-center justify-center">
                              <i className="fas fa-file-alt text-amber-600 dark:text-amber-400"></i>
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">{draft.fileKey || "Untitled Document"}</h3>
                              <p className="text-sm text-muted-foreground">
                                Last updated: {draft.updatedAt ? new Date(draft.updatedAt).toLocaleDateString() : 'Unknown'}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950">
                            <i className="fas fa-pencil mr-1"></i>
                            Draft
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}