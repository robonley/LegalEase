import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useEntityContext } from "@/hooks/useEntityContext";
import { useEffect } from "react";
import { useLocation } from "wouter";

interface StatsData {
  activeEntities: number;
  totalShareholders: number;
  documentsGenerated: number;
  minuteBooks: number;
}

interface ActivityItem {
  id: string;
  type: 'document' | 'person' | 'transfer';
  entityName: string;
  description: string;
  user: string;
  time: string;
}

interface Entity {
  id: string;
  name: string;
  number: string;
  jurisdiction: string;
  formationAt: string;
  updatedAt: string;
}

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { currentEntity } = useEntityContext();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: orgs = [], isLoading: orgsLoading } = useQuery<Entity[]>({
    queryKey: ["/api/orgs"],
    enabled: isAuthenticated,
  });

  const { data: auditLogs = [] } = useQuery<any[]>({
    queryKey: ["/api/audit-logs"],
    enabled: isAuthenticated && orgs.length > 0,
  });

  if (!isAuthenticated || isLoading) {
    return null;
  }

  // Calculate stats from real data
  const stats: StatsData = {
    activeEntities: orgs.length,
    totalShareholders: 0, // Would need additional query
    documentsGenerated: 0, // Would need additional query
    minuteBooks: 0, // Would need additional query
  };

  const recentEntities = orgs.slice(0, 3);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    return 'Just now';
  };

  const getEntityInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            {currentEntity ? (
              <>
                <h1 className="text-2xl font-semibold">{currentEntity.name}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentEntity.jurisdiction} • Entity Dashboard
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-semibold">Dashboard</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Overview of your legal entities and recent activity
                </p>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm"></i>
              <input
                type="text"
                placeholder="Search entities, people..."
                className="pl-10 pr-4 py-2 w-80 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                data-testid="search-input"
              />
            </div>
            <Button 
              onClick={() => setLocation('/entities')}
              data-testid="new-entity-button"
            >
              <i className="fas fa-plus mr-2"></i>
              New Entity
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Entities</p>
                  <p className="text-2xl font-semibold mt-1" data-testid="stat-entities">
                    {stats.activeEntities}
                  </p>
                </div>
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <i className="fas fa-building text-primary"></i>
                </div>
              </div>
              <div className="flex items-center mt-4">
                <span className="text-xs text-green-400 font-medium">
                  +{orgs.filter(org => new Date(org.updatedAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length} this month
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Shareholders</p>
                  <p className="text-2xl font-semibold mt-1" data-testid="stat-shareholders">
                    {stats.totalShareholders}
                  </p>
                </div>
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                  <i className="fas fa-users text-blue-500"></i>
                </div>
              </div>
              <div className="flex items-center mt-4">
                <span className="text-xs text-muted-foreground font-medium">
                  No data available
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Documents Generated</p>
                  <p className="text-2xl font-semibold mt-1" data-testid="stat-documents">
                    {stats.documentsGenerated}
                  </p>
                </div>
                <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                  <i className="fas fa-file-alt text-emerald-500"></i>
                </div>
              </div>
              <div className="flex items-center mt-4">
                <span className="text-xs text-muted-foreground font-medium">
                  No documents yet
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Minute Books</p>
                  <p className="text-2xl font-semibold mt-1" data-testid="stat-minute-books">
                    {stats.minuteBooks}
                  </p>
                </div>
                <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                  <i className="fas fa-book text-purple-500"></i>
                </div>
              </div>
              <div className="flex items-center mt-4">
                <span className="text-xs text-muted-foreground font-medium">
                  No minute books yet
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Recent Activity */}
          <Card className="lg:col-span-2">
            <CardHeader className="border-b border-border">
              <div className="flex items-center justify-between">
                <CardTitle>Recent Activity</CardTitle>
                <Button variant="ghost" size="sm" data-testid="view-all-activity">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {auditLogs.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <i className="fas fa-clock text-2xl mb-2"></i>
                  <p>No recent activity</p>
                  <p className="text-xs">Activity will appear here as you use the platform</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {auditLogs.slice(0, 3).map((log, index) => (
                    <div key={log.id} className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <i className="fas fa-file-plus text-primary text-xs"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {log.action.replace(/_/g, ' ').toLowerCase()}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {JSON.stringify(log.payload)}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>by {user?.firstName || 'Unknown'} {user?.lastName || 'User'}</span>
                            <span>{getTimeAgo(log.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="border-b border-border">
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <Button
                variant="outline"
                className="w-full justify-start"
                data-testid="quick-action-minute-book"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                  <i className="fas fa-book text-primary"></i>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Generate Minute Book</p>
                  <p className="text-xs text-muted-foreground">Create complete corporate records</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                data-testid="quick-action-add-shareholder"
              >
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center mr-3">
                  <i className="fas fa-user-plus text-blue-500"></i>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Add Shareholder</p>
                  <p className="text-xs text-muted-foreground">Register new equity holder</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                data-testid="quick-action-upload-template"
              >
                <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center mr-3">
                  <i className="fas fa-upload text-emerald-500"></i>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Upload Template</p>
                  <p className="text-xs text-muted-foreground">Add new document template</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start"
                data-testid="quick-action-export-data"
              >
                <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center mr-3">
                  <i className="fas fa-download text-purple-500"></i>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Export Data</p>
                  <p className="text-xs text-muted-foreground">Download entity information</p>
                </div>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Entities */}
        <Card>
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle>Recent Entities</CardTitle>
              <Button variant="ghost" size="sm" data-testid="view-all-entities">
                View All Entities
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {orgsLoading ? (
              <div className="p-6 text-center">
                <i className="fas fa-spinner fa-spin text-2xl text-muted-foreground"></i>
              </div>
            ) : recentEntities.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <i className="fas fa-building text-2xl mb-2"></i>
                <p>No entities created yet</p>
                <p className="text-xs">Create your first entity to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Entity Name</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Jurisdiction</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Formation Date</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Last Updated</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentEntities.map((entity) => (
                      <tr key={entity.id} className="hover:bg-muted/50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                              <span className="text-xs font-medium text-primary">
                                {getEntityInitials(entity.name)}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium">{entity.name}</p>
                              <p className="text-xs text-muted-foreground">#{entity.number || 'No number'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-sm">{entity.jurisdiction}</td>
                        <td className="p-4 text-sm">
                          {entity.formationAt ? formatDate(entity.formationAt) : 'Not set'}
                        </td>
                        <td className="p-4">
                          <Badge variant="success">Active</Badge>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {getTimeAgo(entity.updatedAt)}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`view-entity-${entity.id}`}
                            >
                              <i className="fas fa-eye text-xs"></i>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`edit-entity-${entity.id}`}
                            >
                              <i className="fas fa-edit text-xs"></i>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`generate-docs-${entity.id}`}
                            >
                              <i className="fas fa-file-download text-xs"></i>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
