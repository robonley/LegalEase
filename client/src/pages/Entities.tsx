import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertOrgSchema } from "@shared/schema";

const formSchema = insertOrgSchema.extend({
  registeredOffice: z.object({
    line1: z.string().min(1, "Address line 1 is required"),
    line2: z.string().optional(),
    city: z.string().min(1, "City is required"),
    region: z.string().min(1, "Province/State is required"),
    country: z.string().min(1, "Country is required"),
    postal: z.string().min(1, "Postal code is required"),
  }).optional(),
  recordsOffice: z.object({
    line1: z.string().min(1, "Address line 1 is required"),
    line2: z.string().optional(),
    city: z.string().min(1, "City is required"),
    region: z.string().min(1, "Province/State is required"),
    country: z.string().min(1, "Country is required"),
    postal: z.string().min(1, "Postal code is required"),
  }).optional(),
});

export default function Entities() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: orgs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/orgs"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      await apiRequest("POST", "/api/orgs", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orgs"] });
      setShowCreateDialog(false);
      toast({
        title: "Success",
        description: "Entity created successfully",
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      number: "",
      jurisdiction: "",
      formationAt: undefined,
      registeredOffice: {
        line1: "",
        line2: "",
        city: "",
        region: "",
        country: "",
        postal: "",
      },
      recordsOffice: {
        line1: "",
        line2: "",
        city: "",
        region: "",
        country: "",
        postal: "",
      },
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createMutation.mutate(data);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getEntityInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase();
  };

  const handleViewEntity = (entityId: string) => {
    // Navigate to entity detail view page
    setLocation(`/entities/${entityId}`);
  };

  const handleEditEntity = (entityId: string) => {
    // Navigate to entity edit page
    setLocation(`/entities/${entityId}/edit`);
  };

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Entities</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your legal entities and corporate structures
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button data-testid="create-entity-button">
                <i className="fas fa-plus mr-2"></i>
                Create Entity
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Entity</DialogTitle>
                <DialogDescription>
                  Add a new legal entity to your portfolio
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Entity Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-entity-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Registration Number</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} data-testid="input-registration-number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="jurisdiction"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jurisdiction</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-jurisdiction">
                                <SelectValue placeholder="Select jurisdiction" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="CBCA">CBCA (Federal Canada)</SelectItem>
                              <SelectItem value="OBCA">OBCA (Ontario)</SelectItem>
                              <SelectItem value="BCBCA">BCBCA (British Columbia)</SelectItem>
                              <SelectItem value="DE">Delaware</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="formationAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Formation Date</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                              onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                              data-testid="input-formation-date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Registered Office Address</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="registeredOffice.line1"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address Line 1</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-registered-line1" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="registeredOffice.line2"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Address Line 2</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-registered-line2" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="registeredOffice.city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-registered-city" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="registeredOffice.region"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Province/State</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-registered-region" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="registeredOffice.postal"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postal Code</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-registered-postal" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="registeredOffice.country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Canada" data-testid="input-registered-country" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreateDialog(false)}
                      data-testid="cancel-button"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      data-testid="submit-button"
                    >
                      {createMutation.isPending ? (
                        <>
                          <i className="fas fa-spinner fa-spin mr-2"></i>
                          Creating...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-plus mr-2"></i>
                          Create Entity
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Content */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <i className="fas fa-spinner fa-spin text-2xl text-muted-foreground"></i>
          </div>
        ) : orgs.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <i className="fas fa-building text-4xl text-muted-foreground mb-4"></i>
              <CardTitle className="mb-2">No entities yet</CardTitle>
              <CardDescription className="mb-4">
                Create your first legal entity to get started with corporate management
              </CardDescription>
              <Button
                onClick={() => setShowCreateDialog(true)}
                data-testid="create-first-entity-button"
              >
                <i className="fas fa-plus mr-2"></i>
                Create Your First Entity
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orgs.map((org: any) => (
              <Card key={org.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <span className="text-lg font-medium text-primary">
                        {getEntityInitials(org.name)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{org.name}</CardTitle>
                      <CardDescription>
                        {org.jurisdiction} • #{org.number || 'No number'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Formation Date:</span>
                      <span>{org.formationAt ? formatDate(org.formationAt) : 'Not set'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant="success">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Last Updated:</span>
                      <span className="text-xs">{formatDate(org.updatedAt)}</span>
                    </div>
                    
                    <div className="flex gap-2 pt-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1" 
                        onClick={() => handleViewEntity(org.id)}
                        data-testid={`view-entity-${org.id}`}
                      >
                        <i className="fas fa-eye mr-2"></i>
                        View
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1" 
                        onClick={() => handleEditEntity(org.id)}
                        data-testid={`edit-entity-${org.id}`}
                      >
                        <i className="fas fa-edit mr-2"></i>
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => toast({ title: "Feature coming soon", description: "Document generation will be available soon" })}
                        data-testid={`generate-docs-${org.id}`}
                      >
                        <i className="fas fa-file-download"></i>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
