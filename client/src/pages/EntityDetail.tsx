import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useEntityContext } from "@/hooks/useEntityContext";
import type { Org } from "@shared/schema";

export default function EntityDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { setCurrentEntity } = useEntityContext();

  const { data: entity, isLoading } = useQuery<Org>({
    queryKey: ["/api/orgs", id],
    enabled: !!id,
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/entities')}
              data-testid="back-button"
            >
              <i className="fas fa-arrow-left mr-2"></i>
              Back to Entities
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <span className="text-lg font-medium text-primary">
                  {getEntityInitials(entity.name)}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-semibold">{entity.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {entity.jurisdiction} • #{entity.number || 'No number'}
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setLocation(`/entities/${id}/edit`)}
              data-testid="edit-entity-button"
            >
              <i className="fas fa-edit mr-2"></i>
              Edit Entity
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Core details about this legal entity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Entity Name</label>
                <p className="text-lg font-medium">{entity.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Registration Number</label>
                <p className="text-lg font-medium">{entity.number || 'Not set'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Jurisdiction</label>
                <p className="text-lg font-medium">{entity.jurisdiction}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Formation Date</label>
                <p className="text-lg font-medium">
                  {formatDate(entity.formationAt)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge variant="success">Active</Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                <p className="text-lg font-medium">{formatDate(entity.updatedAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Registered Office</CardTitle>
              <CardDescription>Official registered address</CardDescription>
            </CardHeader>
            <CardContent>
              {entity.registeredOfficeId ? (
                <p className="text-muted-foreground">Address details will be loaded here</p>
              ) : (
                <p className="text-muted-foreground">No registered office address on file</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Records Office</CardTitle>
              <CardDescription>Where corporate records are maintained</CardDescription>
            </CardHeader>
            <CardContent>
              {entity.recordsOfficeId ? (
                <p className="text-muted-foreground">Address details will be loaded here</p>
              ) : (
                <p className="text-muted-foreground">No records office address on file</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks for this entity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-auto flex-col gap-2 p-4" data-testid="manage-people-button">
                <i className="fas fa-users text-xl"></i>
                <span className="text-sm">Manage People</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 p-4" data-testid="cap-table-button">
                <i className="fas fa-chart-pie text-xl"></i>
                <span className="text-sm">Cap Table</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 p-4" data-testid="documents-button">
                <i className="fas fa-file-alt text-xl"></i>
                <span className="text-sm">Documents</span>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 p-4" data-testid="minute-book-button">
                <i className="fas fa-book text-xl"></i>
                <span className="text-sm">Minute Book</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}