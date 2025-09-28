import { useState, useEffect } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useEntityContext } from "@/hooks/useEntityContext";
import { apiRequest } from "@/lib/queryClient";
import {
  Building2,
  Users,
  FileText,
  Calendar,
  DollarSign,
  MapPin,
  CheckCircle,
  Settings,
  Eye,
  Save,
  ArrowRight
} from "lucide-react";
import type { 
  CorporateFormationResolution, 
  CorporateFormationConfig,
  STANDARD_CORPORATE_FORMATION_RESOLUTIONS,
  PersonWithRoles,
  EntityData 
} from "@shared/schema";

// Import the standard resolutions - in a real app these might come from an API
const RESOLUTIONS: CorporateFormationResolution[] = [
  // INCORPORATOR'S WRITTEN RESOLUTIONS
  {
    id: 'inc_001',
    title: 'Approval of Articles of Incorporation',
    description: 'Approve the form and content of the Articles of Incorporation',
    content: 'Resolved that the form and content of the Articles of Incorporation of the Corporation are approved.',
    category: 'incorporator',
    order: 1,
    isRequired: true,
    isCustomizable: false,
  },
  {
    id: 'inc_002',
    title: 'Appointment of Initial Directors',
    description: 'Appoint the first director(s) of the Corporation',
    content: 'Resolved that the following individuals are appointed as the first directors of the Corporation, effective as of {{incorporationDate}}: {{directorNames}}.',
    category: 'incorporator',
    order: 2,
    isRequired: true,
    isCustomizable: true,
    customizationFields: [
      {
        fieldId: 'incorporationDate',
        label: 'Incorporation Date',
        type: 'date',
        required: true,
      },
      {
        fieldId: 'directorNames',
        label: 'Director Names',
        type: 'text',
        placeholder: 'Enter director names separated by commas',
        required: true,
      },
    ],
  },
  {
    id: 'inc_003',
    title: 'Resignation of Incorporator and Transfer of Corporate Records',
    description: 'Incorporator resigns and transfers corporate records to initial directors',
    content: 'Resolved that the undersigned incorporator hereby resigns as incorporator of the Corporation, delivers the corporate records and minute book (and seal, if any) to the initial directors, and authorizes the initial directors to undertake and complete the organization of the Corporation.',
    category: 'incorporator',
    order: 3,
    isRequired: true,
    isCustomizable: false,
  },

  // FIRST DIRECTORS' RESOLUTIONS  
  {
    id: 'dir_001',
    title: 'Adoption of General By-law No. 1',
    description: 'Adopt the corporation\'s general by-law',
    content: 'Resolved that General By-law No. 1, in the form presented to the directors, is hereby adopted as the by-law of the Corporation, to take effect immediately until confirmed, amended or rejected by the shareholders in accordance with the Act.',
    category: 'directors',
    order: 1,
    isRequired: true,
    isCustomizable: false,
  },
  {
    id: 'dir_002',
    title: 'Appointment of Officers',
    description: 'Appoint President/CEO and other officers',
    content: 'Resolved that the following individuals are appointed as officers of the Corporation, to hold office at the pleasure of the Board: {{officerAppointments}}.',
    category: 'directors',
    order: 2,
    isRequired: true,
    isCustomizable: true,
    customizationFields: [
      {
        fieldId: 'presidentName',
        label: 'President/CEO',
        type: 'person',
        required: true,
      },
      {
        fieldId: 'secretaryName',
        label: 'Secretary',
        type: 'person',
        required: true,
      },
    ],
  },
  {
    id: 'dir_003',
    title: 'Registered Office',
    description: 'Fix the registered office address',
    content: 'Resolved that the registered office of the Corporation be and is hereby fixed at {{registeredOfficeAddress}} and that the officers are authorized to file any required notices.',
    category: 'directors',
    order: 3,
    isRequired: true,
    isCustomizable: true,
    customizationFields: [
      {
        fieldId: 'registeredOfficeAddress',
        label: 'Registered Office Address',
        type: 'address',
        required: true,
      },
    ],
  },
  {
    id: 'dir_004',
    title: 'Share Certificates',
    description: 'Approve and adopt the form of share certificate',
    content: 'Resolved that the form of share certificate annexed to the minute book is approved and adopted as the form of certificate for the common shares in the capital of the Corporation.',
    category: 'directors',
    order: 4,
    isRequired: true,
    isCustomizable: false,
  },
  {
    id: 'dir_005',
    title: 'Issuance of Shares to Initial Shareholders',
    description: 'Authorize issuance of common shares',
    content: 'Resolved that the Corporation issue the following shares to the following subscribers for the consideration set out: {{shareIssuances}}, and that the officers are authorized to execute and deliver share certificates and to update the securities register accordingly.',
    category: 'directors',
    order: 5,
    isRequired: true,
    isCustomizable: true,
    customizationFields: [
      {
        fieldId: 'sharePrice',
        label: 'Share Price',
        type: 'currency',
        required: true,
        defaultValue: 1.00,
      },
      {
        fieldId: 'currency',
        label: 'Currency',
        type: 'select',
        options: ['CAD', 'USD', 'EUR', 'GBP'],
        required: true,
        defaultValue: 'CAD',
      },
    ],
  },
  {
    id: 'dir_006',
    title: 'Banking Arrangements',
    description: 'Authorize bank account opening and signing authorities',
    content: 'Resolved that the Corporation is authorized to open and maintain one or more bank accounts with such financial institution(s) as any officer may determine, and that any two officers (or such other signing authorities as the Board may designate) are authorized to execute all account opening documents and banking resolutions.',
    category: 'directors',
    order: 6,
    isRequired: true,
    isCustomizable: false,
  },
  {
    id: 'dir_007',
    title: 'Fiscal Year-End',
    description: 'Set the financial year end date',
    content: 'Resolved that the fiscal year-end of the Corporation be and is hereby fixed at {{fiscalYearEnd}} until changed by further resolution of the Board.',
    category: 'directors',
    order: 7,
    isRequired: true,
    isCustomizable: true,
    customizationFields: [
      {
        fieldId: 'fiscalYearEnd',
        label: 'Fiscal Year End',
        type: 'date',
        placeholder: 'December 31',
        required: true,
      },
    ],
  },

  // SHAREHOLDERS' RESOLUTIONS
  {
    id: 'sha_001',
    title: 'Election of Directors',
    description: 'Elect directors to hold office',
    content: 'Resolved that the following individuals are elected as directors of the Corporation, to hold office until their successors are duly elected or appointed: {{directorNames}}.',
    category: 'shareholders',
    order: 1,
    isRequired: true,
    isCustomizable: true,
    customizationFields: [
      {
        fieldId: 'directorNames',
        label: 'Director Names',
        type: 'text',
        required: true,
      },
    ],
  },
  {
    id: 'sha_002',
    title: 'Confirmation of By-law',
    description: 'Confirm General By-law No. 1',
    content: 'Resolved that General By-law No. 1 of the Corporation be and is hereby confirmed.',
    category: 'shareholders',
    order: 2,
    isRequired: true,
    isCustomizable: false,
  },
  {
    id: 'sha_003',
    title: 'Number of Directors',
    description: 'Fix the number of directors',
    content: 'Resolved that the number of directors of the Corporation is fixed at {{numberOfDirectors}} until changed in accordance with the Articles and the Act.',
    category: 'shareholders',
    order: 3,
    isRequired: true,
    isCustomizable: true,
    customizationFields: [
      {
        fieldId: 'numberOfDirectors',
        label: 'Number of Directors',
        type: 'number',
        required: true,
        defaultValue: 1,
        validation: {
          min: 1,
          max: 50,
        },
      },
    ],
  },
  {
    id: 'sha_004',
    title: 'Ratification of Acts',
    description: 'Approve and ratify all acts by incorporator and directors',
    content: 'Resolved that all acts, contracts, proceedings, appointments and elections made or taken by the incorporator and the Board of Directors to date are approved, ratified and confirmed.',
    category: 'shareholders',
    order: 4,
    isRequired: true,
    isCustomizable: false,
  },
];

interface CorporateFormationMinuteBookProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMinuteBookCreated: (minuteBookId: string) => void;
  orgId: string;
}

export function CorporateFormationMinuteBook({ 
  open, 
  onOpenChange, 
  onMinuteBookCreated, 
  orgId 
}: CorporateFormationMinuteBookProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentEntity } = useEntityContext();
  const [currentStep, setCurrentStep] = useState<'configure' | 'preview' | 'creating'>('configure');
  const [selectedResolutions, setSelectedResolutions] = useState<string[]>([]);
  const [customizations, setCustomizations] = useState<Record<string, any>>({});
  const [minuteBookName, setMinuteBookName] = useState('');
  const [description, setDescription] = useState('');
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Fetch entity data for auto-population
  const { data: entityData } = useQuery<EntityData>({
    queryKey: ["/api/orgs", orgId, "entity-data"],
    enabled: !!orgId && open,
  });

  // Group resolutions by category
  const resolutionsByCategory = {
    incorporator: RESOLUTIONS.filter(r => r.category === 'incorporator').sort((a, b) => a.order - b.order),
    directors: RESOLUTIONS.filter(r => r.category === 'directors').sort((a, b) => a.order - b.order),
    shareholders: RESOLUTIONS.filter(r => r.category === 'shareholders').sort((a, b) => a.order - b.order),
  };

  // Initialize default selections and customizations
  useEffect(() => {
    if (open && RESOLUTIONS.length > 0) {
      // Select all required resolutions by default
      const requiredResolutions = RESOLUTIONS.filter(r => r.isRequired).map(r => r.id);
      setSelectedResolutions(requiredResolutions);

      // Set default minute book name
      if (currentEntity?.name) {
        setMinuteBookName(`${currentEntity.name} - Incorporation Minute Book`);
      }

      // Auto-populate customizations from entity data
      if (entityData) {
        const defaultCustomizations: Record<string, any> = {};
        
        // Set incorporation date if available
        if (entityData.organization.formationAt) {
          defaultCustomizations.incorporationDate = entityData.organization.formationAt.toISOString().split('T')[0];
        }

        // Set fiscal year end - default to December 31 of current year
        defaultCustomizations.fiscalYearEnd = `${new Date().getFullYear()}-12-31`;

        // Set director names from entity data
        const directors = entityData.people.filter(p => 
          p.roles.some(r => r.role === 'director')
        ).map(p => `${p.firstName} ${p.lastName}`);
        if (directors.length > 0) {
          defaultCustomizations.directorNames = directors.join(', ');
          defaultCustomizations.numberOfDirectors = directors.length;
        }

        // Set officer names
        const president = entityData.people.find(p => 
          p.roles.some(r => r.role === 'president' || r.role === 'ceo')
        );
        if (president) {
          defaultCustomizations.presidentName = `${president.firstName} ${president.lastName}`;
        }

        const secretary = entityData.people.find(p => 
          p.roles.some(r => r.role === 'secretary')
        );
        if (secretary) {
          defaultCustomizations.secretaryName = `${secretary.firstName} ${secretary.lastName}`;
        }

        // Set registered office address
        if (entityData.organization.registeredOfficeId) {
          const address = entityData.addresses.find(a => a.id === entityData.organization.registeredOfficeId);
          if (address) {
            defaultCustomizations.registeredOfficeAddress = `${address.line1}${address.line2 ? ', ' + address.line2 : ''}, ${address.city}, ${address.region}, ${address.country} ${address.postal}`;
          }
        }

        // Set default share price and currency
        defaultCustomizations.sharePrice = 1.00;
        defaultCustomizations.currency = 'CAD';

        setCustomizations(defaultCustomizations);
      }
    }
  }, [open, entityData, currentEntity]);

  // Create minute book mutation
  const createMinuteBookMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      selectedResolutions: string[];
      customizations: Record<string, any>;
    }) => {
      return await apiRequest("POST", `/api/orgs/${orgId}/minute-books/corporate-formation`, {
        name: data.name,
        description: data.description,
        selectedResolutions: data.selectedResolutions,
        customizations: data.customizations,
      });
    },
    onSuccess: (data) => {
      onMinuteBookCreated(data.id);
      onOpenChange(false);
      setCurrentStep('configure');
      toast({
        title: "Success",
        description: "Corporate formation minute book created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setCurrentStep('configure');
    },
  });

  const handleResolutionToggle = (resolutionId: string, checked: boolean) => {
    if (checked) {
      setSelectedResolutions(prev => [...prev, resolutionId]);
    } else {
      const resolution = RESOLUTIONS.find(r => r.id === resolutionId);
      if (resolution?.isRequired) {
        toast({
          title: "Required Resolution",
          description: "This resolution is required for corporate formation and cannot be removed.",
          variant: "destructive",
        });
        return;
      }
      setSelectedResolutions(prev => prev.filter(id => id !== resolutionId));
    }
  };

  const handleCustomizationChange = (fieldId: string, value: any) => {
    setCustomizations(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleCreateMinuteBook = () => {
    if (!minuteBookName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a name for the minute book.",
        variant: "destructive",
      });
      return;
    }

    if (selectedResolutions.length === 0) {
      toast({
        title: "Validation Error", 
        description: "Please select at least one resolution.",
        variant: "destructive",
      });
      return;
    }

    setCurrentStep('creating');
    createMinuteBookMutation.mutate({
      name: minuteBookName,
      description,
      selectedResolutions,
      customizations,
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'incorporator': return <FileText className="h-5 w-5" />;
      case 'directors': return <Users className="h-5 w-5" />;
      case 'shareholders': return <Building2 className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case 'incorporator': return "Incorporator's Written Resolutions";
      case 'directors': return "First Directors' Resolutions";
      case 'shareholders': return "Shareholders' Resolutions";
      default: return category;
    }
  };

  const getCategoryDescription = (category: string) => {
    switch (category) {
      case 'incorporator': return "Initial resolutions by the incorporator to establish the corporation";
      case 'directors': return "First resolutions by the board of directors to organize the corporation"; 
      case 'shareholders': return "Shareholder resolutions to confirm directors and corporate structure";
      default: return "";
    }
  };

  const renderCustomizationField = (resolution: CorporateFormationResolution, field: any) => {
    const value = customizations[field.fieldId] || field.defaultValue || '';

    switch (field.type) {
      case 'text':
        return (
          <div key={field.fieldId} className="space-y-2">
            <Label htmlFor={field.fieldId}>{field.label}</Label>
            <Input
              id={field.fieldId}
              value={value}
              onChange={(e) => handleCustomizationChange(field.fieldId, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              data-testid={`input-${field.fieldId}`}
            />
          </div>
        );

      case 'number':
        return (
          <div key={field.fieldId} className="space-y-2">
            <Label htmlFor={field.fieldId}>{field.label}</Label>
            <Input
              id={field.fieldId}
              type="number"
              value={value}
              onChange={(e) => handleCustomizationChange(field.fieldId, parseInt(e.target.value))}
              required={field.required}
              min={field.validation?.min}
              max={field.validation?.max}
              data-testid={`input-${field.fieldId}`}
            />
          </div>
        );

      case 'date':
        return (
          <div key={field.fieldId} className="space-y-2">
            <Label htmlFor={field.fieldId}>{field.label}</Label>
            <Input
              id={field.fieldId}
              type="date"
              value={value}
              onChange={(e) => handleCustomizationChange(field.fieldId, e.target.value)}
              required={field.required}
              data-testid={`input-${field.fieldId}`}
            />
          </div>
        );

      case 'currency':
        return (
          <div key={field.fieldId} className="space-y-2">
            <Label htmlFor={field.fieldId}>{field.label}</Label>
            <Input
              id={field.fieldId}
              type="number"
              step="0.01"
              value={value}
              onChange={(e) => handleCustomizationChange(field.fieldId, parseFloat(e.target.value))}
              required={field.required}
              data-testid={`input-${field.fieldId}`}
            />
          </div>
        );

      case 'select':
        return (
          <div key={field.fieldId} className="space-y-2">
            <Label htmlFor={field.fieldId}>{field.label}</Label>
            <Select
              value={value}
              onValueChange={(newValue) => handleCustomizationChange(field.fieldId, newValue)}
            >
              <SelectTrigger data-testid={`select-${field.fieldId}`}>
                <SelectValue placeholder={`Select ${field.label}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      default:
        return null;
    }
  };

  const generatePreviewContent = (resolution: CorporateFormationResolution) => {
    let content = resolution.content;
    
    // Replace template variables with actual values
    Object.entries(customizations).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      if (content.includes(placeholder)) {
        content = content.replace(new RegExp(placeholder, 'g'), String(value || '[TO BE COMPLETED]'));
      }
    });

    return content;
  };

  if (currentStep === 'creating') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 animate-spin" />
              Creating Corporate Formation Minute Book
            </DialogTitle>
            <DialogDescription>
              Generating your corporate formation minute book with all selected resolutions...
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4 py-6">
            <Progress value={75} className="w-full" />
            <p className="text-sm text-muted-foreground">
              This may take a few moments to complete.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Corporate Formation Minute Book
          </DialogTitle>
          <DialogDescription>
            Create a comprehensive minute book with all standard corporate formation resolutions
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-full max-h-[70vh]">
          {/* Configuration Panel */}
          <div className="flex-1 p-4 overflow-y-auto border-r">
            <div className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="minuteBookName">Minute Book Name</Label>
                    <Input
                      id="minuteBookName"
                      value={minuteBookName}
                      onChange={(e) => setMinuteBookName(e.target.value)}
                      placeholder="Enter minute book name"
                      data-testid="input-minute-book-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter description for this minute book"
                      data-testid="textarea-description"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Resolution Categories */}
              {Object.entries(resolutionsByCategory).map(([category, resolutions]) => (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {getCategoryIcon(category)}
                      {getCategoryTitle(category)}
                    </CardTitle>
                    <CardDescription>{getCategoryDescription(category)}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="multiple" className="w-full">
                      {resolutions.map((resolution) => {
                        const isSelected = selectedResolutions.includes(resolution.id);
                        return (
                          <AccordionItem key={resolution.id} value={resolution.id}>
                            <AccordionTrigger className="hover:no-underline">
                              <div className="flex items-center gap-3 flex-1">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => 
                                    handleResolutionToggle(resolution.id, checked as boolean)
                                  }
                                  data-testid={`checkbox-${resolution.id}`}
                                />
                                <div className="flex-1 text-left">
                                  <div className="font-medium">{resolution.title}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {resolution.description}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  {resolution.isRequired && (
                                    <Badge variant="secondary">Required</Badge>
                                  )}
                                  {resolution.isCustomizable && (
                                    <Badge variant="outline">Customizable</Badge>
                                  )}
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-4 pt-4">
                                <div className="p-3 bg-muted rounded-md">
                                  <p className="text-sm">{resolution.content}</p>
                                </div>
                                {resolution.isCustomizable && resolution.customizationFields && (
                                  <div className="space-y-4">
                                    <h4 className="font-medium">Customization Options</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                      {resolution.customizationFields.map((field) =>
                                        renderCustomizationField(resolution, field)
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Preview Panel */}
          <div className="w-96 p-4 overflow-y-auto bg-muted/30">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </h3>
                <Badge variant="outline">
                  {selectedResolutions.length} resolution{selectedResolutions.length !== 1 ? 's' : ''}
                </Badge>
              </div>

              {selectedResolutions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select resolutions to see preview</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(resolutionsByCategory).map(([category, resolutions]) => {
                    const selectedInCategory = resolutions.filter(r => 
                      selectedResolutions.includes(r.id)
                    );
                    
                    if (selectedInCategory.length === 0) return null;

                    return (
                      <div key={category} className="space-y-2">
                        <h4 className="font-medium text-sm text-primary">
                          {getCategoryTitle(category)}
                        </h4>
                        {selectedInCategory.map((resolution) => (
                          <Card key={resolution.id} className="p-3">
                            <div className="space-y-2">
                              <div className="font-medium text-sm">{resolution.title}</div>
                              <div className="text-xs text-muted-foreground">
                                {generatePreviewContent(resolution)}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4" />
            {selectedResolutions.length} resolutions selected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
              Cancel
            </Button>
            <Button
              onClick={handleCreateMinuteBook}
              disabled={!minuteBookName.trim() || selectedResolutions.length === 0}
              data-testid="button-create-minute-book"
            >
              <Save className="h-4 w-4 mr-2" />
              Create Minute Book
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}