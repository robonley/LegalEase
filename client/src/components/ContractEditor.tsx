import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertContractSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Save, 
  X, 
  FileText, 
  Users, 
  Calendar as CalendarIcon, 
  Upload, 
  Plus, 
  Trash2,
  ChevronDown,
  ChevronUp,
  List,
  DollarSign,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Types
type Contract = {
  id: string;
  orgId: string;
  name: string;
  contractType: string;
  status: string;
  description?: string;
  contractValue?: string;
  currency?: string;
  effectiveDate?: string | Date;
  expirationDate?: string | Date;
  renewalDate?: string | Date;
  autoRenewal?: boolean;
  renewalNoticeDays?: number;
  terminationNoticeDays?: number;
  governingLaw?: string;
  riskLevel?: string;
  tags?: string[];
  content?: string;
};

type Clause = {
  id: string;
  name: string;
  category: string;
  content: string;
  description?: string;
  isStandard: boolean;
  tags?: string[];
};

type Party = {
  id?: string;
  partyType: string;
  personId?: string;
  orgId?: string;
  externalPartyName?: string;
  role: string;
  signatureStatus?: string;
};

type Template = {
  id: string;
  name: string;
  code: string;
  scope: string;
  category?: string;
  description?: string;
  content?: string;
};

type Person = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
};

interface ContractEditorProps {
  contractId?: string;
  orgId: string;
  initialData?: Partial<Contract>;
  onSave?: (contract: Contract) => void;
  onCancel?: () => void;
  mode?: "create" | "edit";
}

const CONTRACT_TYPES = [
  { value: "vendor", label: "Vendor Agreement" },
  { value: "customer", label: "Customer Agreement" },
  { value: "employment", label: "Employment Contract" },
  { value: "nda", label: "Non-Disclosure Agreement" },
  { value: "license", label: "License Agreement" },
  { value: "other", label: "Other" },
];

const CONTRACT_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "terminated", label: "Terminated" },
  { value: "pending_signature", label: "Pending Signature" },
];

const RISK_LEVELS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const CLAUSE_CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "confidentiality", label: "Confidentiality" },
  { value: "termination", label: "Termination" },
  { value: "liability", label: "Liability" },
  { value: "indemnity", label: "Indemnity" },
  { value: "dispute_resolution", label: "Dispute Resolution" },
  { value: "payment", label: "Payment" },
  { value: "other", label: "Other" },
];

const PARTY_ROLES = [
  { value: "client", label: "Client" },
  { value: "vendor", label: "Vendor" },
  { value: "licensor", label: "Licensor" },
  { value: "licensee", label: "Licensee" },
  { value: "employer", label: "Employer" },
  { value: "employee", label: "Employee" },
  { value: "contractor", label: "Contractor" },
  { value: "partner", label: "Partner" },
  { value: "other", label: "Other" },
];

const formSchema = insertContractSchema.extend({
  name: z.string().min(1, "Contract name is required"),
  contractType: z.string().min(1, "Contract type is required"),
  orgId: z.string().min(1, "Organization is required"),
  tags: z.array(z.string()).optional(),
});

