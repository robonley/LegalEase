import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEntityContext } from "@/hooks/useEntityContext";
import { insertContractSchema } from "@shared/schema";
import { Search, Filter, FileText, Calendar, DollarSign, AlertTriangle } from "lucide-react";
import { formatDistanceToNow, isPast, differenceInDays } from "date-fns";

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
  createdAt?: string | Date;
  updatedAt?: string | Date;
  org?: {
    id: string;
    name: string;
  };
};

const formSchema = insertContractSchema.extend({
  name: z.string().min(1, "Contract name is required"),
  contractType: z.string().min(1, "Contract type is required"),
  orgId: z.string().min(1, "Organization is required"),
});

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

export default function Contracts() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const { currentEntity } = useEntityContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Fetch all contracts
  const { data: allContracts = [], isLoading } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });

  // Fetch entity-specific contracts if an entity is selected
  const { data: entityContracts = [], isLoading: loadingEntityContracts } = useQuery<Contract[]>({
    queryKey: ["/api/contracts/org", currentEntity?.id],
    enabled: !!currentEntity?.id,
  });

  // Use entity contracts if available, otherwise all contracts
  const contracts = currentEntity ? entityContracts : allContracts;
  const loading = currentEntity ? loadingEntityContracts : isLoading;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      contractType: "vendor",
      status: "draft",
      description: "",
      contractValue: undefined,
      currency: "USD",
      orgId: currentEntity?.id || "",
    },
  });

  // Update orgId when currentEntity changes
  useEffect(() => {
    if (currentEntity?.id) {
      form.setValue('orgId', currentEntity.id);
    } else {
      form.setValue('orgId', '');
    }
  }, [currentEntity, form]);

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      return await apiRequest("POST", "/api/contracts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      if (currentEntity?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/contracts/org", currentEntity.id] });
      }
      setShowCreateDialog(false);
      form.reset();
      toast({
        title: "Success",
        description: "Contract created successfully",
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

  const deleteMutation = useMutation({
    mutationFn: async (contractId: string) => {
      return await apiRequest("DELETE", `/api/contracts/${contractId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      if (currentEntity?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/contracts/org", currentEntity.id] });
      }
      toast({
        title: "Success",
        description: "Contract deleted successfully",
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

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createMutation.mutate(data);
  };

  // Filter and search contracts
  const filteredContracts = useMemo(() => {
    return contracts.filter((contract) => {
      const matchesSearch = 
        contract.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contract.description && contract.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = filterStatus === "all" || contract.status === filterStatus;
      const matchesType = filterType === "all" || contract.contractType === filterType;
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [contracts, searchTerm, filterStatus, filterType]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", color: string }> = {
      draft: { variant: "secondary", color: "bg-yellow-500" },
      active: { variant: "default", color: "bg-green-500" },
      expired: { variant: "destructive", color: "bg-red-500" },
      terminated: { variant: "outline", color: "bg-gray-500" },
      pending_signature: { variant: "secondary", color: "bg-blue-500" },
    };
    
    const config = statusMap[status] || statusMap.draft;
    
    return (
      <Badge variant={config.variant} data-testid={`status-${status}`}>
        <span className={`w-2 h-2 rounded-full ${config.color} mr-1.5`}></span>
        {status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  const getExpirationWarning = (expirationDate: string | Date | undefined) => {
    if (!expirationDate) return null;
    
    const expDate = typeof expirationDate === 'string' ? new Date(expirationDate) : expirationDate;
    const today = new Date();
    const daysUntilExpiration = differenceInDays(expDate, today);
    
    if (daysUntilExpiration < 0) {
      return (
        <Badge variant="destructive" className="ml-2" data-testid="badge-expired">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Expired
        </Badge>
      );
    }
    
    if (daysUntilExpiration <= 30) {
      return (
        <Badge variant="secondary" className="ml-2 bg-orange-500 text-white" data-testid="badge-expiring-soon">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Expires in {daysUntilExpiration} days
        </Badge>
      );
    }
    
    return null;
  };

  const formatDate = (date: string | Date | undefined | null) => {
    if (!date) return "N/A";
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (value: string | number | undefined, currency: string = "USD") => {
    if (!value) return "N/A";
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(numValue);
  };

  const handleViewContract = (contractId: string) => {
    setLocation(`/contracts/${contractId}`);
  };

  const handleDeleteContract = async (contractId: string, contractName: string) => {
    if (confirm(`Are you sure you want to delete "${contractName}"? This action cannot be undone.`)) {
      deleteMutation.mutate(contractId);
    }
  };

  if (!currentEntity && loading) {
    return (
      <div className="flex-1 overflow-auto">
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-40" />
          </div>
        </header>
        <div className="p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="page-title">Contracts</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {currentEntity 
                ? `Manage contracts for ${currentEntity.name}`
                : "Manage all contracts across entities"}
            </p>
          </div>
          <Button 
            onClick={() => setLocation('/contracts/new')}
            data-testid="button-create-contract"
          >
            <FileText className="w-4 h-4 mr-2" />
            Create Contract
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search contracts by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-filter-status">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {CONTRACT_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-filter-type">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {CONTRACT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : filteredContracts.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <CardTitle className="mb-2" data-testid="text-empty-state">
                {searchTerm || filterStatus !== "all" || filterType !== "all" 
                  ? "No contracts found" 
                  : "No contracts yet"}
              </CardTitle>
              <CardDescription>
                {searchTerm || filterStatus !== "all" || filterType !== "all"
                  ? "Try adjusting your search or filters"
                  : "Get started by creating your first contract"}
              </CardDescription>
              {!searchTerm && filterStatus === "all" && filterType === "all" && (
                <Button 
                  className="mt-4" 
                  onClick={() => setShowCreateDialog(true)}
                  data-testid="button-create-first-contract"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Create Contract
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contract Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Effective Date</TableHead>
                    <TableHead>Expiration Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContracts.map((contract) => (
                    <TableRow 
                      key={contract.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewContract(contract.id)}
                      data-testid={`row-contract-${contract.id}`}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <FileText className="w-4 h-4 mr-2 text-muted-foreground" />
                          <div>
                            <div data-testid={`text-contract-name-${contract.id}`}>{contract.name}</div>
                            {contract.description && (
                              <div className="text-xs text-muted-foreground">{contract.description}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-contract-type-${contract.id}`}>
                        {CONTRACT_TYPES.find(t => t.value === contract.contractType)?.label || contract.contractType}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {getStatusBadge(contract.status)}
                          {getExpirationWarning(contract.expirationDate)}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-contract-value-${contract.id}`}>
                        {formatCurrency(contract.contractValue, contract.currency)}
                      </TableCell>
                      <TableCell data-testid={`text-effective-date-${contract.id}`}>
                        <div className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1 text-muted-foreground" />
                          {formatDate(contract.effectiveDate)}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-expiration-date-${contract.id}`}>
                        <div className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1 text-muted-foreground" />
                          {formatDate(contract.expirationDate)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteContract(contract.id, contract.name);
                          }}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-${contract.id}`}
                        >
                          <i className="fas fa-trash text-destructive"></i>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {filteredContracts.map((contract) => (
                <Card 
                  key={contract.id} 
                  className="cursor-pointer hover:border-primary"
                  onClick={() => handleViewContract(contract.id)}
                  data-testid={`card-contract-${contract.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base" data-testid={`text-contract-name-${contract.id}`}>
                          {contract.name}
                        </CardTitle>
                        {contract.description && (
                          <CardDescription className="mt-1">{contract.description}</CardDescription>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteContract(contract.id, contract.name);
                        }}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-${contract.id}`}
                      >
                        <i className="fas fa-trash text-destructive"></i>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Type:</span>
                      <span className="text-sm font-medium" data-testid={`text-contract-type-${contract.id}`}>
                        {CONTRACT_TYPES.find(t => t.value === contract.contractType)?.label || contract.contractType}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(contract.status)}
                        {getExpirationWarning(contract.expirationDate)}
                      </div>
                    </div>
                    {contract.contractValue && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Value:</span>
                        <span className="text-sm font-medium flex items-center" data-testid={`text-contract-value-${contract.id}`}>
                          <DollarSign className="w-3 h-3 mr-1" />
                          {formatCurrency(contract.contractValue, contract.currency)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Effective:</span>
                      <span className="text-sm flex items-center" data-testid={`text-effective-date-${contract.id}`}>
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(contract.effectiveDate)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Expires:</span>
                      <span className="text-sm flex items-center" data-testid={`text-expiration-date-${contract.id}`}>
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(contract.expirationDate)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
