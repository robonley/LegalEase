import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function AuditLog() {
  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
    startDate: '',
    endDate: '',
    fieldName: '',
    actorId: '',
    limit: 50,
    offset: 0
  });
  const [showFilters, setShowFilters] = useState(false);

  const { data: logs = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/audit-logs/filter", filters],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '') {
          searchParams.append(key, value.toString());
        }
      });
      const response = await fetch(`/api/audit-logs/filter?${searchParams}`);
      return response.json();
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE_ORG':
        return 'fas fa-building';
      case 'UPDATE_ORG':
        return 'fas fa-edit';
      case 'ADD_PERSON':
        return 'fas fa-user-plus';
      case 'CREATE_SHARE_CLASS':
        return 'fas fa-chart-pie';
      case 'ISSUE_SHARES':
        return 'fas fa-share-alt';
      case 'TRANSFER_SHARES':
        return 'fas fa-exchange-alt';
      case 'GENERATE_DOCUMENT':
        return 'fas fa-file-alt';
      case 'GENERATE_MINUTE_BOOK':
        return 'fas fa-book';
      default:
        return 'fas fa-cog';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE_ORG':
      case 'ADD_PERSON':
      case 'CREATE_SHARE_CLASS':
        return 'text-green-400';
      case 'UPDATE_ORG':
        return 'text-blue-400';
      case 'ISSUE_SHARES':
      case 'TRANSFER_SHARES':
        return 'text-purple-400';
      case 'GENERATE_DOCUMENT':
      case 'GENERATE_MINUTE_BOOK':
        return 'text-orange-400';
      default:
        return 'text-muted-foreground';
    }
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatFieldChanges = (fieldChanges: any) => {
    if (!fieldChanges || typeof fieldChanges !== 'object') return null;
    
    return Object.entries(fieldChanges).map(([field, changes]: [string, any]) => (
      <div key={field} className="text-xs bg-muted/30 p-2 rounded border-l-2 border-blue-400">
        <div className="font-medium text-blue-600 mb-1">{field.replace(/([A-Z])/g, ' $1').toLowerCase()}</div>
        <div className="flex gap-2 items-center">
          <span className="text-red-600">Old: {JSON.stringify(changes.old)}</span>
          <i className="fas fa-arrow-right text-muted-foreground"></i>
          <span className="text-green-600">New: {JSON.stringify(changes.new)}</span>
        </div>
      </div>
    ));
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      action: '',
      entityType: '',
      startDate: '',
      endDate: '',
      fieldName: '',
      actorId: '',
      limit: 50,
      offset: 0
    });
  };

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Audit Log</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track all system activities and changes
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Enhanced Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Audit Log Filters</CardTitle>
                <CardDescription>
                  Filter audit logs by date, action, entity, field changes, and more
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  data-testid="toggle-filters"
                >
                  <i className={`fas fa-filter mr-2`}></i>
                  {showFilters ? 'Hide' : 'Show'} Filters
                </Button>
                {Object.values(filters).some(v => v && v !== '') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    data-testid="clear-filters"
                  >
                    <i className="fas fa-times mr-2"></i>
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <Collapsible open={showFilters}>
            <CollapsibleContent>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="action-filter">Action Type</Label>
                  <Select value={filters.action} onValueChange={(value) => handleFilterChange('action', value)}>
                    <SelectTrigger data-testid="action-filter">
                      <SelectValue placeholder="All actions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All actions</SelectItem>
                      <SelectItem value="CREATE_ORG">Create Organization</SelectItem>
                      <SelectItem value="UPDATE_ORG">Update Organization</SelectItem>
                      <SelectItem value="ADD_PERSON">Add Person</SelectItem>
                      <SelectItem value="UPDATE_PERSON">Update Person</SelectItem>
                      <SelectItem value="CREATE_SHARE_CLASS">Create Share Class</SelectItem>
                      <SelectItem value="ISSUE_SHARES">Issue Shares</SelectItem>
                      <SelectItem value="TRANSFER_SHARES">Transfer Shares</SelectItem>
                      <SelectItem value="CREATE_DOCUMENT">Create Document</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="entity-type-filter">Entity Type</Label>
                  <Select value={filters.entityType} onValueChange={(value) => handleFilterChange('entityType', value)}>
                    <SelectTrigger data-testid="entity-type-filter">
                      <SelectValue placeholder="All entities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All entities</SelectItem>
                      <SelectItem value="organization">Organizations</SelectItem>
                      <SelectItem value="person">People</SelectItem>
                      <SelectItem value="share_class">Share Classes</SelectItem>
                      <SelectItem value="share_issuance">Share Issuances</SelectItem>
                      <SelectItem value="document">Documents</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="field-name-filter">Field Changed</Label>
                  <Input
                    id="field-name-filter"
                    placeholder="e.g., name, email, address"
                    value={filters.fieldName}
                    onChange={(e) => handleFilterChange('fieldName', e.target.value)}
                    data-testid="field-name-filter"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="start-date-filter">Start Date</Label>
                  <Input
                    id="start-date-filter"
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    data-testid="start-date-filter"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="end-date-filter">End Date</Label>
                  <Input
                    id="end-date-filter"
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    data-testid="end-date-filter"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="actor-filter">User ID</Label>
                  <Input
                    id="actor-filter"
                    placeholder="Filter by user ID"
                    value={filters.actorId}
                    onChange={(e) => handleFilterChange('actorId', e.target.value)}
                    data-testid="actor-filter"
                  />
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Audit Logs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>System Activity ({logs.length} entries)</CardTitle>
                <CardDescription>
                  All user actions and system events are logged here for compliance and auditing purposes.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                data-testid="refresh-logs"
              >
                <i className="fas fa-sync-alt mr-2"></i>
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <i className="fas fa-spinner fa-spin text-2xl text-muted-foreground"></i>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <i className="fas fa-clipboard-list text-4xl text-muted-foreground mb-4"></i>
                <h3 className="text-lg font-medium mb-2">No audit logs yet</h3>
                <p className="text-sm text-muted-foreground">
                  Activity logs will appear here as users interact with the system
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {logs.map((log: any) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                    data-testid={`audit-log-${log.id}`}
                  >
                    <div className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center ${getActionColor(log.action)}`}>
                      <i className={`${getActionIcon(log.action)} text-sm`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{formatAction(log.action)}</span>
                        <Badge variant="secondary" className="text-xs">
                          {log.orgId ? 'Entity Action' : 'System Action'}
                        </Badge>
                      </div>
                      {/* Field Changes Display */}
                      {log.fieldChanges && (
                        <div className="mb-3">
                          <div className="text-xs font-medium text-muted-foreground mb-2">Field Changes:</div>
                          <div className="space-y-2">
                            {formatFieldChanges(log.fieldChanges)}
                          </div>
                        </div>
                      )}
                      
                      {/* Context Information */}
                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs mb-2">
                            <i className="fas fa-info-circle mr-1"></i>
                            View Details
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted/20 rounded">
                            <div className="grid grid-cols-2 gap-2">
                              {log.entityType && (
                                <div><strong>Entity:</strong> {log.entityType}</div>
                              )}
                              {log.entityId && (
                                <div><strong>Entity ID:</strong> {log.entityId}</div>
                              )}
                              {log.ipAddress && (
                                <div><strong>IP Address:</strong> {log.ipAddress}</div>
                              )}
                              {log.userAgent && (
                                <div><strong>User Agent:</strong> {log.userAgent.substring(0, 50)}...</div>
                              )}
                            </div>
                            {log.payload && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-xs font-medium">Raw Payload</summary>
                                <pre className="text-xs mt-1 overflow-auto">{JSON.stringify(log.payload, null, 2)}</pre>
                              </details>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          <i className="fas fa-user mr-1"></i>
                          User ID: {log.actorId}
                        </span>
                        <span>
                          <i className="fas fa-clock mr-1"></i>
                          {formatDate(log.createdAt)}
                        </span>
                        {log.orgId && (
                          <span>
                            <i className="fas fa-building mr-1"></i>
                            Entity ID: {log.orgId}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
