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
import { insertPersonSchema, insertPersonOnOrgSchema } from "@shared/schema";

// Form schema combining person and roles
const personWithRolesSchema = z.object({
  person: insertPersonSchema.omit({ createdAt: true }).extend({
    address: z.object({
      line1: z.string().min(1, "Address line 1 is required"),
      line2: z.string().optional(),
      city: z.string().min(1, "City is required"),
      region: z.string().min(1, "Province/State is required"),
      country: z.string().min(1, "Country is required"),
      postal: z.string().min(1, "Postal code is required"),
    }).optional(),
  }),
  roles: z.array(
    insertPersonOnOrgSchema.omit({ 
      orgId: true, 
      personId: true 
    }).extend({
      role: z.enum(["Director", "Officer", "Shareholder"], {
        required_error: "Please select a role",
      }),
    })
  ).min(1, "At least one role is required"),
});

type PersonWithRolesForm = z.infer<typeof personWithRolesSchema>;

interface PersonFormProps {
  onSubmit: (data: { person: any; roles: any[] }) => void;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: Partial<PersonWithRolesForm>;
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

export function PersonForm({ onSubmit, onCancel, isLoading = false, initialData }: PersonFormProps) {
  const [includeAddress, setIncludeAddress] = useState(false);

  const form = useForm<PersonWithRolesForm>({
    resolver: zodResolver(personWithRolesSchema),
    defaultValues: {
      person: {
        firstName: "",
        lastName: "",
        email: "",
        dob: undefined,
        ...initialData?.person,
      },
      roles: initialData?.roles || [{ role: "Director" as const, title: "", startAt: new Date() }],
    },
  });

  const { fields: roleFields, append: appendRole, remove: removeRole } = useFieldArray({
    control: form.control,
    name: "roles",
  });

  const handleSubmit = (data: PersonWithRolesForm) => {
    const submitData = {
      person: {
        ...data.person,
        dob: data.person.dob || null,
      },
      roles: data.roles.map(role => ({
        ...role,
        startAt: role.startAt || new Date(),
      })),
    };
    
    onSubmit(submitData);
  };

  const addRole = () => {
    appendRole({ role: "Director" as const, title: "", startAt: new Date() });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="person.firstName"
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
                name="person.lastName"
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
              name="person.email"
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
              name="person.dob"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of Birth (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field}
                      value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                      onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                      data-testid="input-dob"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="include-address"
                  checked={includeAddress}
                  onChange={(e) => setIncludeAddress(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="include-address">Include address information</Label>
              </div>

              {includeAddress && (
                <div className="space-y-4 p-4 border rounded-lg">
                  <FormField
                    control={form.control}
                    name="person.address.line1"
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
                    name="person.address.line2"
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
                      name="person.address.city"
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
                      name="person.address.region"
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
                      name="person.address.country"
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
                      name="person.address.postal"
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
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Roles & Responsibilities</CardTitle>
              <Button type="button" variant="outline" onClick={addRole} data-testid="add-role-button">
                <i className="fas fa-plus mr-2"></i>
                Add Role
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

                <div className="grid grid-cols-2 gap-4">
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
                </div>

                <FormField
                  control={form.control}
                  name={`roles.${index}.startAt`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field}
                          value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : new Date())}
                          data-testid={`input-start-date-${index}`}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} data-testid="cancel-button">
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} data-testid="submit-button">
            {isLoading && <i className="fas fa-spinner fa-spin mr-2"></i>}
            Add Person
          </Button>
        </div>
      </form>
    </Form>
  );
}