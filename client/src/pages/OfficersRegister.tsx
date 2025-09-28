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

export function OfficersRegister() {
  const { currentEntity } = useEntityContext();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: allPeople, isLoading } = useQuery<(PersonOnOrg & { person: any })[]>({
    queryKey: ['/api/people-on-orgs', currentEntity?.id],
    enabled: !!currentEntity?.id,
  });

  const deletePersonMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/people-on-orgs/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/people-on-orgs'] });
      toast({
        title: "Officer Removed",
        description: "Officer has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove officer. Please try again.",
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
              Please select an entity to view the officers register.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter for officers only
  const officers = (allPeople || []).filter(person => 
    person.role.toLowerCase() === 'officer'
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
          <h1 className="text-2xl font-semibold">Officers Register</h1>
          <p className="text-muted-foreground">
            Manage officers for {currentEntity.name}
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-officer-button">
              <i className="fas fa-plus mr-2"></i>
              Add Officer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Officer</DialogTitle>
              <DialogDescription>
                Add a new officer to {currentEntity.name}
              </DialogDescription>
            </DialogHeader>
            <PersonForm
              onSubmit={async (data) => {
                await apiRequest('POST', '/api/people-on-orgs', {
                  person: data.person,
                  roles: data.roles.filter(role => role.role === 'Officer')
                });
                setIsAddDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ['/api/people-on-orgs'] });
                toast({
                  title: "Officer Added",
                  description: "New officer has been added successfully.",
                });
              }}
              onCancel={() => setIsAddDialogOpen(false)}
              initialData={{
                roles: [{ role: 'Officer' as const, title: '', startAt: '' }]
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Officers List */}
      <Card>
        <CardHeader>
          <CardTitle>Current Officers</CardTitle>
          <CardDescription>
            All officers currently serving {currentEntity.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <i className="fas fa-spinner fa-spin text-2xl text-muted-foreground mb-4"></i>
              <p className="text-muted-foreground">Loading officers...</p>
            </div>
          ) : officers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <i className="fas fa-briefcase text-4xl mb-4"></i>
              <h3 className="text-lg font-medium">No Officers Found</h3>
              <p>No officers have been added to this entity yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {officers.map((personOnOrg: PersonOnOrg & { person: any }) => (
                <Card key={personOnOrg.id} className="border-l-4 border-l-green-400">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium">
                            {personOnOrg.person?.firstName} {personOnOrg.person?.lastName}
                          </h4>
                          <Badge variant="secondary">Officer</Badge>
                          {personOnOrg.title && (
                            <Badge variant="outline">{personOnOrg.title}</Badge>
                          )}
                        </div>
                        
                        {personOnOrg.person?.email && (
                          <p className="text-sm text-muted-foreground">
                            <i className="fas fa-envelope mr-2"></i>
                            {personOnOrg.person.email}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            <i className="fas fa-calendar mr-1"></i>
                            Start: {formatDate(personOnOrg.startAt)}
                          </span>
                          {personOnOrg.endAt && (
                            <span>
                              <i className="fas fa-calendar-times mr-1"></i>
                              End: {formatDate(personOnOrg.endAt)}
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
                              data-testid={`edit-officer-${personOnOrg.id}`}
                            >
                              <i className="fas fa-edit mr-1"></i>
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Edit Officer</DialogTitle>
                              <DialogDescription>
                                Update officer information
                              </DialogDescription>
                            </DialogHeader>
                            <PersonForm
                              onSubmit={async (data) => {
                                await apiRequest('PUT', `/api/people-on-orgs/${personOnOrg.id}`, {
                                  person: data.person,
                                  roles: data.roles.filter(role => role.role === 'Officer')
                                });
                                queryClient.invalidateQueries({ queryKey: ['/api/people-on-orgs'] });
                                toast({
                                  title: "Officer Updated",
                                  description: "Officer information has been updated successfully.",
                                });
                              }}
                              onCancel={() => {}}
                              isEditMode={true}
                              initialData={{
                                firstName: personOnOrg.person?.firstName || '',
                                lastName: personOnOrg.person?.lastName || '',
                                email: personOnOrg.person?.email || '',
                                roles: [{
                                  role: 'Officer' as const,
                                  title: personOnOrg.title || '',
                                  startAt: personOnOrg.startAt ? new Date(personOnOrg.startAt).toISOString().split('T')[0] : ''
                                }]
                              }}
                            />
                          </DialogContent>
                        </Dialog>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deletePersonMutation.mutate(personOnOrg.id)}
                          disabled={deletePersonMutation.isPending}
                          data-testid={`delete-officer-${personOnOrg.id}`}
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