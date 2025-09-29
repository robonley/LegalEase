import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Building, Search, Loader2 } from "lucide-react";
import { format } from "date-fns";

const createRelationshipSchema = z.object({
  relationshipType: z.enum(["subsidiary", "parent", "sister", "related", "joint_venture"], {
    required_error: "Please select a relationship type"
  }),
  relatedEntityId: z.string().min(1, "Please select a related entity"),
  ownershipPercentage: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val === "") return true;
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0 && num <= 100;
      },
      "Ownership percentage must be between 0 and 100"
    ),
  effectiveDate: z.date().optional(),
  endDate: z.date().optional(),
  notes: z.string().optional(),
}).refine(
  (data) => {
    if (data.effectiveDate && data.endDate) {
      return data.effectiveDate <= data.endDate;
    }
    return true;
  },
  {
    message: "End date must be after effective date",
    path: ["endDate"],
  }
);

interface CreateRelationshipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentOrgId: string;
  currentOrgName: string;
}

const relationshipTypeOptions = [
  { value: "subsidiary", label: "Subsidiary", description: "Entity controlled by current organization" },
  { value: "parent", label: "Parent Company", description: "Entity that controls current organization" },
  { value: "sister", label: "Sister Company", description: "Entity under common control" },
  { value: "related", label: "Related Entity", description: "Related through ownership or control" },
  { value: "joint_venture", label: "Joint Venture", description: "Jointly controlled entity" }
];

export function CreateRelationshipDialog({
  open,
  onOpenChange,
  currentOrgId,
  currentOrgName
}: CreateRelationshipDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [entitySearchTerm, setEntitySearchTerm] = useState("");

  const form = useForm<z.infer<typeof createRelationshipSchema>>({
    resolver: zodResolver(createRelationshipSchema),
    defaultValues: {
      relationshipType: undefined,
      relatedEntityId: "",
      ownershipPercentage: "",
      effectiveDate: undefined,
      endDate: undefined,
      notes: "",
    },
  });

  // Fetch available entities for selection (excluding current org)
  const { data: entities = [], isLoading: entitiesLoading } = useQuery({
    queryKey: ["/api/orgs"],
    select: (data: any[]) => data.filter(org => org.id !== currentOrgId)
  });

  // Filter entities based on search term
  const filteredEntities = entities.filter((entity: any) =>
    entity.name.toLowerCase().includes(entitySearchTerm.toLowerCase()) ||
    entity.jurisdiction.toLowerCase().includes(entitySearchTerm.toLowerCase()) ||
    (entity.number && entity.number.toLowerCase().includes(entitySearchTerm.toLowerCase()))
  );

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createRelationshipSchema>) => {
      const relationshipData = {
        parentEntityId: data.relationshipType === "parent" ? data.relatedEntityId : currentOrgId,
        childEntityId: data.relationshipType === "parent" ? currentOrgId : data.relatedEntityId,
        relationshipType: data.relationshipType,
        ownershipPercentage: data.ownershipPercentage ? parseFloat(data.ownershipPercentage) : null,
        effectiveDate: data.effectiveDate?.toISOString() || null,
        endDate: data.endDate?.toISOString() || null,
        notes: data.notes || null,
      };

      return await apiRequest("POST", "/api/entity-relationships", relationshipData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entity-relationships", currentOrgId] });
      toast({
        title: "Success",
        description: "Entity relationship created successfully",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof createRelationshipSchema>) => {
    createMutation.mutate(data);
  };

  const handleCancel = () => {
    form.reset();
    setEntitySearchTerm("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Create Entity Relationship
          </DialogTitle>
          <DialogDescription>
            Add a new relationship between <strong>{currentOrgName}</strong> and another entity. 
            This helps track corporate structures and ownership relationships.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Relationship Type */}
            <FormField
              control={form.control}
              name="relationshipType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Relationship Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-relationship-type">
                        <SelectValue placeholder="Select relationship type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {relationshipTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{option.label}</span>
                            <span className="text-sm text-muted-foreground">{option.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select how this entity relates to {currentOrgName}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Related Entity Selection */}
            <FormField
              control={form.control}
              name="relatedEntityId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Related Entity</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-related-entity">
                        <SelectValue placeholder="Select an entity" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <div className="p-2">
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search entities..."
                            value={entitySearchTerm}
                            onChange={(e) => setEntitySearchTerm(e.target.value)}
                            className="pl-8"
                            data-testid="input-entity-search"
                          />
                        </div>
                      </div>
                      {entitiesLoading ? (
                        <div className="flex items-center justify-center p-4">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="ml-2">Loading entities...</span>
                        </div>
                      ) : filteredEntities.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                          {entitySearchTerm ? "No entities found matching your search" : "No other entities available"}
                        </div>
                      ) : (
                        filteredEntities.map((entity: any) => (
                          <SelectItem key={entity.id} value={entity.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{entity.name}</span>
                              <span className="text-sm text-muted-foreground">
                                {entity.jurisdiction}
                                {entity.number && ` • ${entity.number}`}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose the entity to create a relationship with
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Ownership Percentage */}
            <FormField
              control={form.control}
              name="ownershipPercentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ownership Percentage (Optional)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        placeholder="0.00"
                        className="pr-8"
                        data-testid="input-ownership-percentage"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        %
                      </span>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Enter the ownership percentage (0-100)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date Fields */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="effectiveDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Effective Date (Optional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full pl-3 text-left font-normal"
                            data-testid="button-effective-date"
                          >
                            {field.value ? (
                              format(field.value, "MMM dd, yyyy")
                            ) : (
                              <span className="text-muted-foreground">Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      When the relationship became effective
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date (Optional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full pl-3 text-left font-normal"
                            data-testid="button-end-date"
                          >
                            {field.value ? (
                              format(field.value, "MMM dd, yyyy")
                            ) : (
                              <span className="text-muted-foreground">Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => {
                            const effectiveDate = form.getValues("effectiveDate");
                            return effectiveDate ? date < effectiveDate : false;
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      When the relationship ended (leave empty if active)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Add any additional details about this relationship..."
                      className="min-h-[100px]"
                      data-testid="textarea-notes"
                    />
                  </FormControl>
                  <FormDescription>
                    Additional information about the relationship
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={createMutation.isPending}
                data-testid="button-cancel-relationship"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                data-testid="button-create-relationship"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Relationship"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}