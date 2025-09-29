import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { RelationshipCard } from "./RelationshipCard";
import { CreateRelationshipDialog } from "./CreateRelationshipDialog";
import { EditRelationshipDialog } from "./EditRelationshipDialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Building, Network } from "lucide-react";

interface EntityRelationshipsProps {
  orgId: string;
  orgName: string;
}

interface EntityRelationship {
  id: string;
  relationshipType: string;
  ownershipPercentage?: number | null;
  notes?: string | null;
  effectiveDate?: Date | null;
  endDate?: Date | null;
  parentEntity: {
    id: string;
    name: string;
    jurisdiction: string;
  };
  childEntity: {
    id: string;
    name: string;
    jurisdiction: string;
  };
}

const relationshipGroupConfig = [
  {
    key: "subsidiary",
    title: "Subsidiaries",
    description: "Entities controlled by this organization",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    icon: Building,
  },
  {
    key: "parent", 
    title: "Parent Companies",
    description: "Entities that control this organization",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
    icon: Building,
  },
  {
    key: "sister",
    title: "Sister Companies", 
    description: "Entities under common control",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
    icon: Building,
  },
  {
    key: "related",
    title: "Related Entities",
    description: "Related through ownership or control",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
    icon: Network,
  },
  {
    key: "joint_venture",
    title: "Joint Ventures",
    description: "Jointly controlled entities",
    color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100",
    icon: Network,
  },
];

export function EntityRelationships({ orgId, orgName }: EntityRelationshipsProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRelationship, setEditingRelationship] = useState<EntityRelationship | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch relationships for this organization
  const { 
    data: relationships = [], 
    isLoading, 
    error 
  } = useQuery<EntityRelationship[]>({
    queryKey: ["/api/entity-relationships", orgId],
    enabled: !!orgId,
  });

  // Delete relationship mutation
  const deleteMutation = useMutation({
    mutationFn: async (relationshipId: string) => {
      return await apiRequest("DELETE", `/api/entity-relationships/${relationshipId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entity-relationships", orgId] });
      toast({
        title: "Success",
        description: "Entity relationship deleted successfully",
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

  // Group relationships by type from current org's perspective
  const groupRelationshipsByType = (relationships: EntityRelationship[]) => {
    const groups: Record<string, EntityRelationship[]> = {};

    relationships.forEach((relationship) => {
      const isCurrentOrgParent = relationship.parentEntity.id === orgId;
      let groupKey: string;

      if (isCurrentOrgParent) {
        groupKey = relationship.relationshipType;
      } else {
        // Flip perspective for child entity view
        switch (relationship.relationshipType) {
          case 'subsidiary': groupKey = 'parent'; break;
          case 'parent': groupKey = 'subsidiary'; break;
          default: groupKey = relationship.relationshipType;
        }
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(relationship);
    });

    return groups;
  };

  const handleEditRelationship = (relationship: EntityRelationship) => {
    setEditingRelationship(relationship);
  };

  const handleDeleteRelationship = (relationshipId: string) => {
    deleteMutation.mutate(relationshipId);
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="text-destructive text-sm mb-2">Error loading relationships</div>
            <p className="text-muted-foreground text-xs">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const groupedRelationships = groupRelationshipsByType(relationships);
  const totalRelationships = relationships.length;
  const activeRelationships = relationships.filter(r => !r.endDate).length;

  return (
    <div className="space-y-6" data-testid="entity-relationships-container">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Network className="h-6 w-6" />
            Entity Relationships
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage corporate structures and ownership relationships for {orgName}
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          data-testid="button-create-relationship"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Relationship
        </Button>
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary" data-testid="total-relationships">
                {totalRelationships}
              </div>
              <div className="text-sm text-muted-foreground">Total Relationships</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600" data-testid="active-relationships">
                {activeRelationships}
              </div>
              <div className="text-sm text-muted-foreground">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600" data-testid="ended-relationships">
                {totalRelationships - activeRelationships}
              </div>
              <div className="text-sm text-muted-foreground">Ended</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-6">
          {relationshipGroupConfig.map((group) => (
            <div key={group.key}>
              <div className="flex items-center gap-2 mb-4">
                <Skeleton className="h-6 w-6 rounded" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
              <div className="space-y-3">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Relationship Groups */}
      {!isLoading && (
        <div className="space-y-6">
          {relationshipGroupConfig.map((group) => {
            const relationshipsForGroup = groupedRelationships[group.key] || [];
            const hasRelationships = relationshipsForGroup.length > 0;

            return (
              <div key={group.key} className="space-y-4">
                {/* Group Header */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <group.icon className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">{group.title}</h3>
                    <Badge 
                      variant="secondary" 
                      className={group.color}
                      data-testid={`${group.key}-count`}
                    >
                      {relationshipsForGroup.length}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground ml-7">
                  {group.description}
                </p>

                {/* Relationships List */}
                {hasRelationships ? (
                  <div className="grid gap-4 ml-7" data-testid={`${group.key}-relationships`}>
                    {relationshipsForGroup.map((relationship) => (
                      <RelationshipCard
                        key={relationship.id}
                        relationship={relationship}
                        currentOrgId={orgId}
                        onEdit={handleEditRelationship}
                        onDelete={handleDeleteRelationship}
                        isDeleting={deleteMutation.isPending}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="ml-7 border-dashed">
                    <CardContent className="p-6">
                      <div 
                        className="text-center text-muted-foreground"
                        data-testid={`${group.key}-empty-state`}
                      >
                        <group.icon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No {group.title.toLowerCase()} relationships</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Separator between groups (except last) */}
                {group.key !== relationshipGroupConfig[relationshipGroupConfig.length - 1].key && (
                  <Separator className="my-6" />
                )}
              </div>
            );
          })}

          {/* Empty State for No Relationships */}
          {totalRelationships === 0 && !isLoading && (
            <Card className="border-dashed">
              <CardContent className="p-12">
                <div className="text-center" data-testid="no-relationships-state">
                  <Network className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Entity Relationships</h3>
                  <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                    Start building your corporate structure by adding relationships with subsidiaries, 
                    parent companies, or related entities.
                  </p>
                  <Button 
                    onClick={() => setShowCreateDialog(true)}
                    data-testid="button-create-first-relationship"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Relationship
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Dialogs */}
      <CreateRelationshipDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        currentOrgId={orgId}
        currentOrgName={orgName}
      />

      <EditRelationshipDialog
        open={!!editingRelationship}
        onOpenChange={(open) => !open && setEditingRelationship(null)}
        currentOrgId={orgId}
        currentOrgName={orgName}
        relationship={editingRelationship}
      />
    </div>
  );
}