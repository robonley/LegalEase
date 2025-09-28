import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useEntityContext } from "@/hooks/useEntityContext";
import { useToast } from "@/hooks/use-toast";
import { PersonForm } from "@/components/PersonForm";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PersonOnOrg } from "@shared/schema";

export function ShareholdersRegister() {
  const { currentEntity } = useEntityContext();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  interface PersonWithRoles {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    roles: PersonOnOrg[];
  }

  const { data: people = [], isLoading } = useQuery<PersonWithRoles[]>({
    queryKey: ["/api/orgs", currentEntity?.id, "people"],
    enabled: !!currentEntity?.id,
  });

  const deletePersonMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/people-on-orgs/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orgs", "people"] });
      toast({
        title: "Shareholder Removed",
        description: "Shareholder has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove shareholder. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (!currentEntity) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              Please select an entity to view the shareholders register.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter for shareholders only - flatten person-role combinations and filter by Shareholder role
  const shareholders = people.flatMap(person => 
    person.roles
      .filter(role => role.role.toLowerCase() === 'shareholder')
      .map(role => ({
        ...role,
        person: person,
        personId: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email
      }))
  );

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'Not specified';
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Shareholders Register</h1>
          <p className="text-muted-foreground">
            Manage shareholders for {currentEntity.name}
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-shareholder-button">
              <i className="fas fa-plus mr-2"></i>
              Add Shareholder
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Shareholder</DialogTitle>
              <DialogDescription>
                Add a new shareholder to {currentEntity.name}
              </DialogDescription>
            </DialogHeader>
            <PersonForm
              onSubmit={async (data) => {
                await apiRequest('POST', '/api/people-on-orgs', {
                  person: data.person,
                  roles: data.roles.filter(role => role.role === 'Shareholder')
                });
                setIsAddDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ["/api/orgs", currentEntity?.id, "people"] });
                toast({
                  title: "Shareholder Added",
                  description: "New shareholder has been added successfully.",
                });
              }}
              onCancel={() => setIsAddDialogOpen(false)}
              initialData={{
                roles: [{ role: 'Shareholder' as const, title: '', startAt: '' }]
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Shareholders List */}
      <Card>
        <CardHeader>
          <CardTitle>Current Shareholders</CardTitle>
          <CardDescription>
            All shareholders currently holding shares in {currentEntity.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <i className="fas fa-spinner fa-spin text-2xl text-muted-foreground mb-4"></i>
              <p className="text-muted-foreground">Loading shareholders...</p>
            </div>
          ) : shareholders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <i className="fas fa-users text-4xl mb-4"></i>
              <h3 className="text-lg font-medium">No Shareholders Found</h3>
              <p>No shareholders have been added to this entity yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {shareholders.map((shareholder) => (
                <Card key={shareholder.id} className="border-l-4 border-l-purple-400">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium">
                            {shareholder.firstName} {shareholder.lastName}
                          </h4>
                          <Badge variant="secondary">Shareholder</Badge>
                          {shareholder.title && (
                            <Badge variant="outline">{shareholder.title}</Badge>
                          )}
                        </div>
                        
                        {shareholder.email && (
                          <p className="text-sm text-muted-foreground">
                            <i className="fas fa-envelope mr-2"></i>
                            {shareholder.email}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            <i className="fas fa-calendar mr-1"></i>
                            Start: {formatDate(shareholder.startAt)}
                          </span>
                          {shareholder.endAt && (
                            <span>
                              <i className="fas fa-calendar-times mr-1"></i>
                              End: {formatDate(shareholder.endAt)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              data-testid={`edit-shareholder-${shareholder.id}`}
                            >
                              <i className="fas fa-edit mr-1"></i>
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Edit Shareholder</DialogTitle>
                              <DialogDescription>
                                Update shareholder information
                              </DialogDescription>
                            </DialogHeader>
                            <PersonForm
                              onSubmit={async (data) => {
                                await apiRequest('PUT', `/api/people-on-orgs/${shareholder.id}`, {
                                  person: data.person,
                                  roles: data.roles.filter(role => role.role === 'Shareholder')
                                });
                                queryClient.invalidateQueries({ queryKey: ["/api/orgs", currentEntity?.id, "people"] });
                                toast({
                                  title: "Shareholder Updated",
                                  description: "Shareholder information has been updated successfully.",
                                });
                              }}
                              onCancel={() => {}}
                              isEditMode={true}
                              initialData={{
                                firstName: shareholder.firstName || '',
                                lastName: shareholder.lastName || '',
                                email: shareholder.email || '',
                                roles: [{
                                  role: 'Shareholder' as const,
                                  title: shareholder.title || '',
                                  startAt: shareholder.startAt ? new Date(shareholder.startAt).toISOString().split('T')[0] : ''
                                }]
                              }}
                            />
                          </DialogContent>
                        </Dialog>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deletePersonMutation.mutate(shareholder.id)}
                          disabled={deletePersonMutation.isPending}
                          data-testid={`delete-shareholder-${shareholder.id}`}
                        >
                          <i className="fas fa-trash mr-1"></i>
                          Remove
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}