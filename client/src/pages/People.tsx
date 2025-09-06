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
import { useEntityContext } from "@/hooks/useEntityContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Person, PersonOnOrg } from "@shared/schema";
import { PersonForm } from "@/components/PersonForm";

interface PersonWithRoles extends Person {
  roles: PersonOnOrg[];
}

export default function People() {
  const { currentEntity } = useEntityContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: people = [], isLoading } = useQuery<PersonWithRoles[]>({
    queryKey: ["/api/orgs", currentEntity?.id, "people"],
    enabled: !!currentEntity?.id,
  });

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
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Person</DialogTitle>
                <DialogDescription>
                  Add a new person and assign their roles within {currentEntity.name}.
                </DialogDescription>
              </DialogHeader>
              <PersonForm 
                onSubmit={(data) => createPersonMutation.mutate(data)}
                onCancel={() => setIsCreateDialogOpen(false)}
                isLoading={createPersonMutation.isPending}
              />
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
                    <TableHead>Date Added</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPeople.map((person) => (
                    <TableRow key={person.id} data-testid={`person-row-${person.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-foreground">
                              {person.firstName[0]}{person.lastName[0]}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">
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
                              className="text-xs"
                            >
                              {role.title || role.role}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">
                          {formatDate(person.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            data-testid={`view-person-${person.id}`}
                          >
                            <i className="fas fa-eye"></i>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            data-testid={`edit-person-${person.id}`}
                          >
                            <i className="fas fa-edit"></i>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
