import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEntityContext } from "@/hooks/useEntityContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Org } from "@shared/schema";

const corporateShareholderSchema = z.object({
  entityShareholderId: z.string().min(1, "Please select an entity"),
  shareClassId: z.string().min(1, "Please select a share class"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  certNumber: z.string().min(1, "Certificate number is required"),
  issuePrice: z.number().min(0, "Issue price must be 0 or greater").optional(),
  issueDate: z.string().min(1, "Issue date is required"),
});

type CorporateShareholderForm = z.infer<typeof corporateShareholderSchema>;

interface CorporateShareholderFormProps {
  onSubmit: (data: CorporateShareholderForm) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function CorporateShareholderForm({ onSubmit, onCancel, isLoading = false }: CorporateShareholderFormProps) {
  const { currentEntity } = useEntityContext();
  const { toast } = useToast();
  const [showNewEntityDialog, setShowNewEntityDialog] = useState(false);

  const form = useForm<CorporateShareholderForm>({
    resolver: zodResolver(corporateShareholderSchema),
    defaultValues: {
      entityShareholderId: "",
      shareClassId: "",
      quantity: 1,
      certNumber: "",
      issuePrice: 0,
      issueDate: new Date().toISOString().split('T')[0],
    },
  });

  // Fetch available entities (excluding current entity)
  const { data: entities = [] } = useQuery<Org[]>({
    queryKey: ["/api/orgs"],
    select: (data) => data.filter(org => org.id !== currentEntity?.id),
  });

  // Fetch share classes for current entity
  const { data: shareClasses = [] } = useQuery({
    queryKey: ["/api/orgs", currentEntity?.id, "share-classes"],
    enabled: !!currentEntity?.id,
  });

  const handleSubmit = (data: CorporateShareholderForm) => {
    onSubmit({
      ...data,
      issuePrice: data.issuePrice || 0,
    });
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Entity Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Corporate Shareholder</CardTitle>
              <CardDescription>
                Select an existing entity or create a new one to add as a shareholder
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="entityShareholderId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entity</FormLabel>
                    <div className="flex gap-2">
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-entity">
                            <SelectValue placeholder="Select an entity" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {entities.map((entity) => (
                            <SelectItem key={entity.id} value={entity.id}>
                              <div className="flex items-center gap-2">
                                <div>
                                  <div className="font-medium">{entity.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {entity.jurisdiction} • {entity.number || 'No corp number'}
                                  </div>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Dialog open={showNewEntityDialog} onOpenChange={setShowNewEntityDialog}>
                        <DialogTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            data-testid="quick-create-entity"
                          >
                            <i className="fas fa-plus mr-2"></i>
                            Quick Create
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Quick Create Entity</DialogTitle>
                            <DialogDescription>
                              Create a new entity to add as a shareholder. You can edit full details later.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="text-center p-8">
                            <i className="fas fa-building text-4xl text-muted-foreground mb-4"></i>
                            <p className="text-muted-foreground">
                              Quick entity creation will be implemented here.
                              For now, please create the entity in the Entities section first.
                            </p>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Show selected entity details */}
              {form.watch("entityShareholderId") && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      {(() => {
                        const selectedEntity = entities.find(e => e.id === form.watch("entityShareholderId"));
                        return selectedEntity ? (
                          <div>
                            <div className="font-medium">{selectedEntity.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {selectedEntity.jurisdiction} • Formed {selectedEntity.formationAt ? new Date(selectedEntity.formationAt).getFullYear() : 'Unknown'}
                            </div>
                          </div>
                        ) : null;
                      })()}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const selectedEntity = entities.find(e => e.id === form.watch("entityShareholderId"));
                        if (selectedEntity) {
                          window.open(`/entities/${selectedEntity.id}`, '_blank');
                        }
                      }}
                    >
                      <i className="fas fa-external-link-alt mr-2"></i>
                      View Entity
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Share Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Share Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="shareClassId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Share Class</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-share-class">
                            <SelectValue placeholder="Select share class" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {shareClasses.map((shareClass: any) => (
                            <SelectItem key={shareClass.id} value={shareClass.id}>
                              <div>
                                <div className="font-medium">{shareClass.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {shareClass.shortCode} • {shareClass.voting ? 'Voting' : 'Non-voting'}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Shares</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="1000"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-quantity"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="certNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Certificate Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="CERT-001"
                          {...field}
                          data-testid="input-cert-number"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="issuePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue Price (per share)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="1.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-issue-price"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="issueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          data-testid="input-issue-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} data-testid="submit-corporate-shareholder">
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Adding...
                </>
              ) : (
                <>
                  <i className="fas fa-building mr-2"></i>
                  Add Corporate Shareholder
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}