export default function ContractEditor({
  contractId,
  orgId,
  initialData,
  onSave,
  onCancel,
  mode = "create",
}: ContractEditorProps) {
  const [content, setContent] = useState(initialData?.content || "");
  const [showClauseLibrary, setShowClauseLibrary] = useState(false);
  const [selectedClauseCategory, setSelectedClauseCategory] = useState("all");
  const [parties, setParties] = useState<Party[]>([]);
  const [showPartiesSection, setShowPartiesSection] = useState(false);
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);
  const [tags, setTags] = useState<string>(initialData?.tags?.join(", ") || "");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing contract if editing
  const { data: existingContract, isLoading: loadingContract } = useQuery<Contract>({
    queryKey: ["/api/contracts", contractId],
    enabled: !!contractId && mode === "edit",
  });

  // Fetch templates
  const { data: templates = [], isLoading: loadingTemplates } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
  });

  // Fetch clauses
  const { data: allClauses = [], isLoading: loadingClauses } = useQuery<Clause[]>({
    queryKey: ["/api/clauses"],
  });

  // Fetch people for party selection
  const { data: people = [] } = useQuery<Person[]>({
    queryKey: ["/api/orgs", orgId, "people"],
    enabled: !!orgId,
  });

  // Filter clauses by category
  const filteredClauses = selectedClauseCategory === "all"
    ? allClauses
    : allClauses.filter(clause => clause.category === selectedClauseCategory);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      orgId: orgId,
      name: initialData?.name || "",
      contractType: initialData?.contractType || "vendor",
      status: initialData?.status || "draft",
      description: initialData?.description || "",
      contractValue: initialData?.contractValue || undefined,
      currency: initialData?.currency || "USD",
      effectiveDate: initialData?.effectiveDate ? new Date(initialData.effectiveDate) : undefined,
      expirationDate: initialData?.expirationDate ? new Date(initialData.expirationDate) : undefined,
      renewalDate: initialData?.renewalDate ? new Date(initialData.renewalDate) : undefined,
      autoRenewal: initialData?.autoRenewal || false,
      renewalNoticeDays: initialData?.renewalNoticeDays || 30,
      terminationNoticeDays: initialData?.terminationNoticeDays || undefined,
      governingLaw: initialData?.governingLaw || "",
      riskLevel: initialData?.riskLevel || "medium",
      tags: initialData?.tags || [],
    },
  });

  // Update form when existing contract loads
  useEffect(() => {
    if (existingContract && mode === "edit") {
      form.reset({
        orgId: existingContract.orgId,
        name: existingContract.name,
        contractType: existingContract.contractType,
        status: existingContract.status,
        description: existingContract.description || "",
        contractValue: existingContract.contractValue || undefined,
        currency: existingContract.currency || "USD",
        effectiveDate: existingContract.effectiveDate ? new Date(existingContract.effectiveDate) : undefined,
        expirationDate: existingContract.expirationDate ? new Date(existingContract.expirationDate) : undefined,
        renewalDate: existingContract.renewalDate ? new Date(existingContract.renewalDate) : undefined,
        autoRenewal: existingContract.autoRenewal || false,
        renewalNoticeDays: existingContract.renewalNoticeDays || 30,
        terminationNoticeDays: existingContract.terminationNoticeDays || undefined,
        governingLaw: existingContract.governingLaw || "",
        riskLevel: existingContract.riskLevel || "medium",
        tags: existingContract.tags || [],
      });
      setContent(existingContract.content || "");
      setTags(existingContract.tags?.join(", ") || "");
    }
  }, [existingContract, mode, form]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema> & { content: string }) => {
      if (mode === "edit" && contractId) {
        return await apiRequest("PATCH", `/api/contracts/${contractId}`, data);
      } else {
        return await apiRequest("POST", "/api/contracts", data);
      }
    },
    onSuccess: (savedContract) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts", contractId] });
      if (orgId) {
        queryClient.invalidateQueries({ queryKey: ["/api/contracts/org", orgId] });
      }
      toast({
        title: "Success",
        description: `Contract ${mode === "edit" ? "updated" : "created"} successfully`,
      });
      if (onSave) {
        onSave(savedContract);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    // Parse tags from comma-separated string
    const parsedTags = tags
      .split(",")
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    saveMutation.mutate({
      ...data,
      tags: parsedTags,
      content: content,
    });
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template && template.content) {
      setContent(template.content);
      toast({
        title: "Template Loaded",
        description: `Loaded "${template.name}" template`,
      });
    }
  };

  const handleInsertClause = (clause: Clause) => {
    const clauseHtml = `<h3>${clause.name}</h3><p>${clause.content}</p><br/>`;
    setContent(content + clauseHtml);
    toast({
      title: "Clause Inserted",
      description: `Added "${clause.name}" to contract`,
    });
  };

  const addParty = () => {
    setParties([...parties, { partyType: "person", role: "client" }]);
  };

  const removeParty = (index: number) => {
    setParties(parties.filter((_, i) => i !== index));
  };

  const updateParty = (index: number, field: keyof Party, value: any) => {
    const updated = [...parties];
    updated[index] = { ...updated[index], [field]: value };
    setParties(updated);
  };

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ indent: "-1" }, { indent: "+1" }],
      ["link"],
      ["clean"],
    ],
  };

  if (loadingContract && mode === "edit") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <i className="fas fa-spinner fa-spin text-2xl text-muted-foreground"></i>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-editor-title">
                {mode === "edit" ? "Edit Contract" : "Create New Contract"}
              </h1>
              <p className="text-muted-foreground">
                {mode === "edit" ? "Update contract details and content" : "Fill in contract details and content"}
              </p>
            </div>
            <div className="flex gap-2">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  data-testid="button-cancel"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={saveMutation.isPending}
                data-testid="button-save"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveMutation.isPending ? "Saving..." : "Save Contract"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content Area - Left Side */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <Card data-testid="card-basic-info">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contract Name *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Software License Agreement with Acme Corp" 
                            {...field} 
                            data-testid="input-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contractType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contract Type *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-contract-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CONTRACT_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-status">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CONTRACT_STATUSES.map((status) => (
                                <SelectItem key={status.value} value={status.value}>
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Brief description of the contract..." 
                            rows={3}
                            {...field} 
                            data-testid="textarea-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Financial Information */}
              <Card data-testid="card-financial">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Financial Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name="contractValue"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contract Value</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                step="0.01"
                                placeholder="0.00" 
                                {...field}
                                onChange={(e) => field.onChange(e.target.value)}
                                data-testid="input-contract-value"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-currency">
                                <SelectValue placeholder="Currency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="USD">USD</SelectItem>
                              <SelectItem value="CAD">CAD</SelectItem>
                              <SelectItem value="EUR">EUR</SelectItem>
                              <SelectItem value="GBP">GBP</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Dates */}
              <Card data-testid="card-dates">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5" />
                    Important Dates
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="effectiveDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Effective Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                  data-testid="button-effective-date"
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="expirationDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Expiration Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                  data-testid="button-expiration-date"
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="renewalDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Renewal Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                  data-testid="button-renewal-date"
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Advanced Fields - Collapsible */}
              <Collapsible open={showAdvancedFields} onOpenChange={setShowAdvancedFields}>
                <Card>
                  <CardHeader>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-0" data-testid="button-toggle-advanced">
                        <CardTitle className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5" />
                          Advanced Settings
                        </CardTitle>
                        {showAdvancedFields ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="autoRenewal"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Auto-Renewal</FormLabel>
                                <FormDescription>
                                  Contract renews automatically
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="switch-auto-renewal"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="riskLevel"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Risk Level</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-risk-level">
                                    <SelectValue placeholder="Select risk level" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {RISK_LEVELS.map((level) => (
                                    <SelectItem key={level.value} value={level.value}>
                                      {level.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="renewalNoticeDays"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Renewal Notice (Days)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number"
                                  placeholder="30" 
                                  {...field}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                  data-testid="input-renewal-notice-days"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="terminationNoticeDays"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Termination Notice (Days)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number"
                                  placeholder="e.g., 60" 
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                  data-testid="input-termination-notice-days"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="governingLaw"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Governing Law</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g., Province of Ontario, Canada" 
                                {...field} 
                                data-testid="input-governing-law"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormItem>
                        <FormLabel>Tags</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., confidential, recurring, high-priority (comma-separated)"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            data-testid="input-tags"
                          />
                        </FormControl>
                        <FormDescription>
                          Separate tags with commas
                        </FormDescription>
                      </FormItem>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Contract Content Editor */}
              <Card data-testid="card-content-editor">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Contract Content
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowClauseLibrary(!showClauseLibrary)}
                      data-testid="button-toggle-clause-library"
                    >
                      <List className="w-4 h-4 mr-2" />
                      {showClauseLibrary ? "Hide" : "Show"} Clause Library
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Write or edit the contract content. Insert clauses from the library as needed.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ReactQuill
                    theme="snow"
                    value={content}
                    onChange={setContent}
                    modules={quillModules}
                    className="min-h-[400px]"
                    placeholder="Start writing the contract content here..."
                  />
                </CardContent>
              </Card>

              {/* Parties Section - Collapsible */}
              <Collapsible open={showPartiesSection} onOpenChange={setShowPartiesSection}>
                <Card>
                  <CardHeader>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-0" data-testid="button-toggle-parties">
                        <CardTitle className="flex items-center gap-2">
                          <Users className="w-5 h-5" />
                          Contract Parties ({parties.length})
                        </CardTitle>
                        {showPartiesSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="space-y-4">
                      {parties.map((party, index) => (
                        <Card key={index} className="p-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium">Party Type</label>
                              <Select 
                                value={party.partyType} 
                                onValueChange={(value) => updateParty(index, "partyType", value)}
                              >
                                <SelectTrigger data-testid={`select-party-type-${index}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="person">Person</SelectItem>
                                  <SelectItem value="organization">Organization</SelectItem>
                                  <SelectItem value="external">External Party</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <label className="text-sm font-medium">Role</label>
                              <Select 
                                value={party.role} 
                                onValueChange={(value) => updateParty(index, "role", value)}
                              >
                                <SelectTrigger data-testid={`select-party-role-${index}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {PARTY_ROLES.map((role) => (
                                    <SelectItem key={role.value} value={role.value}>
                                      {role.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {party.partyType === "person" && (
                              <div className="col-span-2">
                                <label className="text-sm font-medium">Select Person</label>
                                <Select 
                                  value={party.personId} 
                                  onValueChange={(value) => updateParty(index, "personId", value)}
                                >
                                  <SelectTrigger data-testid={`select-person-${index}`}>
                                    <SelectValue placeholder="Select person" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {people.map((person) => (
                                      <SelectItem key={person.id} value={person.id}>
                                        {person.firstName} {person.lastName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            {party.partyType === "external" && (
                              <div className="col-span-2">
                                <label className="text-sm font-medium">External Party Name</label>
                                <Input
                                  value={party.externalPartyName || ""}
                                  onChange={(e) => updateParty(index, "externalPartyName", e.target.value)}
                                  placeholder="Enter party name"
                                  data-testid={`input-external-party-${index}`}
                                />
                              </div>
                            )}

                            <div className="col-span-2 flex justify-end">
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => removeParty(index)}
                                data-testid={`button-remove-party-${index}`}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Remove Party
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}

                      <Button
                        type="button"
                        variant="outline"
                        onClick={addParty}
                        className="w-full"
                        data-testid="button-add-party"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Party
                      </Button>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </div>

            {/* Right Sidebar - Templates & Clause Library */}
            <div className="space-y-6">
              {/* Template Selection */}
              <Card data-testid="card-templates">
                <CardHeader>
                  <CardTitle>Templates</CardTitle>
                  <CardDescription>Load a template to start</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingTemplates ? (
                    <p className="text-sm text-muted-foreground">Loading templates...</p>
                  ) : (
                    <Select onValueChange={handleTemplateSelect}>
                      <SelectTrigger data-testid="select-template">
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </CardContent>
              </Card>

              {/* Clause Library */}
              {showClauseLibrary && (
                <Card data-testid="card-clause-library">
                  <CardHeader>
                    <CardTitle>Clause Library</CardTitle>
                    <CardDescription>Insert standard clauses</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Select value={selectedClauseCategory} onValueChange={setSelectedClauseCategory}>
                      <SelectTrigger data-testid="select-clause-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CLAUSE_CATEGORIES.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <ScrollArea className="h-[500px] pr-4">
                      {loadingClauses ? (
                        <p className="text-sm text-muted-foreground">Loading clauses...</p>
                      ) : filteredClauses.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No clauses available</p>
                      ) : (
                        <div className="space-y-3">
                          {filteredClauses.map((clause) => (
                            <Card key={clause.id} className="p-3 hover:bg-accent cursor-pointer transition-colors">
                              <div className="space-y-2">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h4 className="font-medium text-sm">{clause.name}</h4>
                                    {clause.description && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {clause.description}
                                      </p>
                                    )}
                                    <div className="flex gap-2 mt-2">
                                      <Badge variant="outline" className="text-xs">
                                        {clause.category}
                                      </Badge>
                                      {clause.isStandard && (
                                        <Badge variant="secondary" className="text-xs">
                                          Standard
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => handleInsertClause(clause)}
                                  data-testid={`button-insert-clause-${clause.id}`}
                                >
                                  <Plus className="w-3 h-3 mr-2" />
                                  Insert Clause
                                </Button>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
