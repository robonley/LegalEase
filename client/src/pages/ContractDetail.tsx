import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AlertTriangle, ArrowLeft, Edit, Trash2, FileText, Calendar, DollarSign, Users, CheckCircle, GitCompare, History, RotateCcw, Plus, Eye, Send, Bell } from "lucide-react";
import { differenceInDays } from "date-fns";
import VersionCompare from "@/components/VersionCompare";

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
  content?: string;
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
  content: string;
  changesSummary?: string;
  isCurrent: boolean;
  createdAt: string | Date;
  createdBy?: string;
  creator?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
};

type AuditLog = {
  id: string;
  orgId?: string;
  actorId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  payload: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string | Date;
  actor?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
};

export default function ContractDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Version control state
  const [showCompare, setShowCompare] = useState(false);
  const [compareVersions, setCompareVersions] = useState<{ left: ContractVersion | null; right: ContractVersion | null }>({ left: null, right: null });
  const [showCreateVersion, setShowCreateVersion] = useState(false);
  const [newVersionSummary, setNewVersionSummary] = useState("");
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [restoreVersion, setRestoreVersion] = useState<ContractVersion | null>(null);

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

  const { data: auditLogs = [] } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit-logs/filter"],
    queryFn: async () => {
      const response = await fetch(`/api/audit-logs/filter?entityId=${id}&entityType=contract`);
      if (!response.ok) throw new Error("Failed to fetch audit logs");
      return response.json();
    },
    enabled: !!id,
  });

  const { data: docusignStatus } = useQuery<{ configured: boolean; message?: string }>({
    queryKey: ["/api/integrations/docusign/status"],
  });

  const createVersionMutation = useMutation({
    mutationFn: async (data: { content: string; changesSummary: string }) => {
      if (!contract) throw new Error("Contract not found");
      
      // Build full snapshot including all contract metadata, parties, and obligations
      const snapshot = {
        name: contract.name,
        contractType: contract.contractType,
        status: contract.status,
        description: contract.description,
        contractValue: contract.contractValue,
        currency: contract.currency,
        effectiveDate: contract.effectiveDate,
        expirationDate: contract.expirationDate,
        renewalDate: contract.renewalDate,
        autoRenewal: contract.autoRenewal,
        renewalNoticeDays: contract.renewalNoticeDays,
        terminationNoticeDays: contract.terminationNoticeDays,
        governingLaw: contract.governingLaw,
        riskLevel: contract.riskLevel,
        complianceStatus: contract.complianceStatus,
        aiSummary: contract.aiSummary,
        parties: parties,
        obligations: obligations,
      };
      
      return await apiRequest("POST", `/api/contracts/${id}/versions`, {
        ...data,
        snapshot,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts", id, "versions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/audit-logs/filter"] });
      toast({
        title: "Success",
        description: "New version created successfully",
      });
      setShowCreateVersion(false);
      setNewVersionSummary("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const restoreVersionMutation = useMutation({
    mutationFn: async (version: ContractVersion & { snapshot?: any }) => {
      if (!version.snapshot) {
        // Backward compatibility: if no snapshot, just restore content
        return await apiRequest("PATCH", `/api/contracts/${id}`, {
          content: version.content,
        });
      }
      
      // Restore full state from snapshot
      const snapshot = version.snapshot;
      const restoreData: any = {
        content: version.content,
        name: snapshot.name,
        contractType: snapshot.contractType,
        status: snapshot.status,
        description: snapshot.description,
        contractValue: snapshot.contractValue,
        currency: snapshot.currency,
        effectiveDate: snapshot.effectiveDate,
        expirationDate: snapshot.expirationDate,
        renewalDate: snapshot.renewalDate,
        autoRenewal: snapshot.autoRenewal,
        renewalNoticeDays: snapshot.renewalNoticeDays,
        terminationNoticeDays: snapshot.terminationNoticeDays,
        governingLaw: snapshot.governingLaw,
        riskLevel: snapshot.riskLevel,
        complianceStatus: snapshot.complianceStatus,
        aiSummary: snapshot.aiSummary,
      };
      
      return await apiRequest("PATCH", `/api/contracts/${id}`, restoreData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts", id, "versions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts", id, "parties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts", id, "obligations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/audit-logs/filter"] });
      toast({
        title: "Success",
        description: "Version restored successfully. All contract fields have been updated.",
      });
      setShowRestoreDialog(false);
      setRestoreVersion(null);
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

  const sendForSignatureMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/contracts/${id}/send-for-signature`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts", id, "parties"] });
      toast({
        title: "Coming Soon",
        description: "DocuSign integration coming soon. This feature is not yet available.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Info",
        description: error.message || "DocuSign integration coming soon",
      });
    },
  });

  const sendReminderMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/contracts/${id}/signature-reminder`);
    },
    onSuccess: () => {
      toast({
        title: "Coming Soon",
        description: "DocuSign integration coming soon. This feature is not yet available.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Info",
        description: error.message || "DocuSign integration coming soon",
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

  const handleCompareVersions = (version: ContractVersion) => {
    const currentVersion = versions.find(v => v.isCurrent);
    if (currentVersion && version.id !== currentVersion.id) {
      setCompareVersions({
        left: version,
        right: currentVersion,
      });
      setShowCompare(true);
    } else {
      toast({
        title: "Cannot Compare",
        description: "Please select a different version to compare with the current version",
        variant: "destructive",
      });
    }
  };

  const handleCreateVersion = () => {
    if (!contract?.content) {
      toast({
        title: "Cannot Create Version",
        description: "No content available to create a version",
        variant: "destructive",
      });
      return;
    }
    setShowCreateVersion(true);
  };

  const handleSubmitNewVersion = () => {
    if (!newVersionSummary.trim()) {
      toast({
        title: "Summary Required",
        description: "Please provide a summary of changes",
        variant: "destructive",
      });
      return;
    }
    if (!contract?.content) {
      toast({
        title: "No Content",
        description: "No content available to create a version",
        variant: "destructive",
      });
      return;
    }
    createVersionMutation.mutate({
      content: contract.content,
      changesSummary: newVersionSummary,
    });
  };

  const handleRestoreVersion = (version: ContractVersion) => {
    setRestoreVersion(version);
    setShowRestoreDialog(true);
  };

  const confirmRestore = () => {
    if (restoreVersion) {
      restoreVersionMutation.mutate(restoreVersion);
    }
  };

  const getActionLabel = (action: string) => {
    const actionMap: Record<string, string> = {
      CREATE_CONTRACT: "Contract Created",
      UPDATE_CONTRACT: "Contract Updated",
      DELETE_CONTRACT: "Contract Deleted",
      CREATE_CONTRACT_VERSION: "Version Created",
      ADD_CONTRACT_PARTY: "Party Added",
      ADD_CONTRACT_OBLIGATION: "Obligation Added",
      UPDATE_CONTRACT_PARTY: "Party Updated",
      UPDATE_CONTRACT_OBLIGATION: "Obligation Updated",
    };
    return actionMap[action] || action;
  };

  const formatDateTime = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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

        {/* Signature Workflow Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2" data-testid="signature-section-title">
              <Send className="h-5 w-5" />
              Signature Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Current Status</p>
                <div data-testid="contract-signature-status">
                  {getStatusBadge(contract.status)}
                </div>
              </div>
            </div>

            {contract.status === 'pending_signature' ? (
              <div className="space-y-4">
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-3" data-testid="signers-heading">Signers:</h4>
                  <div className="space-y-2">
                    {parties.map((party) => (
                      <div key={party.id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`signer-${party.id}`}>
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {party.partyType === 'person' && party.person
                              ? `${party.person.firstName} ${party.person.lastName}`
                              : party.partyType === 'organization' && party.org
                              ? party.org.name
                              : party.externalPartyName || 'Unknown'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {party.role.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={party.signatureStatus === 'signed' ? 'default' : 'secondary'} data-testid={`signer-status-${party.id}`}>
                            {party.signatureStatus?.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()) || 'Pending'}
                          </Badge>
                          {party.signedAt && (
                            <p className="text-xs text-muted-foreground" data-testid={`signed-at-${party.id}`}>
                              Signed: {formatDate(party.signedAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => sendReminderMutation.mutate()}
                  disabled={sendReminderMutation.isPending}
                  data-testid="button-send-reminder"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Send Reminder
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => sendForSignatureMutation.mutate()}
                disabled={!docusignStatus?.configured || sendForSignatureMutation.isPending}
                data-testid="button-send-for-signature"
              >
                <Send className="h-4 w-4 mr-2" />
                Send for Signature
              </Button>
            )}

            <Alert className="mt-4" data-testid="alert-docusign-coming-soon">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                DocuSign integration coming soon. This is a placeholder for the signature workflow feature.
              </AlertDescription>
            </Alert>
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

        {/* Contract Versions & Audit Log */}
        <Tabs defaultValue="versions" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="versions" data-testid="tab-versions">
              <History className="h-4 w-4 mr-2" />
              Version History
            </TabsTrigger>
            <TabsTrigger value="audit" data-testid="tab-audit">
              <FileText className="h-4 w-4 mr-2" />
              Audit Trail
            </TabsTrigger>
          </TabsList>

          <TabsContent value="versions" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Version History
                  </CardTitle>
                  {contract?.content && (
                    <Button
                      onClick={handleCreateVersion}
                      size="sm"
                      data-testid="button-create-version"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Version
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {versions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Version</TableHead>
                        <TableHead>Changes Summary</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
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
                              <Badge variant="default" data-testid={`badge-current-${version.id}`}>Current</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {!version.isCurrent && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCompareVersions(version)}
                                    data-testid={`button-compare-${version.id}`}
                                  >
                                    <GitCompare className="h-4 w-4 mr-1" />
                                    Compare
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRestoreVersion(version)}
                                    data-testid={`button-restore-${version.id}`}
                                  >
                                    <RotateCcw className="h-4 w-4 mr-1" />
                                    Restore
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No version history available</p>
                    <p className="text-sm">Create a version to start tracking changes</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Audit Trail
                </CardTitle>
                <CardDescription>
                  Complete history of all changes to this contract
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {auditLogs.length > 0 ? (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {auditLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex gap-4 pb-4 border-b last:border-0"
                          data-testid={`audit-log-${log.id}`}
                        >
                          <div className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-2"></div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-sm" data-testid={`audit-action-${log.id}`}>
                                  {getActionLabel(log.action)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {log.actor?.firstName && log.actor?.lastName
                                    ? `${log.actor.firstName} ${log.actor.lastName}`
                                    : log.actor?.email || "Unknown User"}
                                </p>
                              </div>
                              <p className="text-xs text-muted-foreground" data-testid={`audit-time-${log.id}`}>
                                {formatDateTime(log.createdAt)}
                              </p>
                            </div>
                            {log.payload && (
                              <p className="text-xs text-muted-foreground">
                                {JSON.stringify(log.payload, null, 2).substring(0, 100)}
                                {JSON.stringify(log.payload).length > 100 && "..."}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No audit trail available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Version Compare Dialog */}
        {compareVersions.left && compareVersions.right && (
          <VersionCompare
            open={showCompare}
            onOpenChange={setShowCompare}
            leftVersion={compareVersions.left}
            rightVersion={compareVersions.right}
            contractName={contract?.name}
          />
        )}

        {/* Create Version Dialog */}
        <Dialog open={showCreateVersion} onOpenChange={setShowCreateVersion}>
          <DialogContent data-testid="dialog-create-version">
            <DialogHeader>
              <DialogTitle>Create New Version</DialogTitle>
              <DialogDescription>
                Create a new version of this contract. Provide a summary of changes.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="version-summary">Change Summary *</Label>
                <Textarea
                  id="version-summary"
                  placeholder="Describe what changed in this version..."
                  value={newVersionSummary}
                  onChange={(e) => setNewVersionSummary(e.target.value)}
                  className="mt-2"
                  rows={4}
                  data-testid="input-version-summary"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateVersion(false)}
                data-testid="button-cancel-version"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitNewVersion}
                disabled={createVersionMutation.isPending}
                data-testid="button-submit-version"
              >
                {createVersionMutation.isPending ? "Creating..." : "Create Version"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Restore Version Dialog */}
        <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
          <DialogContent data-testid="dialog-restore-version">
            <DialogHeader>
              <DialogTitle>Restore Version</DialogTitle>
              <DialogDescription>
                Are you sure you want to restore version {restoreVersion?.versionNumber}? This will create a new version with the content from the selected version.
              </DialogDescription>
            </DialogHeader>
            {restoreVersion && (
              <div className="py-4 space-y-2">
                <div className="text-sm">
                  <span className="font-medium">Version:</span> v{restoreVersion.versionNumber}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Created:</span> {formatDate(restoreVersion.createdAt)}
                </div>
                {restoreVersion.changesSummary && (
                  <div className="text-sm">
                    <span className="font-medium">Summary:</span> {restoreVersion.changesSummary}
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowRestoreDialog(false)}
                data-testid="button-cancel-restore"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmRestore}
                disabled={restoreVersionMutation.isPending}
                data-testid="button-confirm-restore"
              >
                {restoreVersionMutation.isPending ? "Restoring..." : "Restore Version"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
