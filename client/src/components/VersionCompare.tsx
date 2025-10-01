import { useMemo } from "react";
import { diffWords, Change } from "diff";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Calendar, User, Hash, AlertCircle } from "lucide-react";

type ContractVersion = {
  id: string;
  contractId: string;
  versionNumber: number;
  content: string;
  changesSummary?: string;
  snapshot?: any;
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

interface VersionCompareProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leftVersion: ContractVersion;
  rightVersion: ContractVersion;
  contractName?: string;
}

function DiffLine({ change }: { change: Change }) {
  if (change.added) {
    return (
      <span className="bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100">
        {change.value}
      </span>
    );
  }
  if (change.removed) {
    return (
      <span className="bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-100 line-through">
        {change.value}
      </span>
    );
  }
  return <span>{change.value}</span>;
}

export default function VersionCompare({
  open,
  onOpenChange,
  leftVersion,
  rightVersion,
  contractName,
}: VersionCompareProps) {
  const diff = useMemo(() => {
    return diffWords(leftVersion.content || "", rightVersion.content || "");
  }, [leftVersion.content, rightVersion.content]);

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCreatorName = (version: ContractVersion) => {
    if (version.creator) {
      if (version.creator.firstName && version.creator.lastName) {
        return `${version.creator.firstName} ${version.creator.lastName}`;
      }
      if (version.creator.email) {
        return version.creator.email;
      }
    }
    return "Unknown";
  };

  const stats = useMemo(() => {
    let additions = 0;
    let deletions = 0;
    let unchanged = 0;

    diff.forEach(change => {
      const wordCount = change.value.split(/\s+/).filter(w => w.length > 0).length;
      if (change.added) {
        additions += wordCount;
      } else if (change.removed) {
        deletions += wordCount;
      } else {
        unchanged += wordCount;
      }
    });

    return { additions, deletions, unchanged, total: additions + deletions + unchanged };
  }, [diff]);

  const metadataChanges = useMemo(() => {
    const changes: { field: string; oldValue: any; newValue: any }[] = [];
    
    if (!leftVersion.snapshot || !rightVersion.snapshot) {
      return changes;
    }
    
    const leftSnapshot = leftVersion.snapshot;
    const rightSnapshot = rightVersion.snapshot;
    
    const fieldsToCompare = [
      { key: 'name', label: 'Contract Name' },
      { key: 'contractType', label: 'Type' },
      { key: 'status', label: 'Status' },
      { key: 'description', label: 'Description' },
      { key: 'contractValue', label: 'Value' },
      { key: 'currency', label: 'Currency' },
      { key: 'effectiveDate', label: 'Effective Date' },
      { key: 'expirationDate', label: 'Expiration Date' },
      { key: 'renewalDate', label: 'Renewal Date' },
      { key: 'autoRenewal', label: 'Auto Renewal' },
      { key: 'renewalNoticeDays', label: 'Renewal Notice Days' },
      { key: 'terminationNoticeDays', label: 'Termination Notice Days' },
      { key: 'governingLaw', label: 'Governing Law' },
      { key: 'riskLevel', label: 'Risk Level' },
      { key: 'complianceStatus', label: 'Compliance Status' },
    ];
    
    fieldsToCompare.forEach(({ key, label }) => {
      const oldVal = leftSnapshot[key];
      const newVal = rightSnapshot[key];
      
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        changes.push({
          field: label,
          oldValue: formatValue(oldVal),
          newValue: formatValue(newVal),
        });
      }
    });
    
    // Compare parties
    const leftParties = leftSnapshot.parties || [];
    const rightParties = rightSnapshot.parties || [];
    if (JSON.stringify(leftParties) !== JSON.stringify(rightParties)) {
      changes.push({
        field: 'Parties',
        oldValue: `${leftParties.length} party(ies)`,
        newValue: `${rightParties.length} party(ies)`,
      });
    }
    
    // Compare obligations
    const leftObligations = leftSnapshot.obligations || [];
    const rightObligations = rightSnapshot.obligations || [];
    if (JSON.stringify(leftObligations) !== JSON.stringify(rightObligations)) {
      changes.push({
        field: 'Obligations',
        oldValue: `${leftObligations.length} obligation(s)`,
        newValue: `${rightObligations.length} obligation(s)`,
      });
    }
    
    return changes;
  }, [leftVersion.snapshot, rightVersion.snapshot]);

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'Not set';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'string' && value.includes('T')) {
      // Likely a date
      try {
        return new Date(value).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      } catch {
        return value;
      }
    }
    return String(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh]" data-testid="dialog-version-compare">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Compare Versions
            {contractName && <span className="text-muted-foreground font-normal">- {contractName}</span>}
          </DialogTitle>
          <DialogDescription>
            View differences between version {leftVersion.versionNumber} and version {rightVersion.versionNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Version Metadata */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Version {leftVersion.versionNumber}
                  </span>
                  {leftVersion.isCurrent && (
                    <Badge variant="default" data-testid="badge-current-left">Current</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {formatDate(leftVersion.createdAt)}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-3 w-3" />
                  {getCreatorName(leftVersion)}
                </div>
                {leftVersion.changesSummary && (
                  <p className="text-xs text-muted-foreground pt-2 border-t">
                    {leftVersion.changesSummary}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Version {rightVersion.versionNumber}
                  </span>
                  {rightVersion.isCurrent && (
                    <Badge variant="default" data-testid="badge-current-right">Current</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {formatDate(rightVersion.createdAt)}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-3 w-3" />
                  {getCreatorName(rightVersion)}
                </div>
                {rightVersion.changesSummary && (
                  <p className="text-xs text-muted-foreground pt-2 border-t">
                    {rightVersion.changesSummary}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Metadata Changes */}
          {metadataChanges.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Metadata Changes ({metadataChanges.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-1/3">Field</TableHead>
                      <TableHead className="w-1/3">Version {leftVersion.versionNumber}</TableHead>
                      <TableHead className="w-1/3">Version {rightVersion.versionNumber}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metadataChanges.map((change, index) => (
                      <TableRow key={index} data-testid={`metadata-change-${index}`}>
                        <TableCell className="font-medium">{change.field}</TableCell>
                        <TableCell className="text-muted-foreground">{change.oldValue}</TableCell>
                        <TableCell className="text-primary font-medium">{change.newValue}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Diff Stats */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Content Changes:</span>
                  <Badge variant="secondary" data-testid="stat-total-changes">
                    {stats.additions + stats.deletions} words
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded"></span>
                  <span className="text-muted-foreground">Added:</span>
                  <span className="font-medium text-green-700 dark:text-green-400" data-testid="stat-additions">
                    {stats.additions}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-red-500 rounded"></span>
                  <span className="text-muted-foreground">Removed:</span>
                  <span className="font-medium text-red-700 dark:text-red-400" data-testid="stat-deletions">
                    {stats.deletions}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Diff Content */}
          <Card className="flex-1 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Content Comparison</CardTitle>
            </CardHeader>
            <Separator />
            <ScrollArea className="h-full">
              <CardContent className="p-4">
                <div className="font-mono text-sm whitespace-pre-wrap break-words" data-testid="diff-content">
                  {diff.map((change, index) => (
                    <DiffLine key={index} change={change} />
                  ))}
                </div>
                {diff.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No differences found between these versions.
                  </p>
                )}
              </CardContent>
            </ScrollArea>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
