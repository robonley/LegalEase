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
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const { data: people = [], isLoading } = useQuery<PersonWithRoles[]>({
    queryKey: ["/api/orgs", currentEntity?.id, "people"],
    enabled: !!currentEntity?.id,
  });

  // Delete person mutation
  const deleteMutation = useMutation({
    mutationFn: async (personId: string) => {
      await apiRequest("DELETE", `/api/orgs/${currentEntity?.id}/people/${personId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/orgs", currentEntity?.id, "people"],
      });
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
      phone: (person as any).phone || "",
      address: (person as any).address || "",
      dateOfBirth: (person as any).dateOfBirth || "",
      roles: person.roles.map(role => ({
        role: role.role,
        title: role.title,
        startDate: role.startAt,
        shareQuantity: (role as any).shareQuantity,
        shareType: (role as any).shareType,
        shareClass: (role as any).shareClass,
        shareIssueDate: (role as any).shareIssueDate,
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

  // Update person mutation
  const updatePersonMutation = useMutation({
    mutationFn: async (data: { personId: string; person: any; roles: any[] }) => {
      return await apiRequest("PUT", `/api/orgs/${currentEntity?.id}/people/${data.personId}`, {
        person: data.person,
        roles: data.roles,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orgs", currentEntity?.id, "people"] });
      setEditingPerson(null);
      setIsEditMode(false);
      setViewingPerson(null);
      toast({
        title: "Success",
        description: "Person updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update person",
        variant: "destructive",
      });
    },
  });

  // Group people and consolidate their roles into single rows
  const consolidatedPeople = people.map(person => {
    const activeRoles = person.roles.filter(role => !role.endAt);
    const allRoles = person.roles;
    
    // Get unique titles (excluding empty/null titles)
    const titles = Array.from(new Set(allRoles.map(role => role.title).filter(Boolean)));
    
    // Get earliest start date
    const earliestStart = allRoles.reduce((earliest: string | null, role) => {
      if (!role.startAt) return earliest;
      
      // Convert role.startAt to string format
      const roleStartString = role.startAt instanceof Date 
        ? role.startAt.toISOString() 
        : String(role.startAt);
      
      if (!earliest) return roleStartString;
      
      const roleDate = new Date(roleStartString);
      const earliestDate = new Date(earliest);
      return roleDate < earliestDate ? roleStartString : earliest;
    }, null);

    return {
      id: person.id,
      personId: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      email: person.email,
      roles: activeRoles.map(role => role.role),
      allRoles: allRoles.map(role => role.role),
      titles: titles,
      startAt: earliestStart,
      hasInactiveRoles: allRoles.some(role => role.endAt),
      person: person
    };
  });

  const filteredPeople = consolidatedPeople.filter(personData => {
    const matchesSearch = 
      `${personData.firstName} ${personData.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      personData.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      personData.allRoles.some(role => role.toLowerCase().includes(searchTerm.toLowerCase())) ||
      personData.titles.some(title => title && title.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = roleFilter === "all" || 
      personData.allRoles.some(role => role.toLowerCase() === roleFilter.toLowerCase());
    
    return matchesSearch && matchesRole;
  });

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
              placeholder="Search people and roles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
              data-testid="search-people"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Filter by Role:</label>
            <select 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-background border border-input rounded-md px-3 py-1 text-sm"
              data-testid="role-filter"
            >
              <option value="all">All Roles</option>
              <option value="director">Directors</option>
              <option value="officer">Officers</option>
              <option value="shareholder">Shareholders</option>
            </select>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="text-sm text-muted-foreground">
            {filteredPeople.length} person{filteredPeople.length === 1 ? '' : 'people'}
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
                {searchTerm || roleFilter !== "all" ? 'No roles found' : 'No people added yet'}
              </CardTitle>
              <CardDescription className="mb-4">
                {searchTerm || roleFilter !== "all"
                  ? 'Try adjusting your search terms or role filter.'
                  : 'Add your first person to get started managing roles.'
                }
              </CardDescription>
              {!searchTerm && roleFilter === "all" && (
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
              <CardTitle>People & Roles Directory</CardTitle>
              <CardDescription>
                All roles and people associated with {currentEntity.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Titles</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPeople.map((personData) => (
                    <TableRow key={personData.personId} data-testid={`person-row-${personData.personId}`}>
                      <TableCell>
                        <div 
                          className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded p-2 -m-2 transition-colors"
                          onClick={() => setViewingPerson(personData.person)}
                          data-testid={`view-person-${personData.personId}`}
                        >
                          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-foreground">
                              {personData.firstName[0]}{personData.lastName[0]}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium hover:text-primary transition-colors">
                              {personData.firstName} {personData.lastName}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          {personData.email || 'No email'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {personData.roles.map((role) => (
                            <Badge 
                              key={`${personData.personId}-${role}`}
                              variant={getRoleBadgeVariant(role)}
                              className="text-xs"
                              data-testid={`role-badge-${personData.personId}-${role}`}
                            >
                              {role}
                            </Badge>
                          ))}
                          {personData.hasInactiveRoles && (
                            <Badge variant="secondary" className="text-xs opacity-60">
                              +Past Roles
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {personData.titles.length > 0 ? personData.titles.join(', ') : '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">
                          {formatDate(personData.startAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={personData.roles.length > 0 ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {personData.roles.length > 0 ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`actions-menu-${personData.personId}`}
                            >
                              <i className="fas fa-ellipsis-h"></i>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            
                            {/* View Person */}
                            <DropdownMenuItem
                              onClick={() => setViewingPerson(personData.person)}
                              data-testid={`view-person-${personData.personId}`}
                            >
                              <i className="fas fa-eye mr-2"></i>
                              View Details
                            </DropdownMenuItem>
                            
                            {/* Edit Person */}
                            <DropdownMenuItem
                              onClick={() => setEditingPerson(personData.person)}
                              data-testid={`edit-person-${personData.personId}`}
                            >
                              <i className="fas fa-edit mr-2"></i>
                              Edit
                            </DropdownMenuItem>
                            
                            {/* Clone Person */}
                            <DropdownMenuItem
                              onClick={() => handleClonePerson(personData.person)}
                              data-testid={`clone-person-${personData.personId}`}
                            >
                              <i className="fas fa-copy mr-2"></i>
                              Clone
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            
                            {/* Send Email */}
                            {personData.email && (
                              <DropdownMenuItem
                                onClick={() => window.open(`mailto:${personData.email}`, '_blank')}
                                data-testid={`email-person-${personData.personId}`}
                              >
                                <i className="fas fa-envelope mr-2"></i>
                                Send Email
                              </DropdownMenuItem>
                            )}
                            
                            {/* Call */}
                            {(personData.person as any).phone && (
                              <DropdownMenuItem
                                onClick={() => window.open(`tel:${(personData.person as any).phone}`, '_blank')}
                                data-testid={`call-person-${personData.personId}`}
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
                                  data-testid={`delete-person-${personData.personId}`}
                                >
                                  <i className="fas fa-trash mr-2"></i>
                                  Delete
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Person</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete {personData.firstName} {personData.lastName}? 
                                    This action cannot be undone and will remove all associated roles and share holdings.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMutation.mutate(personData.personId)}
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
                <div className="space-y-4">
                  <PersonForm
                    initialData={{
                      firstName: viewingPerson.firstName,
                      lastName: viewingPerson.lastName,
                      email: viewingPerson.email || "",
                      dob: viewingPerson.dob ? new Date(viewingPerson.dob).toISOString().split('T')[0] : "",
                      includeAddress: !!viewingPerson.addressId,
                      addressLine1: "",
                      addressLine2: "",
                      city: "",
                      region: "",
                      country: "",
                      postal: "",
                      roles: viewingPerson.roles.map(role => ({
                        role: role.role as "Director" | "Officer" | "Shareholder",
                        title: role.title || "",
                        startAt: role.startAt ? new Date(role.startAt).toISOString().split('T')[0] : "",
                        shareQuantity: role.shareQuantity?.toString() || "",
                        shareType: (role.shareType as "Common" | "Preferred") || "Common",
                        shareClass: role.shareClass || "",
                      }))
                    }}
                    onSubmit={(data) => {
                      updatePersonMutation.mutate({
                        personId: viewingPerson.id,
                        person: data.person,
                        roles: data.roles,
                      });
                    }}
                    onCancel={() => setIsEditMode(false)}
                    hideButtons={true}
                    isEditMode={true}
                  />
                  {/* Save/Cancel buttons for edit mode */}
                  <div className="flex justify-end gap-3 pt-6 border-t">
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={() => setIsEditMode(false)}
                      data-testid="cancel-edit-button"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      form="person-form"
                      data-testid="save-person-button"
                      disabled={updatePersonMutation.isPending}
                    >
                      {updatePersonMutation.isPending ? "Updating..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
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
              <DialogTitle>Edit Shareholder</DialogTitle>
              <DialogDescription>
                Update shareholding information for {editingPerson?.firstName} {editingPerson?.lastName}
              </DialogDescription>
            </DialogHeader>
            {editingPerson && (
              <PersonForm
                initialData={{
                  firstName: editingPerson.firstName,
                  lastName: editingPerson.lastName,
                  email: editingPerson.email || "",
                  dob: editingPerson.dob ? new Date(editingPerson.dob).toISOString().split('T')[0] : "",
                  includeAddress: !!editingPerson.addressId,
                  addressLine1: "", // Would need to fetch address details separately
                  addressLine2: "",
                  city: "",
                  region: "",
                  country: "",
                  postal: "",
                  roles: editingPerson.roles.map(role => ({
                    role: role.role as "Director" | "Officer" | "Shareholder",
                    title: role.title || "",
                    startAt: role.startAt ? new Date(role.startAt).toISOString().split('T')[0] : "",
                    shareQuantity: role.shareQuantity?.toString() || "",
                    shareType: (role.shareType as "Common" | "Preferred") || "Common",
                    shareClass: role.shareClass || "",
                  }))
                }}
                onSubmit={(data) => {
                  updatePersonMutation.mutate({
                    personId: editingPerson.id,
                    person: data.person,
                    roles: data.roles,
                  });
                }}
                onCancel={() => setEditingPerson(null)}
                isEditMode={true}
                isLoading={updatePersonMutation.isPending}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
