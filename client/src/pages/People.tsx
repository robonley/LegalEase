import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEntityContext } from "@/hooks/useEntityContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Person, PersonOnOrg } from "@shared/schema";
import { PersonForm } from "../components/PersonForm";

interface PersonWithRoles extends Person {
  roles: PersonOnOrg[];
}

export default function People() {
  const { currentEntity } = useEntityContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<PersonWithRoles | null>(null);
  const [viewingPerson, setViewingPerson] = useState<PersonWithRoles | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: people = [], isLoading } = useQuery<PersonWithRoles[]>({
    queryKey: ["/api/orgs", currentEntity?.id, "people"],
    enabled: !!currentEntity?.id,
  });

  // Delete person mutation
  const deleteMutation = useMutation({
    mutationFn: async (personId: string) => {
      await apiRequest(`/api/orgs/${currentEntity?.id}/people/${personId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/orgs", currentEntity?.id, "people"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api", "audit-logs"] });
      toast({
        title: "Success",
        description: "Person deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete person",
        variant: "destructive",
      });
    },
  });

  // Clone person function
  const handleClonePerson = (person: PersonWithRoles) => {
    // Create a copy of the person data for the form
    const clonedData = {
      firstName: `${person.firstName} (Copy)`,
      lastName: person.lastName,
      email: "", // Clear email to avoid conflicts
      phone: person.phone,
      address: person.address,
      dateOfBirth: person.dateOfBirth,
      roles: person.roles.map(role => ({
        role: role.role,
        title: role.title,
        startDate: role.startDate,
        shareQuantity: role.shareQuantity,
        shareType: role.shareType,
        shareClass: role.shareClass,
        shareIssueDate: role.shareIssueDate,
      })),
    };
    // You would pass this data to PersonForm in create mode
    setIsCreateDialogOpen(true);
    // Note: PersonForm would need to accept initialData prop for this to work
  };

  const createPersonMutation = useMutation({
    mutationFn: async (data: { person: any; roles: any[] }) => {
      return await apiRequest("POST", `/api/orgs/${currentEntity?.id}/people`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orgs", currentEntity?.id, "people"] });
      queryClient.invalidateQueries({ queryKey: ["/api", "audit-logs"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Person added successfully",
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

  const filteredPeople = people.filter(person =>
    `${person.firstName} ${person.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeVariant = (role: string) => {
    switch (role.toLowerCase()) {
      case 'director':
        return 'default' as const;
      case 'officer':
        return 'secondary' as const;
      case 'shareholder':
        return 'outline' as const;
      default:
        return 'outline' as const;
    }
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'Not set';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!currentEntity) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <Card>
            <CardContent className="p-12 text-center">
              <i className="fas fa-building text-4xl text-muted-foreground mb-4"></i>
              <CardTitle className="mb-2">No Entity Selected</CardTitle>
              <CardDescription>
                Please select an entity from the sidebar to manage people and roles.
              </CardDescription>
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
          <div>
            <h1 className="text-2xl font-semibold">People & Roles</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage directors, officers, and shareholders for {currentEntity.name}
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-person-button">
                <i className="fas fa-plus mr-2"></i>
                Add Person
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
              <DialogHeader className="p-6 pb-4 border-b">
                <DialogTitle>Add New Person</DialogTitle>
                <DialogDescription>
                  Add a new person and assign their roles within {currentEntity.name}.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <PersonForm 
                  onSubmit={(data) => createPersonMutation.mutate(data)}
                  onCancel={() => setIsCreateDialogOpen(false)}
                  isLoading={createPersonMutation.isPending}
                  hideButtons={true}
                />
              </div>
              <div className="border-t p-6 flex justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={createPersonMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  form="person-form"
                  disabled={createPersonMutation.isPending}
                >
                  {createPersonMutation.isPending ? "Adding..." : "Add Person"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"></i>
            <Input
              placeholder="Search people..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              data-testid="search-people"
            />
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="text-sm text-muted-foreground">
            {filteredPeople.length} {filteredPeople.length === 1 ? 'person' : 'people'}
          </div>
        </div>

        {/* People List */}
        {isLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <i className="fas fa-spinner fa-spin text-2xl text-muted-foreground mb-4"></i>
              <p className="text-muted-foreground">Loading people...</p>
            </CardContent>
          </Card>
        ) : filteredPeople.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <i className="fas fa-users text-4xl text-muted-foreground mb-4"></i>
              <CardTitle className="mb-2">
                {searchTerm ? 'No people found' : 'No people added yet'}
              </CardTitle>
              <CardDescription className="mb-4">
                {searchTerm 
                  ? 'Try adjusting your search terms.'
                  : 'Add your first person to get started managing roles.'
                }
              </CardDescription>
              {!searchTerm && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <i className="fas fa-plus mr-2"></i>
                  Add First Person
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>People Directory</CardTitle>
              <CardDescription>
                Individuals associated with {currentEntity.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Share Holdings</TableHead>
                    <TableHead>Date Added</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPeople.map((person) => (
                    <TableRow key={person.id} data-testid={`person-row-${person.id}`}>
                      <TableCell>
                        <div 
                          className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded p-2 -m-2 transition-colors"
                          onClick={() => setViewingPerson(person)}
                          data-testid={`view-person-${person.id}`}
                        >
                          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-foreground">
                              {person.firstName[0]}{person.lastName[0]}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium hover:text-primary transition-colors">
                              {person.firstName} {person.lastName}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          {person.email || 'No email'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {person.roles.map((role) => (
                            <Badge 
                              key={role.id} 
                              variant={getRoleBadgeVariant(role.role)}
                              className="text-xs cursor-pointer hover:bg-primary/20 transition-colors"
                              onClick={() => setViewingPerson(person)}
                              data-testid={`role-badge-${person.id}-${role.role}`}
                            >
                              {role.title || role.role}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const shareholderRoles = person.roles.filter(role => role.role === 'Shareholder');
                          if (shareholderRoles.length === 0) {
                            return <span className="text-muted-foreground text-sm">-</span>;
                          }
                          return (
                            <div className="space-y-1">
                              {shareholderRoles.map((role) => (
                                <div key={role.id} className="text-sm">
                                  {role.shareQuantity ? (
                                    <div className="flex flex-col">
                                      <span className="font-medium">
                                        {role.shareQuantity.toLocaleString()} shares
                                      </span>
                                      <span className="text-muted-foreground text-xs">
                                        {role.shareType} {role.shareClass && `• ${role.shareClass}`}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">No shares specified</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">
                          {formatDate(person.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`actions-menu-${person.id}`}
                            >
                              <i className="fas fa-ellipsis-h"></i>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            
                            {/* View Person */}
                            <DropdownMenuItem
                              onClick={() => setViewingPerson(person)}
                              data-testid={`view-person-${person.id}`}
                            >
                              <i className="fas fa-eye mr-2"></i>
                              View Details
                            </DropdownMenuItem>
                            
                            {/* Edit Person */}
                            <DropdownMenuItem
                              onClick={() => setEditingPerson(person)}
                              data-testid={`edit-person-${person.id}`}
                            >
                              <i className="fas fa-edit mr-2"></i>
                              Edit
                            </DropdownMenuItem>
                            
                            {/* Clone Person */}
                            <DropdownMenuItem
                              onClick={() => handleClonePerson(person)}
                              data-testid={`clone-person-${person.id}`}
                            >
                              <i className="fas fa-copy mr-2"></i>
                              Clone
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            
                            {/* Send Email */}
                            {person.email && (
                              <DropdownMenuItem
                                onClick={() => window.open(`mailto:${person.email}`, '_blank')}
                                data-testid={`email-person-${person.id}`}
                              >
                                <i className="fas fa-envelope mr-2"></i>
                                Send Email
                              </DropdownMenuItem>
                            )}
                            
                            {/* Call */}
                            {person.phone && (
                              <DropdownMenuItem
                                onClick={() => window.open(`tel:${person.phone}`, '_blank')}
                                data-testid={`call-person-${person.id}`}
                              >
                                <i className="fas fa-phone mr-2"></i>
                                Call
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuSeparator />
                            
                            {/* Delete Person */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem
                                  onSelect={(e) => e.preventDefault()}
                                  className="text-destructive focus:text-destructive"
                                  data-testid={`delete-person-${person.id}`}
                                >
                                  <i className="fas fa-trash mr-2"></i>
                                  Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Person</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete {person.firstName} {person.lastName}? 
                                    This action cannot be undone and will remove all associated roles and share holdings.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMutation.mutate(person.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    disabled={deleteMutation.isPending}
                                  >
                                    {deleteMutation.isPending ? "Deleting..." : "Delete"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* View Person Dialog */}
        <Dialog open={!!viewingPerson} onOpenChange={(open) => {
          if (!open) {
            setViewingPerson(null);
            setIsEditMode(false);
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle>Person Details</DialogTitle>
                  <DialogDescription>
                    {isEditMode ? 'Edit information for' : 'Detailed information for'} {viewingPerson?.firstName} {viewingPerson?.lastName}
                  </DialogDescription>
                </div>
                {!isEditMode && (
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditMode(true)}
                    data-testid="quick-edit-button"
                  >
                    <i className="fas fa-edit mr-2"></i>
                    Edit
                  </Button>
                )}
              </div>
            </DialogHeader>
            {viewingPerson && (
              isEditMode ? (
                // Edit Mode - Show PersonForm
                <PersonForm
                  mode="edit"
                  initialData={viewingPerson}
                    onSuccess={() => {
                      setIsEditMode(false);
                      queryClient.invalidateQueries({
                        queryKey: ["/api/orgs", currentEntity?.id, "people"],
                      });
                      queryClient.invalidateQueries({ queryKey: ["/api", "audit-logs"] });
                      toast({
                        title: "Success",
                        description: "Person updated successfully",
                      });
                    }}
                  onCancel={() => setIsEditMode(false)}
                  hideButtons={true}
                />
              ) : (
                // View Mode - Show person details
                <div className="space-y-6">
                  {/* Personal Information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Personal Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Name</label>
                        <p className="mt-1">{viewingPerson.firstName} {viewingPerson.lastName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Email</label>
                        <p className="mt-1">{viewingPerson.email || "Not provided"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Phone</label>
                        <p className="mt-1">{viewingPerson.phone || "Not provided"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                        <p className="mt-1">
                          {viewingPerson.dateOfBirth 
                            ? formatDate(viewingPerson.dateOfBirth) 
                            : "Not provided"
                          }
                        </p>
                      </div>
                    </div>
                    {viewingPerson.address && (
                      <div className="mt-4">
                        <label className="text-sm font-medium text-muted-foreground">Address</label>
                        <p className="mt-1">{viewingPerson.address}</p>
                      </div>
                    )}
                  </div>

                  {/* Roles and Responsibilities */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Roles and Responsibilities</h3>
                    <div className="space-y-3">
                      {viewingPerson.roles.map((role) => (
                        <div key={role.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline">{role.role}</Badge>
                            {role.title && (
                              <span className="text-sm text-muted-foreground">{role.title}</span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="font-medium">Start Date:</span> {role.startDate ? formatDate(role.startDate) : "Not set"}
                            </div>
                            {role.role === 'Shareholder' && role.shareQuantity && (
                              <>
                                <div>
                                  <span className="font-medium">Shares:</span> {role.shareQuantity.toLocaleString()}
                                </div>
                                <div>
                                  <span className="font-medium">Share Type:</span> {role.shareType}
                                </div>
                                {role.shareClass && (
                                  <div>
                                    <span className="font-medium">Share Class:</span> {role.shareClass}
                                  </div>
                                )}
                                {role.shareIssueDate && (
                                  <div>
                                    <span className="font-medium">Issue Date:</span> {formatDate(role.shareIssueDate)}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Action Buttons for View Mode */}
                  <div className="flex justify-end gap-3 pt-6 border-t">
                    <Button variant="outline" onClick={() => setViewingPerson(null)}>
                      Close
                    </Button>
                  </div>
                </div>
              )
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Person Dialog */}
        <Dialog open={!!editingPerson} onOpenChange={() => setEditingPerson(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Person</DialogTitle>
              <DialogDescription>
                Update information for {editingPerson?.firstName} {editingPerson?.lastName}
              </DialogDescription>
            </DialogHeader>
            {editingPerson && (
              <PersonForm
                mode="edit"
                initialData={editingPerson}
                onSuccess={() => {
                  setEditingPerson(null);
                  queryClient.invalidateQueries({
                    queryKey: ["/api/orgs", currentEntity?.id, "people"],
                  });
                  queryClient.invalidateQueries({ queryKey: ["/api", "audit-logs"] });
                }}
                onCancel={() => setEditingPerson(null)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
