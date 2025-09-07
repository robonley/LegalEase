import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogTrigger,
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
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useEntityContext } from "@/hooks/useEntityContext";
import { apiRequest } from "@/lib/queryClient";
import { 
  Plus, 
  Book, 
  Download, 
  MoreHorizontal, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Search,
  Calendar 
} from "lucide-react";
import type { MinuteBook, Template } from "@shared/schema";

type MinuteBookType = "incorporation" | "annual" | "special" | "full";
type MinuteBookStatus = "draft" | "generating" | "ready" | "error";

interface CreateMinuteBookData {
  name: string;
  type: MinuteBookType;
  fiscalYear?: number;
  description?: string;
  templateIds: string[];
}

export default function MinuteBooks() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentEntity } = useEntityContext();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Form state for creating minute books
  const [formData, setFormData] = useState<CreateMinuteBookData>({
    name: "",
    type: "annual",
    fiscalYear: new Date().getFullYear(),
    description: "",
    templateIds: []
  });

  // Fetch minute books for current organization
  const { data: minuteBooks = [], isLoading: loadingMinuteBooks } = useQuery<MinuteBook[]>({
    queryKey: ["/api/orgs", currentEntity?.id, "minute-books"],
    enabled: !!currentEntity?.id,
  });

  // Fetch available templates for minute books
  const { data: availableTemplates = [] } = useQuery<Template[]>({
    queryKey: ["/api/templates/minute-book"],
  });

  // Create minute book mutation
  const createMinuteBookMutation = useMutation({
    mutationFn: async (data: CreateMinuteBookData) => {
      return await apiRequest("POST", `/api/orgs/${currentEntity?.id}/minute-books`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/orgs", currentEntity?.id, "minute-books"] 
      });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Minute book created successfully",
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

  // Generate minute book mutation
  const generateMinuteBookMutation = useMutation({
    mutationFn: async (minuteBookId: string) => {
      return await apiRequest("POST", `/api/minute-books/${minuteBookId}/generate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/orgs", currentEntity?.id, "minute-books"] 
      });
      toast({
        title: "Generation Started",
        description: "Minute book generation has started. This may take a few minutes.",
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

  // Delete minute book mutation
  const deleteMinuteBookMutation = useMutation({
    mutationFn: async (minuteBookId: string) => {
      await apiRequest("DELETE", `/api/minute-books/${minuteBookId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/orgs", currentEntity?.id, "minute-books"] 
      });
      toast({
        title: "Success",
        description: "Minute book deleted successfully",
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

  const resetForm = () => {
    setFormData({
      name: "",
      type: "annual",
      fiscalYear: new Date().getFullYear(),
      description: "",
      templateIds: []
    });
    setSelectedTemplateIds([]);
  };

  const getStatusBadge = (status: MinuteBookStatus) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Draft</Badge>;
      case "generating":
        return <Badge variant="default"><RefreshCw className="mr-1 h-3 w-3 animate-spin" />Generating</Badge>;
      case "ready":
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="mr-1 h-3 w-3" />Ready</Badge>;
      case "error":
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Error</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTypeBadge = (type: MinuteBookType) => {
    const colors = {
      incorporation: "bg-blue-600",
      annual: "bg-green-600",
      special: "bg-orange-600",
      full: "bg-purple-600"
    };
    return <Badge className={colors[type]}>{type.charAt(0).toUpperCase() + type.slice(1)}</Badge>;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  const filteredMinuteBooks = minuteBooks.filter(mb =>
    mb.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mb.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mb.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateMinuteBook = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a name for the minute book",
        variant: "destructive",
      });
      return;
    }

    if (selectedTemplateIds.length === 0) {
      toast({
        title: "Validation Error", 
        description: "Please select at least one template",
        variant: "destructive",
      });
      return;
    }

    createMinuteBookMutation.mutate({
      ...formData,
      templateIds: selectedTemplateIds
    });
  };

  const handleTemplateToggle = (templateId: string) => {
    setSelectedTemplateIds(prev => 
      prev.includes(templateId) 
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const getProgress = (status: MinuteBookStatus) => {
    switch (status) {
      case "draft": return 0;
      case "generating": return 50;
      case "ready": return 100;
      case "error": return 0;
      default: return 0;
    }
  };

  if (!currentEntity) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Please select an entity to manage minute books.</p>
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
            <h1 className="text-2xl font-semibold">Minute Books</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Generate and manage corporate minute books for {currentEntity.name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search minute books..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
                data-testid="minute-book-search"
              />
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="create-minute-book-button">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Minute Book
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Book className="h-5 w-5" />
                    Create Minute Book
                  </DialogTitle>
                  <DialogDescription>
                    Generate a new minute book bundle using professional legal document templates
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                  {/* Basic Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="mb-name">Name *</Label>
                      <Input
                        id="mb-name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="2024 Annual Minute Book"
                        data-testid="minute-book-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mb-type">Type</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value: MinuteBookType) => 
                          setFormData(prev => ({ ...prev, type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="incorporation">Incorporation</SelectItem>
                          <SelectItem value="annual">Annual</SelectItem>
                          <SelectItem value="special">Special Resolution</SelectItem>
                          <SelectItem value="full">Full Minute Book</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {formData.type === "annual" && (
                    <div className="space-y-2">
                      <Label htmlFor="fiscal-year">Fiscal Year</Label>
                      <Input
                        id="fiscal-year"
                        type="number"
                        value={formData.fiscalYear}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          fiscalYear: parseInt(e.target.value) 
                        }))}
                        placeholder="2024"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Description of this minute book..."
                      rows={3}
                    />
                  </div>

                  {/* Template Selection */}
                  <div className="space-y-3">
                    <Label>Select Templates *</Label>
                    <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
                      {availableTemplates.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">
                          No templates available. Please create templates first.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {availableTemplates.map((template) => (
                            <div
                              key={template.id}
                              className="flex items-center space-x-3 p-2 rounded hover:bg-muted cursor-pointer"
                              onClick={() => handleTemplateToggle(template.id)}
                            >
                              <input
                                type="checkbox"
                                checked={selectedTemplateIds.includes(template.id)}
                                onChange={() => handleTemplateToggle(template.id)}
                                className="rounded"
                              />
                              <div className="flex-1">
                                <div className="font-medium">{template.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {template.description || 'No description'}
                                </div>
                              </div>
                              <Badge variant="outline">{template.scope}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Selected {selectedTemplateIds.length} template(s)
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateMinuteBook}
                    disabled={createMinuteBookMutation.isPending}
                  >
                    {createMinuteBookMutation.isPending ? "Creating..." : "Create Minute Book"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Book className="h-5 w-5" />
              Minute Books ({filteredMinuteBooks.length})
            </CardTitle>
            <CardDescription>
              Professional legal document bundles for corporate compliance and record-keeping
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loadingMinuteBooks ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                Loading minute books...
              </div>
            ) : filteredMinuteBooks.length === 0 ? (
              <div className="text-center py-12">
                <Book className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Minute Books</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first minute book to generate professional legal documents
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="empty-state-create-button">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Minute Book
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Fiscal Year</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMinuteBooks.map((minuteBook) => (
                    <TableRow key={minuteBook.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Book className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{minuteBook.name}</div>
                            {minuteBook.description && (
                              <div className="text-sm text-muted-foreground max-w-xs truncate">
                                {minuteBook.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getTypeBadge(minuteBook.type as MinuteBookType)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(minuteBook.status as MinuteBookStatus)}
                      </TableCell>
                      <TableCell>
                        {minuteBook.fiscalYear ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {minuteBook.fiscalYear}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(minuteBook.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="w-24">
                          <Progress value={getProgress(minuteBook.status as MinuteBookStatus)} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" data-testid={`minute-book-actions-${minuteBook.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            {minuteBook.status === "draft" && (
                              <DropdownMenuItem onClick={() => generateMinuteBookMutation.mutate(minuteBook.id)}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Generate Documents
                              </DropdownMenuItem>
                            )}
                            {minuteBook.status === "ready" && minuteBook.bundleFileKey && (
                              <DropdownMenuItem>
                                <Download className="mr-2 h-4 w-4" />
                                Download Bundle
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              <FileText className="mr-2 h-4 w-4" />
                              View Documents
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  onSelect={(e) => e.preventDefault()}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Minute Book</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{minuteBook.name}"? This will also delete all generated documents. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMinuteBookMutation.mutate(minuteBook.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}