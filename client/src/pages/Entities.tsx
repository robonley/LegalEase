import { useState, useMemo } from "react";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEntityContext } from "@/hooks/useEntityContext";
import { insertOrgSchema } from "@shared/schema";
import { PDFIngestion } from "@/components/PDFIngestion";
import { ExtractionResultsModal } from "@/components/ExtractionResultsModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, SortAsc, SortDesc, Filter, ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { NAICSSelector } from "@/components/NAICSSelector";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { validateOntarioAddress } from "@/lib/addressValidation";

const formSchema = z.object({
  name: z.string().min(1, "Entity name is required"),
  number: z.string().optional(),
  companyKey: z.string().optional(),
  jurisdiction: z.string().min(1, "Jurisdiction is required"),
  formationAt: z.string().optional(),
  amendmentDate: z.string().optional(),
  previousCorporationName: z.string().optional(),
  amendmentDetails: z.string().optional(),
  mailingAddressId: z.string().optional(),
  authRepName: z.string().optional(),
  authRepCompany: z.string().optional(),
  authRepAddressId: z.string().optional(),
  authRepEmail: z.string().email().optional().or(z.literal("")),
  authRepPhone: z.string().optional(),
  registeredOffice: z.object({
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    region: z.string().optional(),
    postal: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  // OBR Filing Information
  naicsCode: z.string().optional(),
  officialEmail: z.string().email().optional().or(z.literal("")),
  // Director Configuration
  directorNumberType: z.enum(["fixed", "range"]).optional(),
  directorFixedNumber: z.preprocess((val) => val === "" ? undefined : val, z.coerce.number().int().optional()),
  directorMinNumber: z.preprocess((val) => val === "" ? undefined : val, z.coerce.number().int().optional()),
  directorMaxNumber: z.preprocess((val) => val === "" ? undefined : val, z.coerce.number().int().optional()),
  // Shares & Provisions
  sharesProvisions: z.string().optional(),
  usesPredefinedShares: z.boolean().optional(),
  // NUANS Information
  nuansReportNumber: z.string().optional(),
  nuansReportDate: z.string().optional(),
  // Legal Opinion
  requiresLegalOpinion: z.boolean().optional(),
});

export default function Entities() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [extractionResults, setExtractionResults] = useState<any[]>([]);
  const [showExtractionModal, setShowExtractionModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { setCurrentEntity } = useEntityContext();

  const { data: orgs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/orgs"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      await apiRequest("POST", "/api/orgs", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orgs"] });
      setShowCreateDialog(false);
      toast({
        title: "Success",
        description: "Entity created successfully",
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      number: "",
      companyKey: "",
      jurisdiction: "",
      formationAt: "",
      amendmentDate: "",
      previousCorporationName: "",
      amendmentDetails: "",
      mailingAddressId: "",
      authRepName: "",
      authRepCompany: "",
      authRepAddressId: "",
      authRepEmail: "",
      authRepPhone: "",
      registeredOffice: {
        line1: "",
        line2: "",
        city: "",
        region: "",
        postal: "",
        country: "",
      },
      // OBR Filing Information
      naicsCode: "",
      officialEmail: "",
      // Director Configuration
      directorNumberType: "fixed",
      directorFixedNumber: "",
      directorMinNumber: "",
      directorMaxNumber: "",
      // Shares & Provisions
      sharesProvisions: "",
      usesPredefinedShares: false,
      // NUANS Information
      nuansReportNumber: "",
      nuansReportDate: "",
      // Legal Opinion
      requiresLegalOpinion: false,
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    // Validate Ontario address if provided
    if (data.registeredOffice && data.registeredOffice.line1) {
      const addressValidation = validateOntarioAddress(data.registeredOffice);
      if (!addressValidation.isValid) {
        toast({
          title: "Address Validation Error",
          description: addressValidation.errors.join(", "),
          variant: "destructive",
        });
        return;
      }
    }
    
    createMutation.mutate(data);
  };

  // Handle form validation errors by scrolling to and highlighting the first error field
  const handleFormError = () => {
    const firstErrorField = Object.keys(form.formState.errors)[0];
    if (firstErrorField) {
      // Scroll to the field with error
      const errorElement = document.querySelector(`[name="${firstErrorField}"]`) as HTMLElement;
      if (errorElement) {
        errorElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        // Add visual emphasis with a flash effect
        errorElement.classList.add('animate-pulse', 'border-red-500', 'border-2');
        errorElement.focus();
        
        // Remove the flash effect after 2 seconds
        setTimeout(() => {
          errorElement.classList.remove('animate-pulse', 'border-red-500', 'border-2');
        }, 2000);
      }
    }
  };

  const handleExtractionComplete = (results: any[]) => {
    setExtractionResults(results);
    if (results.length > 0) {
      setShowExtractionModal(true);
    }
  };

  const handleApplyExtractionResults = (selectedData: any) => {
    // Pre-fill form with extracted data
    if (selectedData.entities && selectedData.entities.length > 0) {
      const entity = selectedData.entities[0];
      form.setValue('name', entity.name);
      if (entity.incorporationNumber) {
        form.setValue('number', entity.incorporationNumber);
      }
      if (entity.jurisdiction) {
        form.setValue('jurisdiction', entity.jurisdiction);
      }
      // Set amendment fields if available
      if (entity.amendmentDate) {
        form.setValue('amendmentDate', entity.amendmentDate);
      }
      if (entity.previousCorporationName) {
        form.setValue('previousCorporationName', entity.previousCorporationName);
      }
      if (entity.amendmentDetails) {
        form.setValue('amendmentDetails', entity.amendmentDetails);
      }
    }
    
    toast({
      title: 'Data Applied',
      description: 'Extracted information has been pre-filled in the form',
    });
  };

  // Filter and sort entities
  const filteredAndSortedOrgs = React.useMemo(() => {
    let filtered = orgs.filter((org: any) => {
      // Search filter
      const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (org.number && org.number.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           org.jurisdiction.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Type filter (assuming we have this data)
      const matchesType = filterType === 'all' || 
                         (org.entityType && org.entityType.toLowerCase() === filterType.toLowerCase());
      
      // Status filter (assuming all entities are active for now)
      const matchesStatus = filterStatus === 'all' || filterStatus === 'active';
      
      return matchesSearch && matchesType && matchesStatus;
    });

    // Sort entities
    filtered.sort((a: any, b: any) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'date':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'jurisdiction':
          aValue = a.jurisdiction.toLowerCase();
          bValue = b.jurisdiction.toLowerCase();
          break;
        case 'number':
          aValue = a.number || '';
          bValue = b.number || '';
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [orgs, searchTerm, sortBy, sortOrder, filterType, filterStatus]);

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getEntityInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase();
  };

  const handleViewEntity = (entityId: string) => {
    // Find the entity data to set in context
    const entity = orgs.find((org: any) => org.id === entityId);
    if (entity) {
      setCurrentEntity({
        id: entity.id,
        name: entity.name,
        jurisdiction: entity.jurisdiction,
        number: entity.number || undefined
      });
    }
    // Navigate to entity detail view page
    setLocation(`/entities/${entityId}`);
  };

  const handleEditEntity = (entityId: string) => {
    // Navigate to entity edit page
    setLocation(`/entities/${entityId}/edit`);
  };

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold">Entities</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your legal entities and corporate structures
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button data-testid="create-entity-button">
                <i className="fas fa-plus mr-2"></i>
                Create Entity
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Entity</DialogTitle>
                <DialogDescription>
                  Add a new legal entity to your portfolio or scan documents to auto-populate
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="manual" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="manual" data-testid="tab-manual-entry">
                    <i className="fas fa-keyboard mr-2"></i>
                    Manual Entry
                  </TabsTrigger>
                  <TabsTrigger value="scan" data-testid="tab-pdf-scan">
                    <i className="fas fa-file-pdf mr-2"></i>
                    Scan PDF Documents
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="scan" className="space-y-6">
                  <div className="text-center bg-blue-50 dark:bg-blue-950 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-magic text-white text-xl"></i>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">✨ Smart Document Extraction</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload incorporation documents or articles of organization. Our AI scanning technology automatically extracts entity information and saves you time
                    </p>
                  </div>
                  <PDFIngestion 
                    onExtractionComplete={handleExtractionComplete}
                    className="mt-4"
                  />
                </TabsContent>
                
                <TabsContent value="manual" className="space-y-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit, handleFormError)} className="space-y-8">
                  {/* Basic Information Section */}
                  <div className="space-y-4">
                    <div className="border-b border-border pb-3">
                      <h3 className="text-lg font-medium flex items-center">
                        <i className="fas fa-info-circle mr-2 text-primary"></i>
                        Basic Information
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Essential details about your legal entity
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Entity Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-entity-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Registration Number</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} data-testid="input-registration-number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    </div>
                  </div>

                  {/* Corporate Details Section */}
                  <div className="space-y-4">
                    <div className="border-b border-border pb-3">
                      <h3 className="text-lg font-medium flex items-center">
                        <i className="fas fa-building mr-2 text-primary"></i>
                        Corporate Details
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Jurisdiction and registration information
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="companyKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Key</FormLabel>
                          <FormControl>
                            <PasswordInput {...field} value={field.value || ""} data-testid="input-company-key" placeholder="Enter secure company key" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="jurisdiction"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jurisdiction</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-jurisdiction">
                                <SelectValue placeholder="Select jurisdiction" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="CBCA">CBCA (Federal Canada)</SelectItem>
                              <SelectItem value="OBCA">OBCA (Ontario)</SelectItem>
                              <SelectItem value="BCBCA">BCBCA (British Columbia)</SelectItem>
                              <SelectItem value="DE">Delaware</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="formationAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Formation Date</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              value={field.value || ''}
                              data-testid="input-formation-date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Amendment Information Section */}
                  <div className="space-y-4">
                    <div className="border-b border-border pb-3">
                      <h3 className="text-lg font-medium flex items-center">
                        <i className="fas fa-edit mr-2 text-primary"></i>
                        Amendment Information
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Optional details about any amendments to your entity (if applicable)
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="amendmentDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amendment Date</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                value={field.value || ''}
                                data-testid="input-amendment-date"
                              />
                            </FormControl>
                            <FormDescription>
                              Date when entity amendments were made
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="previousCorporationName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Previous Corporation Name</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ""} data-testid="input-previous-name" placeholder="Enter previous name if changed" />
                            </FormControl>
                            <FormDescription>
                              Original name if entity was renamed
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="amendmentDetails"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amendment Details</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              value={field.value || ""} 
                              data-testid="input-amendment-details" 
                              placeholder="Describe the nature of amendments made to this entity..."
                              rows={3}
                            />
                          </FormControl>
                          <FormDescription>
                            Additional details about entity amendments
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="border-b border-border pb-3">
                      <h3 className="text-lg font-medium flex items-center">
                        <i className="fas fa-map-marker-alt mr-2 text-primary"></i>
                        Registered Office Address
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Official registered address for legal correspondence
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="registeredOffice.line1"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address Line 1</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-registered-line1" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="registeredOffice.line2"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address Line 2</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-registered-line2" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="registeredOffice.city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-registered-city" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="registeredOffice.region"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Province/State</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-registered-region" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="registeredOffice.postal"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postal Code</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-registered-postal" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="registeredOffice.country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Canada" data-testid="input-registered-country" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* OBR Filing Information Section */}
                  <div className="space-y-4">
                    <div className="border-b border-border pb-3">
                      <h3 className="text-lg font-medium flex items-center">
                        <i className="fas fa-file-alt mr-2 text-primary"></i>
                        OBR Filing Information
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Information required for Ontario Business Registry filing
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="naicsCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>NAICS Industry Code</FormLabel>
                            <FormControl>
                              <NAICSSelector 
                                value={field.value} 
                                onChange={field.onChange}
                              />
                            </FormControl>
                            <FormDescription>
                              Select the primary industry classification
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="officialEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Official Corporate Email</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                {...field} 
                                value={field.value || ""} 
                                data-testid="input-official-email" 
                                placeholder="contact@company.com"
                              />
                            </FormControl>
                            <FormDescription>
                              Email for official OBR communications
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Director Configuration Section */}
                  <div className="space-y-4">
                    <div className="border-b border-border pb-3">
                      <h3 className="text-lg font-medium flex items-center">
                        <i className="fas fa-users mr-2 text-primary"></i>
                        Director Configuration
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Specify the number of directors for this entity
                      </p>
                    </div>
                    <FormField
                      control={form.control}
                      name="directorNumberType"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Director Number Type</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-col space-y-1"
                            >
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="fixed" data-testid="radio-director-fixed" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  Fixed number of directors
                                </FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="range" data-testid="radio-director-range" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  Range of directors (minimum and maximum)
                                </FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {form.watch("directorNumberType") === "fixed" && (
                      <FormField
                        control={form.control}
                        name="directorFixedNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fixed Number of Directors</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1" 
                                {...field} 
                                value={field.value || ""} 
                                data-testid="input-director-fixed-number" 
                                placeholder="e.g., 3"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    
                    {form.watch("directorNumberType") === "range" && (
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="directorMinNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Minimum Number</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1" 
                                  {...field} 
                                  value={field.value || ""} 
                                  data-testid="input-director-min-number" 
                                  placeholder="e.g., 1"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="directorMaxNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Maximum Number</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1" 
                                  {...field} 
                                  value={field.value || ""} 
                                  data-testid="input-director-max-number" 
                                  placeholder="e.g., 10"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>

                  {/* Shares & Provisions Section */}
                  <div className="space-y-4">
                    <div className="border-b border-border pb-3">
                      <h3 className="text-lg font-medium flex items-center">
                        <i className="fas fa-chart-pie mr-2 text-primary"></i>
                        Shares & Provisions
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Share structure and provisions for this entity
                      </p>
                    </div>
                    <FormField
                      control={form.control}
                      name="usesPredefinedShares"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Use Predefined Share Structure
                            </FormLabel>
                            <FormDescription>
                              Enable to use a standard predefined share structure
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-predefined-shares"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sharesProvisions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Shares and Provisions</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              value={field.value || ""} 
                              data-testid="input-shares-provisions" 
                              placeholder="Enter the full shares and provisions text..."
                              rows={5}
                            />
                          </FormControl>
                          <FormDescription>
                            Detailed description of share classes, rights, and provisions
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* NUANS Information Section */}
                  <div className="space-y-4">
                    <div className="border-b border-border pb-3">
                      <h3 className="text-lg font-medium flex items-center">
                        <i className="fas fa-file-signature mr-2 text-primary"></i>
                        NUANS Information
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Newly Upgraded Automated Name Search report details
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="nuansReportNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>NUANS Report Number</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                value={field.value || ""} 
                                data-testid="input-nuans-report-number" 
                                placeholder="Enter NUANS report number"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="nuansReportDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>NUANS Report Date</FormLabel>
                            <FormControl>
                              <Input
                                type="date"
                                {...field}
                                value={field.value || ''}
                                data-testid="input-nuans-report-date"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Legal Opinion Section */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="requiresLegalOpinion"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-legal-opinion"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>
                              Requires Legal Opinion
                            </FormLabel>
                            <FormDescription>
                              Check if this entity requires a legal opinion for incorporation
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreateDialog(false)}
                      data-testid="cancel-button"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      data-testid="submit-button"
                    >
                      {createMutation.isPending ? (
                        <>
                          <i className="fas fa-spinner fa-spin mr-2"></i>
                          Creating...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-plus mr-2"></i>
                          Create Entity
                        </>
                      )}
                    </Button>
                  </div>
                  </div>
                </form>
              </Form>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search entities by name, number, or jurisdiction..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="search-entities"
            />
          </div>
          
          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="shrink-0" data-testid="sort-dropdown">
                {sortOrder === 'asc' ? <SortAsc className="h-4 w-4 mr-2" /> : <SortDesc className="h-4 w-4 mr-2" />}
                Sort by {sortBy === 'date' ? 'Date' : sortBy === 'jurisdiction' ? 'Jurisdiction' : sortBy === 'number' ? 'Number' : 'Name'}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => toggleSort('name')} data-testid="sort-name">
                Sort by Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleSort('date')} data-testid="sort-date">
                Sort by Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleSort('jurisdiction')} data-testid="sort-jurisdiction">
                Sort by Jurisdiction {sortBy === 'jurisdiction' && (sortOrder === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleSort('number')} data-testid="sort-number">
                Sort by Number {sortBy === 'number' && (sortOrder === 'asc' ? '↑' : '↓')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="shrink-0" data-testid="filter-dropdown">
                <Filter className="h-4 w-4 mr-2" />
                Filters
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="px-2 py-1 text-sm font-medium">Type</div>
              <DropdownMenuItem onClick={() => setFilterType('all')} data-testid="filter-type-all">
                All Types {filterType === 'all' && '✓'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType('corporation')} data-testid="filter-type-corporation">
                Corporation {filterType === 'corporation' && '✓'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType('partnership')} data-testid="filter-type-partnership">
                Partnership {filterType === 'partnership' && '✓'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType('llc')} data-testid="filter-type-llc">
                LLC {filterType === 'llc' && '✓'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-2 py-1 text-sm font-medium">Status</div>
              <DropdownMenuItem onClick={() => setFilterStatus('all')} data-testid="filter-status-all">
                All Status {filterStatus === 'all' && '✓'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('active')} data-testid="filter-status-active">
                Active {filterStatus === 'active' && '✓'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('inactive')} data-testid="filter-status-inactive">
                Inactive {filterStatus === 'inactive' && '✓'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Results Count */}
          <div className="text-sm text-muted-foreground shrink-0">
            {filteredAndSortedOrgs.length} of {orgs.length} entities
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <i className="fas fa-spinner fa-spin text-2xl text-muted-foreground"></i>
          </div>
        ) : filteredAndSortedOrgs.length === 0 && orgs.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <i className="fas fa-building text-4xl text-muted-foreground mb-4"></i>
              <CardTitle className="mb-2">No entities yet</CardTitle>
              <CardDescription className="mb-4">
                Create your first legal entity to get started with corporate management
              </CardDescription>
              <Button
                onClick={() => setShowCreateDialog(true)}
                data-testid="create-first-entity-button"
              >
                <i className="fas fa-plus mr-2"></i>
                Create Your First Entity
              </Button>
            </CardContent>
          </Card>
        ) : filteredAndSortedOrgs.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <CardTitle className="mb-2">No entities found</CardTitle>
              <CardDescription className="mb-6">
                No entities match your current search and filter criteria. Try adjusting your search terms or filters.
              </CardDescription>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => setSearchTerm('')} data-testid="clear-search">
                  Clear Search
                </Button>
                <Button variant="outline" onClick={() => { setFilterType('all'); setFilterStatus('all'); }} data-testid="clear-filters">
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedOrgs.map((org: any) => (
              <Card key={org.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <span className="text-lg font-medium text-primary">
                        {getEntityInitials(org.name)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{org.name}</CardTitle>
                      <CardDescription>
                        {org.jurisdiction} • #{org.number || 'No number'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Formation Date:</span>
                      <span>{org.formationAt ? formatDate(org.formationAt) : 'Not set'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant="success">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Last Updated:</span>
                      <span className="text-xs">{formatDate(org.updatedAt)}</span>
                    </div>
                    
                    <div className="flex gap-2 pt-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1" 
                        onClick={() => handleViewEntity(org.id)}
                        data-testid={`view-entity-${org.id}`}
                      >
                        <i className="fas fa-eye mr-2"></i>
                        View
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1" 
                        onClick={() => handleEditEntity(org.id)}
                        data-testid={`edit-entity-${org.id}`}
                      >
                        <i className="fas fa-edit mr-2"></i>
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => toast({ title: "Feature coming soon", description: "Document generation will be available soon" })}
                        data-testid={`generate-docs-${org.id}`}
                      >
                        <i className="fas fa-file-download"></i>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
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
