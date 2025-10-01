import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEntityContext } from "@/hooks/useEntityContext";
import { PDFIngestion } from "@/components/PDFIngestion";
import { ExtractionResultsModal } from "@/components/ExtractionResultsModal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { EntityRelationships } from "@/components/EntityRelationships";
import { Upload, MessageSquarePlus, ChevronDown, ChevronUp, FileText, Calendar, DollarSign, AlertTriangle, TrendingUp } from "lucide-react";
import { differenceInDays } from "date-fns";
import type { Org, OrgNote } from "@shared/schema";

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
};

const CONTRACT_TYPES = [
  { value: "vendor", label: "Vendor Agreement" },
  { value: "customer", label: "Customer Agreement" },
  { value: "employment", label: "Employment Contract" },
  { value: "nda", label: "Non-Disclosure Agreement" },
  { value: "license", label: "License Agreement" },
  { value: "other", label: "Other" },
];

function EntityContractsSection({ orgId }: { orgId: string }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch contracts for this entity
  const { data: contracts = [], isLoading } = useQuery<Contract[]>({
    queryKey: ["/api/contracts/org", orgId],
    enabled: !!orgId,
  });

  // Calculate per-currency totals
  const currencyTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    
    contracts.forEach(contract => {
      if (contract.contractValue) {
        const value = parseFloat(contract.contractValue);
        const currency = contract.currency || 'Unknown';
        totals[currency] = (totals[currency] || 0) + value;
      }
    });
    
    return totals;
  }, [contracts]);

  // Check if mixed currencies
  const currencies = Object.keys(currencyTotals);
  const hasMixedCurrencies = currencies.length > 1;

  // Calculate statistics
  const stats = useMemo(() => {
    const total = contracts.length;
    const active = contracts.filter(c => c.status === 'active').length;
    
    // Expiring soon (within 30 days)
    const expiringSoon = contracts.filter(c => {
      if (!c.expirationDate || c.status !== 'active') return false;
      const expDate = typeof c.expirationDate === 'string' ? new Date(c.expirationDate) : c.expirationDate;
      const daysUntil = differenceInDays(expDate, new Date());
      return daysUntil >= 0 && daysUntil <= 30;
    }).length;
    
    return { total, active, expiringSoon };
  }, [contracts]);

  const deleteMutation = useMutation({
    mutationFn: async (contractId: string) => {
      return await apiRequest("DELETE", `/api/contracts/${contractId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts/org", orgId] });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
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
    const daysUntilExpiration = differenceInDays(expDate, new Date());
    
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

  const formatCurrency = (value: number, currency: string = "USD") => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleViewContract = (contractId: string) => {
    setLocation(`/contracts/${contractId}`);
  };

  const handleCreateContract = () => {
    setLocation(`/contracts/new?orgId=${orgId}`);
  };

  const handleDeleteContract = (contractId: string, contractName: string) => {
    if (confirm(`Are you sure you want to delete "${contractName}"? This action cannot be undone.`)) {
      deleteMutation.mutate(contractId);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Contracts</CardTitle>
            <CardDescription>
              Manage contracts and agreements for this entity
            </CardDescription>
          </div>
          <Button onClick={handleCreateContract} data-testid="button-create-contract-entity">
            <FileText className="w-4 h-4 mr-2" />
            Create Contract
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Total Contracts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-2xl font-bold" data-testid="text-total-contracts">{stats.total}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Active</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-2xl font-bold" data-testid="text-active-contracts">{stats.active}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Expiring Soon</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertTriangle className={`w-4 h-4 ${stats.expiringSoon > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
                <span className="text-2xl font-bold" data-testid="text-expiring-contracts">{stats.expiringSoon}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {hasMixedCurrencies ? (
                <div className="space-y-1" data-testid="text-total-value">
                  <div className="text-xs text-muted-foreground">Multi-currency:</div>
                  {currencies.map(currency => (
                    <div key={currency} className="text-sm font-medium">
                      {currency === 'Unknown' 
                        ? `${currencyTotals[currency].toFixed(2)} (Currency not set)`
                        : formatCurrency(currencyTotals[currency], currency)
                      }
                    </div>
                  ))}
                </div>
              ) : currencies.length === 1 ? (
                <div className="text-2xl font-bold" data-testid="text-total-value">
                  {currencies[0] === 'Unknown'
                    ? `${currencyTotals['Unknown'].toFixed(2)} (Unknown)`
                    : formatCurrency(currencyTotals[currencies[0]], currencies[0])
                  }
                </div>
              ) : (
                <div className="text-2xl font-bold" data-testid="text-total-value">-</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Contracts List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <i className="fas fa-spinner fa-spin text-2xl text-muted-foreground"></i>
          </div>
        ) : contracts.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-muted/20">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="text-base mb-2" data-testid="text-no-contracts">No contracts yet</CardTitle>
            <CardDescription className="mb-4">
              Create your first contract for this entity
            </CardDescription>
            <Button onClick={handleCreateContract} data-testid="button-create-first-contract">
              <FileText className="w-4 h-4 mr-2" />
              Create Contract
            </Button>
          </div>
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
                  {contracts.map((contract) => (
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
                        {contract.contractValue ? (
                          contract.currency ? (
                            formatCurrency(parseFloat(contract.contractValue), contract.currency)
                          ) : (
                            <span className="text-muted-foreground">
                              {parseFloat(contract.contractValue).toFixed(2)} (Unknown)
                            </span>
                          )
                        ) : '-'}
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
              {contracts.map((contract) => (
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
                          {contract.currency ? (
                            <>
                              <DollarSign className="w-3 h-3 mr-1" />
                              {formatCurrency(parseFloat(contract.contractValue), contract.currency)}
                            </>
                          ) : (
                            <span className="text-muted-foreground">
                              {parseFloat(contract.contractValue).toFixed(2)} (Unknown)
                            </span>
                          )}
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
      </CardContent>
    </Card>
  );
}

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

        {/* Entity Relationships */}
        <EntityRelationships 
          orgId={entity.id}
          orgName={entity.name}
        />

        {/* Contracts Section */}
        <EntityContractsSection orgId={entity.id} />

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