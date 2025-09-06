import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertOrgSchema } from "@shared/schema";
import { useEntityContext } from "@/hooks/useEntityContext";

const formSchema = insertOrgSchema.omit({ 
  createdById: true, 
  createdAt: true, 
  updatedAt: true,
  registeredOfficeId: true,
  recordsOfficeId: true
});

export default function EntityEdit() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setCurrentEntity } = useEntityContext();

  const { data: entity, isLoading } = useQuery({
    queryKey: ["/api/orgs", id],
    enabled: !!id,
  });

  // Track this entity as recently accessed when data loads
  useEffect(() => {
    if (entity) {
      setCurrentEntity({
        id: entity.id,
        name: entity.name,
        jurisdiction: entity.jurisdiction,
        number: entity.number
      });
    }
  }, [entity, setCurrentEntity]);

  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      await apiRequest("PUT", `/api/orgs/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orgs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orgs", id] });
      toast({
        title: "Success",
        description: "Entity updated successfully",
      });
      setLocation(`/entities/${id}`);
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
    },
  });

  // Populate form when entity data loads
  useEffect(() => {
    if (entity) {
      form.reset({
        name: entity.name || "",
        number: entity.number || "",
        jurisdiction: entity.jurisdiction || "",
        formationAt: entity.formationAt ? new Date(entity.formationAt) : undefined,
      });
    }
  }, [entity, form]);

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    updateMutation.mutate(data);
  };

  const getEntityInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="flex items-center justify-center py-12">
          <i className="fas fa-spinner fa-spin text-2xl text-muted-foreground"></i>
        </div>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <Card>
            <CardContent className="p-12 text-center">
              <i className="fas fa-exclamation-triangle text-4xl text-muted-foreground mb-4"></i>
              <CardTitle className="mb-2">Entity not found</CardTitle>
              <CardDescription className="mb-4">
                The requested entity could not be found.
              </CardDescription>
              <Button onClick={() => setLocation('/entities')}>
                Back to Entities
              </Button>
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
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation(`/entities/${id}`)}
              data-testid="back-button"
            >
              <i className="fas fa-arrow-left mr-2"></i>
              Back to Entity
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <span className="text-lg font-medium text-primary">
                  {getEntityInitials(entity.name)}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-semibold">Edit {entity.name}</h1>
                <p className="text-sm text-muted-foreground">
                  Modify entity details and information
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Entity Information</CardTitle>
            <CardDescription>
              Update the core details for this legal entity
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                        <Select onValueChange={field.onChange} value={field.value}>
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

                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation(`/entities/${id}`)}
                    data-testid="cancel-button"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                    data-testid="save-button"
                  >
                    {updateMutation.isPending ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save mr-2"></i>
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}