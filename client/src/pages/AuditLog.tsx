import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AuditLog() {
  const { data: logs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/audit-logs"],
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
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>System Activity</CardTitle>
            <CardDescription>
              All user actions and system events are logged here for compliance and auditing purposes.
            </CardDescription>
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
                      <p className="text-sm text-muted-foreground mb-2">
                        {JSON.stringify(log.payload, null, 2)}
                      </p>
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
