import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AlertTriangle, ArrowLeft, Edit, Trash2, FileText, Calendar, DollarSign, Users, CheckCircle } from "lucide-react";
import { differenceInDays } from "date-fns";

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
  complianceStatus?: string;
  aiSummary?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  org?: {
    id: string;
    name: string;
  };
};

type ContractParty = {
  id: string;
  contractId: string;
  partyType: string;
  personId?: string;
  orgId?: string;
  externalPartyName?: string;
  role: string;
  signatureStatus?: string;
  signedAt?: string | Date;
  person?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  org?: {
    id: string;
    name: string;
  };
};

type ContractObligation = {
  id: string;
  contractId: string;
  title: string;
  description?: string;
  obligationType: string;
  dueDate?: string | Date;
  completedAt?: string | Date;
  status?: string;
  priority?: string;
};

type ContractVersion = {
  id: string;
  contractId: string;
  versionNumber: number;
  changesSummary?: string;
  isCurrent: boolean;
  createdAt: string | Date;
};

export default function ContractDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contract, isLoading } = useQuery<Contract>({
    queryKey: ["/api/contracts", id],
    enabled: !!id,
  });

  const { data: parties = [] } = useQuery<ContractParty[]>({
    queryKey: ["/api/contracts", id, "parties"],
    enabled: !!id,
  });

  const { data: obligations = [] } = useQuery<ContractObligation[]>({
    queryKey: ["/api/contracts", id, "obligations"],
    enabled: !!id,
  });

  const { data: versions = [] } = useQuery<ContractVersion[]>({
    queryKey: ["/api/contracts", id, "versions"],
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/contracts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      toast({
        title: "Success",
        description: "Contract deleted successfully",
      });
      setLocation("/contracts");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete "${contract?.name}"? This action cannot be undone.`)) {
      deleteMutation.mutate();
    }
  };

  const getContractTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      vendor: "Vendor Agreement",
      customer: "Customer Agreement",
      employment: "Employment Contract",
      nda: "Non-Disclosure Agreement",
      license: "License Agreement",
      other: "Other",
    };
    return typeMap[type] || type;
  };

  const getPriorityBadge = (priority: string = "medium") => {
    const priorityMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" }> = {
      low: { variant: "secondary" },
      medium: { variant: "outline" },
      high: { variant: "default" },
      critical: { variant: "destructive" },
    };
    
    const config = priorityMap[priority] || priorityMap.medium;
    
    return (
      <Badge variant={config.variant}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    );
  };

  const getObligationStatusBadge = (status: string = "pending") => {
    const statusMap: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { variant: "secondary" },
      completed: { variant: "default" },
      overdue: { variant: "destructive" },
      waived: { variant: "outline" },
    };
    
    const config = statusMap[status] || statusMap.pending;
    
    return (
      <Badge variant={config.variant}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
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

  if (!contract) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <Card>
            <CardContent className="p-12 text-center">
              <i className="fas fa-exclamation-triangle text-4xl text-muted-foreground mb-4"></i>
              <CardTitle className="mb-2">Contract not found</CardTitle>
              <CardDescription className="mb-4">
                The requested contract could not be found.
              </CardDescription>
              <Button onClick={() => setLocation('/contracts')} data-testid="button-back-to-contracts">
                Back to Contracts
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
        <div className="mb-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/contracts" data-testid="breadcrumb-contracts">Contracts</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage data-testid="breadcrumb-current">{contract.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation('/contracts')}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-semibold" data-testid="contract-name">{contract.name}</h1>
              <p className="text-xs text-muted-foreground">
                {getContractTypeLabel(contract.contractType)} • {contract.org?.name || 'Unknown Organization'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-delete"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button
              onClick={() => setLocation(`/contracts/${id}/edit`)}
              data-testid="button-edit"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Contract Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Contract Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Contract Name</label>
                <p className="text-sm font-medium mt-1" data-testid="detail-name">{contract.name}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Contract Type</label>
                <p className="text-sm font-medium mt-1" data-testid="detail-type">{getContractTypeLabel(contract.contractType)}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <div className="mt-1" data-testid="detail-status">
                  {getStatusBadge(contract.status)}
                  {getExpirationWarning(contract.expirationDate)}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Contract Value</label>
                <p className="text-sm font-medium mt-1" data-testid="detail-value">
                  {formatCurrency(contract.contractValue, contract.currency)}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Effective Date</label>
                <p className="text-sm font-medium mt-1" data-testid="detail-effective-date">
                  {formatDate(contract.effectiveDate)}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Expiration Date</label>
                <p className="text-sm font-medium mt-1" data-testid="detail-expiration-date">
                  {formatDate(contract.expirationDate)}
                </p>
              </div>
              {contract.renewalDate && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Renewal Date</label>
                  <p className="text-sm font-medium mt-1" data-testid="detail-renewal-date">
                    {formatDate(contract.renewalDate)}
                  </p>
                </div>
              )}
              {contract.autoRenewal !== undefined && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Auto Renewal</label>
                  <p className="text-sm font-medium mt-1" data-testid="detail-auto-renewal">
                    {contract.autoRenewal ? "Yes" : "No"}
                  </p>
                </div>
              )}
              {contract.governingLaw && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Governing Law</label>
                  <p className="text-sm font-medium mt-1" data-testid="detail-governing-law">{contract.governingLaw}</p>
                </div>
              )}
              {contract.riskLevel && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Risk Level</label>
                  <p className="text-sm font-medium mt-1" data-testid="detail-risk-level">
                    {contract.riskLevel.charAt(0).toUpperCase() + contract.riskLevel.slice(1)}
                  </p>
                </div>
              )}
              {contract.complianceStatus && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Compliance Status</label>
                  <p className="text-sm font-medium mt-1" data-testid="detail-compliance-status">
                    {contract.complianceStatus.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                </div>
              )}
            </div>

            {contract.description && (
              <>
                <Separator className="my-4" />
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Description</label>
                  <p className="text-sm mt-1" data-testid="detail-description">{contract.description}</p>
                </div>
              </>
            )}

            {contract.aiSummary && (
              <>
                <Separator className="my-4" />
                <div>
                  <label className="text-xs font-medium text-muted-foreground">AI Summary</label>
                  <p className="text-sm mt-1 text-muted-foreground" data-testid="detail-ai-summary">{contract.aiSummary}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Contract Parties */}
        {parties.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Contract Parties
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Party Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Signature Status</TableHead>
                    <TableHead>Signed At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parties.map((party) => (
                    <TableRow key={party.id} data-testid={`party-${party.id}`}>
                      <TableCell className="font-medium">
                        {party.partyType === 'person' && party.person
                          ? `${party.person.firstName} ${party.person.lastName}`
                          : party.partyType === 'organization' && party.org
                          ? party.org.name
                          : party.externalPartyName || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        {party.role.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                      </TableCell>
                      <TableCell>
                        <Badge variant={party.signatureStatus === 'signed' ? 'default' : 'secondary'}>
                          {party.signatureStatus?.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()) || 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(party.signedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Contract Obligations */}
        {obligations.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Obligations
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {obligations.map((obligation) => (
                    <TableRow key={obligation.id} data-testid={`obligation-${obligation.id}`}>
                      <TableCell className="font-medium">
                        {obligation.title}
                        {obligation.description && (
                          <p className="text-xs text-muted-foreground mt-1">{obligation.description}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {obligation.obligationType.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                      </TableCell>
                      <TableCell>{formatDate(obligation.dueDate)}</TableCell>
                      <TableCell>{getPriorityBadge(obligation.priority)}</TableCell>
                      <TableCell>{getObligationStatusBadge(obligation.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Contract Versions */}
        {versions.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Version History
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Changes Summary</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versions.map((version) => (
                    <TableRow key={version.id} data-testid={`version-${version.id}`}>
                      <TableCell className="font-medium">v{version.versionNumber}</TableCell>
                      <TableCell>{version.changesSummary || 'No summary provided'}</TableCell>
                      <TableCell>{formatDate(version.createdAt)}</TableCell>
                      <TableCell>
                        {version.isCurrent && (
                          <Badge variant="default">Current</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
