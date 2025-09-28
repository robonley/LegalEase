import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useEntityContext } from "@/hooks/useEntityContext";
import { GettingStartedBanner } from "@/components/GettingStartedBanner";
import { useEffect, useState, useMemo } from "react";
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

interface SearchResult {
  entities: Array<Entity & { type: 'entity' }>;
  people: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    type: 'person';
    entityName: string;
    entityId: string;
    roleType: string;
    title?: string;
  }>;
  total: number;
}

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { currentEntity } = useEntityContext();
  const [searchTerm, setSearchTerm] = useState("");

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

  // Global data queries
  const { data: orgs = [], isLoading: orgsLoading } = useQuery<Entity[]>({
    queryKey: ["/api/orgs"],
    enabled: isAuthenticated && !currentEntity, // Only load when viewing global dashboard
  });

  const { data: auditLogs = [] } = useQuery<any[]>({
    queryKey: ["/api/audit-logs"],
    enabled: isAuthenticated && !currentEntity, // Only load when viewing global dashboard
  });

  // Entity-specific data queries
  const { data: entityPeople = [], isLoading: entityPeopleLoading } = useQuery<any[]>({
    queryKey: ["/api/orgs", currentEntity?.id, "people"],
    enabled: isAuthenticated && !!currentEntity?.id,
  });

  const { data: entityData, isLoading: entityLoading } = useQuery<Entity>({
    queryKey: ["/api/orgs", currentEntity?.id],
    enabled: isAuthenticated && !!currentEntity?.id,
  });

  if (!isAuthenticated || isLoading) {
    return null;
  }

  // Calculate stats based on context (global vs entity)
  const stats: StatsData = currentEntity ? {
    // Entity-specific stats
    activeEntities: 1, // Current entity
    totalShareholders: entityPeople.filter(person => 
      person.roles?.some((role: any) => role.role === 'Shareholder')
    ).length,
    documentsGenerated: 0, // Would need additional query
    minuteBooks: 0, // Would need additional query
  } : {
    // Global stats
    activeEntities: orgs.length,
    totalShareholders: 0, // Would need additional query across all entities
    documentsGenerated: 0, // Would need additional query
    minuteBooks: 0, // Would need additional query
  };

  // Universal search using API
  const { data: searchResults, isLoading: searchLoading } = useQuery<SearchResult>({
    queryKey: ['/api/search', searchTerm],
    enabled: searchTerm.trim().length >= 2,
  });

  // Determine what to display based on search state
  const displayData = useMemo(() => {
    if (searchTerm.trim().length >= 2 && searchResults) {
      return {
        entities: searchResults.entities,
        people: searchResults.people,
        activities: auditLogs.slice(0, 3),
        isSearchResults: true
      };
    }
    
    return {
      entities: orgs.slice(0, 3),
      people: entityPeople,
      activities: auditLogs.slice(0, 3),
      isSearchResults: false
    };
  }, [searchTerm, searchResults, orgs, entityPeople, auditLogs]);

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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
        {/* Getting Started Banner - Only show for global dashboard */}
        {!currentEntity && (
          <GettingStartedBanner
            totalEntities={stats.activeEntities}
            totalDocuments={stats.documentsGenerated}
            totalPeople={stats.totalShareholders}
          />
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {currentEntity ? "Entity Status" : "Active Entities"}
                  </p>
                  <p className="text-2xl font-semibold mt-1" data-testid="stat-entities">
                    {currentEntity ? "Active" : stats.activeEntities}
                  </p>
                </div>
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <i className="fas fa-building text-primary"></i>
                </div>
              </div>
              <div className="flex items-center mt-4">
                <span className="text-xs text-green-400 font-medium">
                  {currentEntity ? "Good standing" : `+${orgs.filter(org => new Date(org.updatedAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length} this month`}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation('/people')}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Shareholders</p>
                  <p className="text-2xl font-semibold mt-1" data-testid="stat-shareholders">
                    {stats.totalShareholders}
                  </p>
                </div>
                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                  <i className="fas fa-users text-blue-500"></i>
                </div>
              </div>
              <div className="flex items-center mt-4">
                {stats.totalShareholders === 0 ? (
                  <div className="flex items-center text-xs text-primary font-medium group-hover:text-primary/80">
                    <i className="fas fa-plus mr-1"></i>
                    <span>Add your first shareholders</span>
                  </div>
                ) : (
                  <span className="text-xs text-green-500 font-medium">
                    Active shareholders tracked
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation('/documents')}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Documents Generated</p>
                  <p className="text-2xl font-semibold mt-1" data-testid="stat-documents">
                    {stats.documentsGenerated}
                  </p>
                </div>
                <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                  <i className="fas fa-file-alt text-emerald-500"></i>
                </div>
              </div>
              <div className="flex items-center mt-4">
                {stats.documentsGenerated === 0 ? (
                  <div className="flex items-center text-xs text-primary font-medium group-hover:text-primary/80">
                    <i className="fas fa-rocket mr-1"></i>
                    <span>Generate your first document</span>
                  </div>
                ) : (
                  <span className="text-xs text-green-500 font-medium">
                    Documents ready to download
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation('/minute-books')}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Minute Books</p>
                  <p className="text-2xl font-semibold mt-1" data-testid="stat-minute-books">
                    {stats.minuteBooks}
                  </p>
                </div>
                <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                  <i className="fas fa-book text-purple-500"></i>
                </div>
              </div>
              <div className="flex items-center mt-4">
                {stats.minuteBooks === 0 ? (
                  <div className="flex items-center text-xs text-primary font-medium group-hover:text-primary/80">
                    <i className="fas fa-magic mr-1"></i>
                    <span>Create your first minute book</span>
                  </div>
                ) : (
                  <span className="text-xs text-green-500 font-medium">
                    Complete corporate records
                  </span>
                )}
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
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-clock text-2xl text-muted-foreground"></i>
                  </div>
                  <h3 className="text-lg font-medium mb-2">Get Started with Your First Action</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Create an entity, add people, or generate documents to see activity here
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button 
                      size="sm" 
                      onClick={() => setLocation('/entities')}
                      data-testid="activity-create-entity"
                    >
                      <i className="fas fa-plus mr-2"></i>
                      Create Entity
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setLocation('/documents')}
                      data-testid="activity-generate-docs"
                    >
                      <i className="fas fa-file-alt mr-2"></i>
                      Generate Documents
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {displayData.activities.map((log: any, index: number) => (
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

        </div>

        {/* Recent Entities / Search Results */}
        <Card>
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle>
                {searchTerm ? `Search Results for "${searchTerm}"` : "Recent Entities"}
              </CardTitle>
              {!searchTerm && (
                <Button variant="ghost" size="sm" data-testid="view-all-entities">
                  View All Entities
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {orgsLoading ? (
              <div className="p-6 text-center">
                <i className="fas fa-spinner fa-spin text-2xl text-muted-foreground"></i>
              </div>
            ) : displayData.entities.length === 0 ? (
              searchTerm ? (
                <div className="p-12 text-center">
                  <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                    <i className="fas fa-search text-3xl text-muted-foreground"></i>
                  </div>
                  <h3 className="text-xl font-semibold mb-3">No Results Found</h3>
                  <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                    No entities, people, or activities match your search for "{searchTerm}". Try using different keywords or check your spelling.
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => setSearchTerm("")}
                    data-testid="clear-search"
                  >
                    <i className="fas fa-times mr-2"></i>
                    Clear Search
                  </Button>
                </div>
              ) : (
              <div className="p-12 text-center">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <i className="fas fa-building text-3xl text-primary"></i>
                </div>
                <h3 className="text-xl font-semibold mb-3">Create Your First Legal Entity</h3>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                  Start by setting up a corporation, partnership, or LLC. This will be the foundation for managing cap tables, generating documents, and maintaining compliance.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    onClick={() => setLocation('/entities')}
                    data-testid="empty-create-entity"
                    className="min-w-[140px]"
                  >
                    <i className="fas fa-plus mr-2"></i>
                    Create Entity
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setLocation('/templates')}
                    data-testid="empty-upload-template"
                    className="min-w-[140px]"
                  >
                    <i className="fas fa-upload mr-2"></i>
                    Upload Templates
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-6">
                  💡 <strong>Pro tip:</strong> Upload your document templates first to streamline the entity creation process
                </p>
              </div>
              )
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
                    {displayData.entities.map((entity) => (
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
