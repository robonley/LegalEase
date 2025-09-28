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

export function DirectorsRegister() {
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
        title: "Director Removed",
        description: "Director has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove director. Please try again.",
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
              Please select an entity to view the directors register.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter for directors only - flatten person-role combinations and filter by Director role
  const directors = people.flatMap(person => 
    person.roles
      .filter(role => role.role.toLowerCase() === 'director')
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
          <h1 className="text-2xl font-semibold">Directors Register</h1>
          <p className="text-muted-foreground">
            Manage directors for {currentEntity.name}
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-director-button">
              <i className="fas fa-plus mr-2"></i>
              Add Director
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Director</DialogTitle>
              <DialogDescription>
                Add a new director to {currentEntity.name}
              </DialogDescription>
            </DialogHeader>
            <PersonForm
              onSubmit={async (data) => {
                // Submit the new director
                await apiRequest('POST', '/api/people-on-orgs', {
                  person: data.person,
                  roles: data.roles.filter(role => role.role === 'Director')
                });
                setIsAddDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ["/api/orgs", currentEntity?.id, "people"] });
                toast({
                  title: "Director Added",
                  description: "New director has been added successfully.",
                });
              }}
              onCancel={() => setIsAddDialogOpen(false)}
              initialData={{
                roles: [{ role: 'Director' as const, title: '', startAt: '' }]
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Directors List */}
      <Card>
        <CardHeader>
          <CardTitle>Current Directors</CardTitle>
          <CardDescription>
            All directors currently serving {currentEntity.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <i className="fas fa-spinner fa-spin text-2xl text-muted-foreground mb-4"></i>
              <p className="text-muted-foreground">Loading directors...</p>
            </div>
          ) : directors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <i className="fas fa-users text-4xl mb-4"></i>
              <h3 className="text-lg font-medium">No Directors Found</h3>
              <p>No directors have been added to this entity yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {directors.map((director) => (
                <Card key={director.id} className="border-l-4 border-l-blue-400">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium">
                            {director.firstName} {director.lastName}
                          </h4>
                          <Badge variant="secondary">Director</Badge>
                          {director.title && (
                            <Badge variant="outline">{director.title}</Badge>
                          )}
                        </div>
                        
                        {director.email && (
                          <p className="text-sm text-muted-foreground">
                            <i className="fas fa-envelope mr-2"></i>
                            {director.email}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            <i className="fas fa-calendar mr-1"></i>
                            Start: {formatDate(director.startAt)}
                          </span>
                          {director.endAt && (
                            <span>
                              <i className="fas fa-calendar-times mr-1"></i>
                              End: {formatDate(director.endAt)}
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
                              data-testid={`edit-director-${director.id}`}
                            >
                              <i className="fas fa-edit mr-1"></i>
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Edit Director</DialogTitle>
                              <DialogDescription>
                                Update director information
                              </DialogDescription>
                            </DialogHeader>
                            <PersonForm
                              onSubmit={async (data) => {
                                // Update the director
                                await apiRequest('PUT', `/api/people-on-orgs/${director.id}`, {
                                  person: data.person,
                                  roles: data.roles.filter(role => role.role === 'Director')
                                });
                                queryClient.invalidateQueries({ queryKey: ["/api/orgs", currentEntity?.id, "people"] });
                                toast({
                                  title: "Director Updated",
                                  description: "Director information has been updated successfully.",
                                });
                              }}
                              onCancel={() => {}}
                              isEditMode={true}
                              initialData={{
                                firstName: director.firstName || '',
                                lastName: director.lastName || '',
                                email: director.email || '',
                                roles: [{
                                  role: 'Director' as const,
                                  title: director.title || '',
                                  startAt: director.startAt ? new Date(director.startAt).toISOString().split('T')[0] : ''
                                }]
                              }}
                            />
                          </DialogContent>
                        </Dialog>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deletePersonMutation.mutate(director.id)}
                          disabled={deletePersonMutation.isPending}
                          data-testid={`delete-director-${director.id}`}
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