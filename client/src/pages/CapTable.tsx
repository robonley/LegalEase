import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { PersonForm } from "@/components/PersonForm";
import { CorporateShareholderForm } from "@/components/CorporateShareholderForm";
import { useEntityContext } from "@/hooks/useEntityContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Person, PersonOnOrg, ShareIssuance, Org } from "@shared/schema";

interface PersonWithRoles extends Person {
  roles: PersonOnOrg[];
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    region?: string;
    country?: string;
    postal?: string;
  };
}

export default function CapTable() {
  const { currentEntity } = useEntityContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCorporateDialogOpen, setIsCorporateDialogOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<PersonWithRoles | null>(null);
  const [viewingPerson, setViewingPerson] = useState<PersonWithRoles | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: people = [], isLoading } = useQuery<PersonWithRoles[]>({
    queryKey: ["/api/orgs", currentEntity?.id, "people"],
    enabled: !!currentEntity?.id,
  });

  // Filter for shareholders only
  const shareholders = people.filter(person => 
    person.roles.some(role => role.role === 'Shareholder')
  );

  // Filter shareholders based on search term
  const filteredShareholders = shareholders.filter(person =>
    `${person.firstName} ${person.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate total shares and percentages
  const totalShares = shareholders.reduce((total, person) => {
    const shareRoles = person.roles.filter(role => role.role === 'Shareholder');
    return total + shareRoles.reduce((sum, role) => sum + (role.shareQuantity || 0), 0);
  }, 0);

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
      toast({
        title: "Success",
        description: "Shareholder deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete shareholder",
        variant: "destructive",
      });
    },
  });

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString();
  };

  const formatPercentage = (shares: number) => {
    if (totalShares === 0) return "0%";
    return ((shares / totalShares) * 100).toFixed(2) + "%";
  };

  if (!currentEntity) {
    return (
      <div className="flex-1 overflow-auto">
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Cap Table</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Please select an entity to view its cap table
              </p>
            </div>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Cap Table</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {currentEntity.name} • Shareholder ownership and equity distribution
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-shareholder-button">
                <i className="fas fa-plus mr-2"></i>
                Add Shareholder
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Shareholder</DialogTitle>
                <DialogDescription>
                  Create a new shareholder for {currentEntity.name}
                </DialogDescription>
              </DialogHeader>
              <PersonForm
                mode="create"
                defaultRoles={['Shareholder']} // Default to shareholder role
                onSuccess={() => {
                  setIsCreateDialogOpen(false);
                  queryClient.invalidateQueries({
                    queryKey: ["/api/orgs", currentEntity?.id, "people"],
                  });
                }}
                onCancel={() => setIsCreateDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Content */}
      <div className="p-6">
        {isLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-muted-foreground">Loading cap table...</div>
            </CardContent>
          </Card>
        ) : shareholders.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <i className="fas fa-chart-pie text-4xl text-muted-foreground mb-4"></i>
              <CardTitle className="mb-2">No Shareholders</CardTitle>
              <CardDescription className="mb-6">
                This entity doesn't have any shareholders yet. Start building your cap table by adding shareholders.
              </CardDescription>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" data-testid="add-first-shareholder-button">
                    <i className="fas fa-plus mr-2"></i>
                    Add First Shareholder
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add First Shareholder</DialogTitle>
                    <DialogDescription>
                      Create the first shareholder for {currentEntity.name}
                    </DialogDescription>
                  </DialogHeader>
                  <PersonForm
                    mode="create"
                    defaultRoles={['Shareholder']}
                    onSuccess={() => {
                      setIsCreateDialogOpen(false);
                      queryClient.invalidateQueries({
                        queryKey: ["/api/orgs", currentEntity?.id, "people"],
                      });
                    }}
                    onCancel={() => setIsCreateDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Shareholder Registry</CardTitle>
                  <CardDescription>
                    {shareholders.length} shareholder{shareholders.length !== 1 ? 's' : ''} • {totalShares.toLocaleString()} total shares
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Input
                    placeholder="Search shareholders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                    data-testid="search-shareholders-input"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shareholder</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Shares</TableHead>
                    <TableHead>Share Type</TableHead>
                    <TableHead>Ownership %</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredShareholders.map((person) => {
                    const shareholderRoles = person.roles.filter(role => role.role === 'Shareholder');
                    return shareholderRoles.map((role) => (
                      <TableRow key={`${person.id}-${role.id}`} data-testid={`shareholder-row-${person.id}`}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {person.firstName} {person.lastName}
                            </div>
                            {role.title && (
                              <div className="text-sm text-muted-foreground">{role.title}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {person.email || "Not provided"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {role.shareQuantity?.toLocaleString() || "0"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{role.shareType || "Common"}</span>
                            {role.shareClass && (
                              <span className="text-sm text-muted-foreground">{role.shareClass}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {formatPercentage(role.shareQuantity || 0)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {role.shareIssueDate ? formatDate(role.shareIssueDate) : "Not specified"}
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
                              
                              {/* View Shareholder */}
                              <DropdownMenuItem
                                onClick={() => setViewingPerson(person)}
                                data-testid={`view-shareholder-${person.id}`}
                              >
                                <i className="fas fa-eye mr-2"></i>
                                View Details
                              </DropdownMenuItem>
                              
                              {/* Edit Shareholder */}
                              <DropdownMenuItem
                                onClick={() => setEditingPerson(person)}
                                data-testid={`edit-shareholder-${person.id}`}
                              >
                                <i className="fas fa-edit mr-2"></i>
                                Edit
                              </DropdownMenuItem>
                              
                              <DropdownMenuSeparator />
                              
                              {/* Send Email */}
                              {person.email && (
                                <DropdownMenuItem
                                  onClick={() => window.open(`mailto:${person.email}`, '_blank')}
                                  data-testid={`email-shareholder-${person.id}`}
                                >
                                  <i className="fas fa-envelope mr-2"></i>
                                  Send Email
                                </DropdownMenuItem>
                              )}
                              
                              <DropdownMenuSeparator />
                              
                              {/* Delete Shareholder */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    onSelect={(e) => e.preventDefault()}
                                    className="text-destructive focus:text-destructive"
                                    data-testid={`delete-shareholder-${person.id}`}
                                  >
                                    <i className="fas fa-trash mr-2"></i>
                                    Delete
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Shareholder</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete {person.firstName} {person.lastName} from the cap table? 
                                      This will remove all their share holdings and cannot be undone.
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
                    ));
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* View Shareholder Dialog */}
        <Dialog open={!!viewingPerson} onOpenChange={() => setViewingPerson(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Shareholder Details</DialogTitle>
              <DialogDescription>
                Detailed information for {viewingPerson?.firstName} {viewingPerson?.lastName}
              </DialogDescription>
            </DialogHeader>
            {viewingPerson && (
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
                      <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                      <p className="mt-1">
                        {viewingPerson.dob
                          ? formatDate(viewingPerson.dob)
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

                {/* Share Holdings */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Share Holdings</h3>
                  <div className="space-y-3">
                    {viewingPerson.roles
                      .filter(role => role.role === 'Shareholder')
                      .map((role) => (
                        <div key={role.id} className="border rounded-lg p-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Shares:</span> {role.shareQuantity?.toLocaleString() || "0"}
                            </div>
                            <div>
                              <span className="font-medium">Share Type:</span> {role.shareType || "Common"}
                            </div>
                            {role.shareClass && (
                              <div>
                                <span className="font-medium">Share Class:</span> {role.shareClass}
                              </div>
                            )}
                            <div>
                              <span className="font-medium">Ownership:</span> {formatPercentage(role.shareQuantity || 0)}
                            </div>
                            {role.shareIssueDate && (
                              <div>
                                <span className="font-medium">Issue Date:</span> {formatDate(role.shareIssueDate)}
                              </div>
                            )}
                            <div>
                              <span className="font-medium">Start Date:</span> {formatDate(role.startAt)}
                            </div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Shareholder Dialog */}
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
                mode="edit"
                initialData={editingPerson}
                onSuccess={() => {
                  setEditingPerson(null);
                  queryClient.invalidateQueries({
                    queryKey: ["/api/orgs", currentEntity?.id, "people"],
                  });
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