import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { MoreVertical, Edit, Trash2, Building, Calendar, Percent } from "lucide-react";
import { format } from "date-fns";

interface RelationshipCardProps {
  relationship: {
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
  };
  currentOrgId: string;
  onEdit: (relationship: any) => void;
  onDelete: (relationshipId: string) => void;
  isDeleting?: boolean;
}

const relationshipTypeLabels = {
  subsidiary: "Subsidiary",
  parent: "Parent Company", 
  sister: "Sister Company",
  related: "Related Entity",
  joint_venture: "Joint Venture"
};

const relationshipTypeColors = {
  subsidiary: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  parent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  sister: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100", 
  related: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
  joint_venture: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100"
};

export function RelationshipCard({ 
  relationship, 
  currentOrgId, 
  onEdit, 
  onDelete, 
  isDeleting = false 
}: RelationshipCardProps) {
  // Determine if current org is parent or child
  const isCurrentOrgParent = relationship.parentEntity.id === currentOrgId;
  const relatedEntity = isCurrentOrgParent ? relationship.childEntity : relationship.parentEntity;
  
  // Determine display relationship type based on perspective
  const getDisplayRelationshipType = () => {
    if (isCurrentOrgParent) {
      return relationship.relationshipType;
    } else {
      // Flip perspective for child entity view
      switch (relationship.relationshipType) {
        case 'subsidiary': return 'parent';
        case 'parent': return 'subsidiary';
        default: return relationship.relationshipType;
      }
    }
  };

  const displayType = getDisplayRelationshipType();
  const typeLabel = relationshipTypeLabels[displayType as keyof typeof relationshipTypeLabels] || displayType;
  const typeColor = relationshipTypeColors[displayType as keyof typeof relationshipTypeColors] || "bg-gray-100 text-gray-800";

  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return format(new Date(date), 'MMM dd, yyyy');
  };

  const isActive = !relationship.endDate;

  return (
    <Card 
      className={`relative transition-all duration-200 hover:shadow-md ${!isActive ? 'opacity-75 border-dashed' : ''}`}
      data-testid={`relationship-card-${relationship.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold flex items-center gap-2 mb-2">
              <Building className="h-5 w-5 text-muted-foreground" />
              <span className="truncate" data-testid={`relationship-entity-name-${relationship.id}`}>
                {relatedEntity.name}
              </span>
              {!isActive && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  Ended
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {relatedEntity.jurisdiction}
            </CardDescription>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0"
                data-testid={`relationship-menu-${relationship.id}`}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => onEdit(relationship)}
                data-testid={`relationship-edit-${relationship.id}`}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Relationship
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive"
                    onSelect={(e) => e.preventDefault()}
                    data-testid={`relationship-delete-trigger-${relationship.id}`}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Relationship
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Relationship</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete the {typeLabel.toLowerCase()} relationship with {relatedEntity.name}? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid={`relationship-delete-cancel-${relationship.id}`}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(relationship.id)}
                      disabled={isDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      data-testid={`relationship-delete-confirm-${relationship.id}`}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Relationship Type Badge */}
          <div className="flex items-center gap-2">
            <Badge className={typeColor} data-testid={`relationship-type-${relationship.id}`}>
              {typeLabel}
            </Badge>
            {relationship.ownershipPercentage && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Percent className="h-3 w-3" />
                <span data-testid={`relationship-ownership-${relationship.id}`}>
                  {relationship.ownershipPercentage.toFixed(1)}% ownership
                </span>
              </div>
            )}
          </div>

          {/* Dates */}
          {(relationship.effectiveDate || relationship.endDate) && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {relationship.effectiveDate && (
                  <span data-testid={`relationship-effective-date-${relationship.id}`}>
                    From {formatDate(relationship.effectiveDate)}
                  </span>
                )}
                {relationship.endDate && (
                  <span data-testid={`relationship-end-date-${relationship.id}`}>
                    {relationship.effectiveDate ? ' to ' : 'Ended '}{formatDate(relationship.endDate)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {relationship.notes && (
            <div className="mt-3 pt-3 border-t border-border">
              <p 
                className="text-sm text-muted-foreground"
                data-testid={`relationship-notes-${relationship.id}`}
              >
                {relationship.notes}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}