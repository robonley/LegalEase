import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface TemplateUploaderProps {
  orgId: string;
  onUploadComplete?: () => void;
}

const templateTypes = [
  { value: "minute-book", label: "Minute Book", description: "Complete corporate minute book" },
  { value: "bylaws", label: "By-Laws", description: "Corporate by-laws document" },
  { value: "founding-resolution", label: "Founding Resolution", description: "Initial incorporation resolution" },
  { value: "dividend-resolution", label: "Dividend Resolution", description: "Dividend declaration resolution" },
  { value: "director-resolution", label: "Director Resolution", description: "Board of directors resolution" },
  { value: "shareholder-resolution", label: "Shareholder Resolution", description: "Shareholder meeting resolution" },
  { value: "custom", label: "Custom Document", description: "Other legal document template" },
];

export function TemplateUploader({ orgId, onUploadComplete }: TemplateUploaderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateType, setTemplateType] = useState("");
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Fetch existing templates
  const { data: templates = [] } = useQuery({
    queryKey: ["/api/orgs", orgId, "templates"],
    enabled: !!orgId,
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        toast({
          title: "Invalid File Type",
          description: "Please select a Word document (.docx file)",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      // Auto-populate template name from filename
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      setTemplateName(nameWithoutExt);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !templateName || !templateType) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      // Step 1: Get upload URL
      const uploadResponse = await apiRequest("POST", "/api/objects/upload");
      const { uploadURL } = uploadResponse;

      // Step 2: Upload file to object storage
      const formData = new FormData();
      formData.append("file", selectedFile);
      
      const uploadResult = await fetch(uploadURL, {
        method: "PUT",
        body: selectedFile,
        headers: {
          "Content-Type": selectedFile.type,
        },
      });

      if (!uploadResult.ok) {
        throw new Error("Failed to upload file");
      }

      // Step 3: Save template metadata
      await apiRequest("POST", `/api/orgs/${orgId}/templates`, {
        name: templateName,
        type: templateType,
        description: description || undefined,
        fileUrl: uploadURL.split('?')[0], // Remove query parameters
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
      });

      toast({
        title: "Success",
        description: "Template uploaded successfully",
      });

      // Reset form
      setSelectedFile(null);
      setTemplateName("");
      setTemplateType("");
      setDescription("");
      setIsDialogOpen(false);
      
      // Refresh templates list
      queryClient.invalidateQueries({
        queryKey: ["/api/orgs", orgId, "templates"],
      });
      
      onUploadComplete?.();
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload template",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Document Templates</CardTitle>
              <CardDescription>
                Upload Word document templates (.docx) for generating legal documents
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="upload-template-button">
                  <i className="fas fa-upload mr-2"></i>
                  Upload Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Upload Document Template</DialogTitle>
                  <DialogDescription>
                    Upload a Word document template with placeholder variables
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {/* File Upload */}
                  <div>
                    <Label htmlFor="template-file">Document File</Label>
                    <Input
                      id="template-file"
                      type="file"
                      accept=".docx"
                      onChange={handleFileSelect}
                      data-testid="file-input"
                    />
                    {selectedFile && (
                      <div className="mt-2 p-2 bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                          <i className="fas fa-file-word text-blue-600"></i>
                          <div>
                            <div className="text-sm font-medium">{selectedFile.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {(selectedFile.size / 1024).toFixed(1)} KB
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Template Name */}
                  <div>
                    <Label htmlFor="template-name">Template Name *</Label>
                    <Input
                      id="template-name"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="e.g., Corporate By-Laws Template"
                      data-testid="template-name-input"
                    />
                  </div>

                  {/* Template Type */}
                  <div>
                    <Label htmlFor="template-type">Document Type *</Label>
                    <Select value={templateType} onValueChange={setTemplateType}>
                      <SelectTrigger data-testid="template-type-select">
                        <SelectValue placeholder="Select document type" />
                      </SelectTrigger>
                      <SelectContent>
                        {templateTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div>
                              <div className="font-medium">{type.label}</div>
                              <div className="text-xs text-muted-foreground">{type.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Description */}
                  <div>
                    <Label htmlFor="template-description">Description (Optional)</Label>
                    <Input
                      id="template-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Additional details about this template"
                      data-testid="template-description-input"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleUpload} 
                      disabled={isUploading || !selectedFile || !templateName || !templateType}
                      data-testid="upload-button"
                    >
                      {isUploading ? (
                        <>
                          <i className="fas fa-spinner fa-spin mr-2"></i>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-upload mr-2"></i>
                          Upload Template
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8">
              <i className="fas fa-file-word text-4xl text-muted-foreground mb-4"></i>
              <div className="text-lg font-medium mb-2">No Templates Uploaded</div>
              <div className="text-muted-foreground mb-4">
                Upload your first Word document template to start generating documents
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <i className="fas fa-upload mr-2"></i>
                    Upload First Template
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
          ) : (
            <div className="grid gap-4">
              {templates.map((template: any) => (
                <div key={template.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <i className="fas fa-file-word text-blue-600 text-xl"></i>
                      <div>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {template.fileName} • {(template.fileSize / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{template.type}</Badge>
                      <Button variant="ghost" size="sm">
                        <i className="fas fa-ellipsis-h"></i>
                      </Button>
                    </div>
                  </div>
                  {template.description && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      {template.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}