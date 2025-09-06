import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

// Simple form schema
const personWithRolesSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  dob: z.string().optional(),
  // Address fields
  includeAddress: z.boolean().default(false),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  postal: z.string().optional(),
  // Roles
  roles: z.array(z.object({
    role: z.enum(["Director", "Officer", "Shareholder"]),
    title: z.string().optional(),
    startAt: z.string().optional(),
    // Shareholder-specific fields
    shareQuantity: z.string().optional(),
    shareType: z.enum(["Common", "Preferred"]).optional(),
    shareClass: z.string().optional(),
  })).min(1, "At least one role is required"),
});

type PersonWithRolesForm = z.infer<typeof personWithRolesSchema>;

interface PersonFormProps {
  onSubmit: (data: { person: any; roles: any[] }) => void;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: Partial<PersonWithRolesForm>;
  hideButtons?: boolean;
  mode?: "create" | "edit";
}

const roleOptions = [
  { value: "Director", label: "Director", description: "Board member with governance responsibilities" },
  { value: "Officer", label: "Officer", description: "Executive role (CEO, CFO, Secretary, etc.)" },
  { value: "Shareholder", label: "Shareholder", description: "Equity holder in the company" },
];

const officerTitles = [
  "Chief Executive Officer",
  "Chief Financial Officer", 
  "Chief Operating Officer",
  "Chief Technology Officer",
  "President",
  "Vice President",
  "Secretary",
  "Treasurer",
  "Other",
];

export function PersonForm({ onSubmit, onCancel, isLoading = false, initialData, hideButtons = false, mode }: PersonFormProps) {
  const form = useForm<PersonWithRolesForm>({
    resolver: zodResolver(personWithRolesSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      dob: "",
      includeAddress: false,
      addressLine1: "",
      addressLine2: "",
      city: "",
      region: "",
      country: "",
      postal: "",
      roles: [
        { role: "Director", title: "", startAt: new Date().toISOString().split('T')[0] },
        { role: "Shareholder", title: "", startAt: new Date().toISOString().split('T')[0], shareQuantity: "", shareType: "Common", shareClass: "" }
      ] as any,
    },
  });

  const includeAddress = form.watch("includeAddress");

  const { fields: roleFields, append: appendRole, remove: removeRole } = useFieldArray({
    control: form.control,
    name: "roles",
  });

  const handleSubmit = (data: PersonWithRolesForm) => {
    const submitData = {
      person: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || undefined,
        dob: data.dob ? new Date(data.dob) : null,
        address: data.includeAddress ? {
          line1: data.addressLine1!,
          line2: data.addressLine2 || undefined,
          city: data.city!,
          region: data.region!,
          country: data.country!,
          postal: data.postal!,
        } : undefined,
      },
      roles: data.roles.map(role => ({
        role: role.role,
        title: role.title || undefined,
        startAt: role.startAt || new Date().toISOString(),
        // Include shareholder-specific data if applicable
        ...(role.role === "Shareholder" && {
          shareQuantity: role.shareQuantity ? Number(role.shareQuantity) : undefined,
          shareType: role.shareType,
          shareClass: role.shareClass || undefined,
        }),
      })),
    };
    
    onSubmit(submitData);
  };

  const addRole = () => {
    appendRole({ role: "Director" as const, title: "", startAt: new Date().toISOString().split('T')[0] });
  };

  return (
    <Form {...form}>
      <form id="person-form" onSubmit={form.handleSubmit(handleSubmit as any)} className="space-y-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} data-testid="input-first-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} data-testid="input-last-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="john.doe@example.com" 
                      {...field} 
                      data-testid="input-email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dob"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field}
                      data-testid="input-dob"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address Section */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="includeAddress"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="rounded"
                      />
                    </FormControl>
                    <FormLabel>Include address information</FormLabel>
                  </FormItem>
                )}
              />

              {includeAddress && (
                <div className="space-y-4 p-4 border rounded-lg">
                  <FormField
                    control={form.control}
                    name="addressLine1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address Line 1</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main Street" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="addressLine2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address Line 2 (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Suite 100" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="Toronto" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="region"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Province/State</FormLabel>
                          <FormControl>
                            <Input placeholder="ON" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input placeholder="Canada" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="postal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postal Code</FormLabel>
                          <FormControl>
                            <Input placeholder="M5V 3A8" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Roles Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Roles & Responsibilities</CardTitle>
            <div className="flex flex-wrap items-center gap-4 pt-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="quick-director"
                  checked={form.watch("roles").some(r => r.role === "Director")}
                  onChange={(e) => {
                    const roles = form.getValues("roles");
                    if (e.target.checked) {
                      if (!roles.some(r => r.role === "Director")) {
                        form.setValue("roles", [...roles, { 
                          role: "Director" as const, 
                          title: "", 
                          startAt: new Date().toISOString().split('T')[0] 
                        }]);
                      }
                    } else {
                      form.setValue("roles", roles.filter(r => r.role !== "Director"));
                    }
                  }}
                  className="rounded"
                />
                <label htmlFor="quick-director" className="text-sm font-medium">Director</label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="quick-shareholder"
                  checked={form.watch("roles").some(r => r.role === "Shareholder")}
                  onChange={(e) => {
                    const roles = form.getValues("roles");
                    if (e.target.checked) {
                      if (!roles.some(r => r.role === "Shareholder")) {
                        form.setValue("roles", [...roles, { 
                          role: "Shareholder" as const, 
                          title: "", 
                          startAt: new Date().toISOString().split('T')[0],
                          shareQuantity: "",
                          shareType: "Common" as const,
                          shareClass: ""
                        }]);
                      }
                    } else {
                      form.setValue("roles", roles.filter(r => r.role !== "Shareholder"));
                    }
                  }}
                  className="rounded"
                />
                <label htmlFor="quick-shareholder" className="text-sm font-medium">Shareholder</label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="quick-officer"
                  checked={form.watch("roles").some(r => r.role === "Officer")}
                  onChange={(e) => {
                    const roles = form.getValues("roles");
                    if (e.target.checked) {
                      if (!roles.some(r => r.role === "Officer")) {
                        form.setValue("roles", [...roles, { 
                          role: "Officer" as const, 
                          title: "", 
                          startAt: new Date().toISOString().split('T')[0] 
                        }]);
                      }
                    } else {
                      form.setValue("roles", roles.filter(r => r.role !== "Officer"));
                    }
                  }}
                  className="rounded"
                />
                <label htmlFor="quick-officer" className="text-sm font-medium">Officer</label>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addRole} data-testid="add-role-button">
                <i className="fas fa-plus mr-2"></i>
                Add Custom Role
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {roleFields.map((field, index) => (
              <div key={field.id} className="p-4 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">Role {index + 1}</Badge>
                  {roleFields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRole(index)}
                      data-testid={`remove-role-${index}`}
                    >
                      <i className="fas fa-trash"></i>
                    </Button>
                  )}
                </div>

                <div className={form.watch(`roles.${index}.role`) === "Shareholder" ? "grid grid-cols-1 gap-4" : "grid grid-cols-2 gap-4"}>
                  <FormField
                    control={form.control}
                    name={`roles.${index}.role`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid={`select-role-${index}`}>
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roleOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                <div>
                                  <div className="font-medium">{option.label}</div>
                                  <div className="text-xs text-muted-foreground">{option.description}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch(`roles.${index}.role`) !== "Shareholder" && (
                    <FormField
                      control={form.control}
                      name={`roles.${index}.title`}
                      render={({ field }) => {
                        const selectedRole = form.watch(`roles.${index}.role`);
                        return (
                          <FormItem>
                            <FormLabel>
                              {selectedRole === "Officer" ? "Officer Title" : "Specific Title (Optional)"}
                            </FormLabel>
                            {selectedRole === "Officer" ? (
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid={`select-title-${index}`}>
                                    <SelectValue placeholder="Select officer title" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {officerTitles.map((title) => (
                                    <SelectItem key={title} value={title}>
                                      {title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <FormControl>
                                <Input 
                                  placeholder={selectedRole === "Director" ? "Lead Director" : "Title"}
                                  {...field}
                                  data-testid={`input-title-${index}`}
                                />
                              </FormControl>
                            )}
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  )}
                </div>

                <FormField
                  control={form.control}
                  name={`roles.${index}.startAt`}
                  render={({ field }) => {
                    const selectedRole = form.watch(`roles.${index}.role`);
                    const isShareHolder = selectedRole === "Shareholder";
                    return (
                      <FormItem>
                        <FormLabel>{isShareHolder ? "Share Issue Date" : "Start Date"}</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field}
                            data-testid={`input-start-date-${index}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                {/* Shareholder-specific fields */}
                {form.watch(`roles.${index}.role`) === "Shareholder" && (
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                    <FormField
                      control={form.control}
                      name={`roles.${index}.shareQuantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Shares</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              placeholder="1000"
                              {...field}
                              data-testid={`input-share-quantity-${index}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`roles.${index}.shareType`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Share Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid={`select-share-type-${index}`}>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Common">Common</SelectItem>
                              <SelectItem value="Preferred">Preferred</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`roles.${index}.shareClass`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Share Class</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Class A"
                              {...field}
                              data-testid={`input-share-class-${index}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Form Actions */}
        {!hideButtons && (
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onCancel} data-testid="cancel-button">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} data-testid="submit-button">
              {isLoading && <i className="fas fa-spinner fa-spin mr-2"></i>}
              Add Person
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}