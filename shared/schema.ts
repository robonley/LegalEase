import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  decimal,
  json,
  index,
  jsonb
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("lawyer"), // admin, lawyer, readonly
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionStatus: varchar("subscription_status").default("inactive"), // active, inactive, canceled, past_due
  subscriptionTier: varchar("subscription_tier").default("starter"), // starter, professional, enterprise
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const addresses = pgTable("addresses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  line1: text("line1").notNull(),
  line2: text("line2"),
  city: text("city").notNull(),
  region: text("region").notNull(), // province/state
  country: text("country").notNull(),
  postal: text("postal").notNull(),
});

export const orgs = pgTable("orgs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  number: text("number"), // registration/corp number
  companyKey: text("company_key"), // secure key for the company
  jurisdiction: text("jurisdiction").notNull(), // e.g., "CBCA", "OBCA", "DE"
  formationAt: timestamp("formation_at"),
  // Amendment fields
  amendmentDate: timestamp("amendment_date"),
  previousCorporationName: text("previous_corporation_name"),
  amendmentDetails: text("amendment_details"),
  registeredOfficeId: varchar("registered_office_id").references(() => addresses.id),
  recordsOfficeId: varchar("records_office_id").references(() => addresses.id),
  mailingAddressId: varchar("mailing_address_id").references(() => addresses.id),
  // Authorized Representative fields
  authRepName: text("auth_rep_name"),
  authRepCompany: text("auth_rep_company"),
  authRepAddressId: varchar("auth_rep_address_id").references(() => addresses.id),
  authRepEmail: text("auth_rep_email"),
  authRepPhone: text("auth_rep_phone"),
  // Annual Return fields
  annualReturnDueAt: timestamp("annual_return_due_at"),
  annualReturnReminderEmail: text("annual_return_reminder_email"),
  annualReturnReminderDays: integer("annual_return_reminder_days").default(30), // Days before due date to send reminder
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const people = pgTable("people", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  dob: timestamp("dob"),
  addressId: varchar("address_id").references(() => addresses.id),
  kycId: text("kyc_id"), // external ref
  createdAt: timestamp("created_at").defaultNow(),
});

export const personOnOrgs = pgTable("person_on_orgs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => orgs.id),
  personId: varchar("person_id").notNull().references(() => people.id),
  role: text("role").notNull(), // "Director" | "Officer" | "Shareholder"
  title: text("title"), // e.g., "President"
  startAt: timestamp("start_at"),
  endAt: timestamp("end_at"),
});

export const shareClasses = pgTable("share_classes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => orgs.id),
  name: text("name").notNull(), // "Class A Common"
  shortCode: text("short_code").notNull(), // "A"
  voting: boolean("voting").notNull().default(true),
  participating: boolean("participating").notNull().default(true),
  redemption: boolean("redemption").notNull().default(false),
  specialRights: text("special_rights"), // free text
});

export const shareIssuances = pgTable("share_issuances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => orgs.id),
  shareholderType: text("shareholder_type").notNull().default("person"), // "person" | "entity"
  shareholderId: varchar("shareholder_id").references(() => people.id), // for individual shareholders
  entityShareholderId: varchar("entity_shareholder_id").references(() => orgs.id), // for corporate shareholders
  shareClassId: varchar("share_class_id").notNull().references(() => shareClasses.id),
  quantity: integer("quantity").notNull(),
  certNumber: text("cert_number").notNull(),
  issuePrice: decimal("issue_price", { precision: 10, scale: 2 }),
  issueDate: timestamp("issue_date").notNull(),
});

export const shareTransfers = pgTable("share_transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => orgs.id),
  fromPersonId: varchar("from_person_id").references(() => people.id),
  toPersonId: varchar("to_person_id").notNull().references(() => people.id),
  shareClassId: varchar("share_class_id").notNull().references(() => shareClasses.id),
  quantity: integer("quantity").notNull(),
  transferDate: timestamp("transfer_date").notNull(),
  consideration: decimal("consideration", { precision: 10, scale: 2 }),
  certFrom: text("cert_from"),
  certTo: text("cert_to"),
});

export const templates = pgTable("templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // "Bylaw No.1 (CBCA)"
  code: text("code").notNull(), // "BYLAW_CBCA_1"
  scope: text("scope").notNull(), // "organization" | "annual" | "resolution" | "register"
  category: text("category"), // "minute-book" | "resolution" | "register"
  fileKey: text("file_key"), // storage key for .docx (nullable for placeholder templates)
  schema: json("schema").notNull(), // required fields map
  variables: json("variables").notNull().default('{}'), // extracted template variables
  isStarter: boolean("is_starter").notNull().default(false), // app-wide starter template
  ownerId: varchar("owner_id").references(() => users.id),
  description: text("description"), // template description
  createdAt: timestamp("created_at").defaultNow(),
});

export const generatedDocs = pgTable("generated_docs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => orgs.id),
  templateId: varchar("template_id").notNull().references(() => templates.id),
  fileKey: text("file_key").notNull(), // output .docx
  pdfKey: text("pdf_key"),
  content: text("content"), // rich text content for editing
  dataUsed: json("data_used").notNull(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").references(() => orgs.id),
  actorId: varchar("actor_id").notNull().references(() => users.id),
  action: text("action").notNull(), // e.g., "UPDATE_CAP_TABLE", "UPDATE_ENTITY", "CREATE_PERSON"
  entityType: text("entity_type"), // "organization", "person", "share_class", etc.
  entityId: varchar("entity_id"), // ID of the affected entity
  fieldChanges: json("field_changes"), // {"field_name": {"old": "value", "new": "value"}}
  payload: json("payload").notNull(), // Full context data
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orgNotes = pgTable("org_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => orgs.id),
  content: text("content").notNull(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Minute Book Management
export const minuteBooks = pgTable("minute_books", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => orgs.id),
  name: text("name").notNull(), // "2024 Annual Minute Book"
  type: text("type").notNull(), // "incorporation" | "annual" | "special" | "full"
  status: text("status").notNull().default("draft"), // "draft" | "generating" | "ready" | "error"
  fiscalYear: integer("fiscal_year"), // 2024
  description: text("description"),
  bundleFileKey: text("bundle_file_key"), // combined PDF/ZIP file
  generationData: json("generation_data"), // entity data at time of generation
  // Corporate Formation Support
  isPreConfigured: boolean("is_pre_configured").default(false), // true for corporate formation, false for template-based
  formationConfig: json("formation_config"), // CorporateFormationConfig for pre-configured minute books
  selectedResolutions: text("selected_resolutions").array(), // array of resolution IDs for pre-configured books
  resolutionCustomizations: json("resolution_customizations"), // customization values for resolution fields
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const minuteBookDocs = pgTable("minute_book_docs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  minuteBookId: varchar("minute_book_id").notNull().references(() => minuteBooks.id),
  templateId: varchar("template_id").notNull().references(() => templates.id),
  generatedDocId: varchar("generated_doc_id").references(() => generatedDocs.id),
  sortOrder: integer("sort_order").notNull().default(0),
  status: text("status").notNull().default("pending"), // "pending" | "generated" | "error"
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const orgsRelations = relations(orgs, ({ one, many }) => ({
  registeredOffice: one(addresses, {
    fields: [orgs.registeredOfficeId],
    references: [addresses.id],
    relationName: "registeredOffice",
  }),
  recordsOffice: one(addresses, {
    fields: [orgs.recordsOfficeId],
    references: [addresses.id],
    relationName: "recordsOffice",
  }),
  mailingAddress: one(addresses, {
    fields: [orgs.mailingAddressId],
    references: [addresses.id],
    relationName: "mailingAddress",
  }),
  authRepAddress: one(addresses, {
    fields: [orgs.authRepAddressId],
    references: [addresses.id],
    relationName: "authRepAddress",
  }),
  createdBy: one(users, {
    fields: [orgs.createdById],
    references: [users.id],
  }),
  people: many(personOnOrgs),
  shareClasses: many(shareClasses),
  shareIssuances: many(shareIssuances),
  shareTransfers: many(shareTransfers),
  generatedDocs: many(generatedDocs),
  auditLogs: many(auditLogs),
  notes: many(orgNotes),
  // Entity shareholdings - where this org holds shares in other entities
  entityShareholdings: many(shareIssuances, { relationName: "entityShareholder" }),
  minuteBooks: many(minuteBooks),
}));

export const peopleRelations = relations(people, ({ one, many }) => ({
  address: one(addresses, {
    fields: [people.addressId],
    references: [addresses.id],
  }),
  orgRoles: many(personOnOrgs),
  shareIssuances: many(shareIssuances),
  transfersFrom: many(shareTransfers, { relationName: "transfersFrom" }),
  transfersTo: many(shareTransfers, { relationName: "transfersTo" }),
}));

export const personOnOrgsRelations = relations(personOnOrgs, ({ one }) => ({
  org: one(orgs, {
    fields: [personOnOrgs.orgId],
    references: [orgs.id],
  }),
  person: one(people, {
    fields: [personOnOrgs.personId],
    references: [people.id],
  }),
}));

export const shareClassesRelations = relations(shareClasses, ({ one, many }) => ({
  org: one(orgs, {
    fields: [shareClasses.orgId],
    references: [orgs.id],
  }),
  issuances: many(shareIssuances),
  transfers: many(shareTransfers),
}));

export const shareIssuancesRelations = relations(shareIssuances, ({ one }) => ({
  org: one(orgs, {
    fields: [shareIssuances.orgId],
    references: [orgs.id],
  }),
  shareholder: one(people, {
    fields: [shareIssuances.shareholderId],
    references: [people.id],
    relationName: "individualShareholder",
  }),
  entityShareholder: one(orgs, {
    fields: [shareIssuances.entityShareholderId],
    references: [orgs.id],
    relationName: "entityShareholder",
  }),
  shareClass: one(shareClasses, {
    fields: [shareIssuances.shareClassId],
    references: [shareClasses.id],
  }),
}));

export const shareTransfersRelations = relations(shareTransfers, ({ one }) => ({
  org: one(orgs, {
    fields: [shareTransfers.orgId],
    references: [orgs.id],
  }),
  fromPerson: one(people, {
    fields: [shareTransfers.fromPersonId],
    references: [people.id],
    relationName: "transfersFrom",
  }),
  toPerson: one(people, {
    fields: [shareTransfers.toPersonId],
    references: [people.id],
    relationName: "transfersTo",
  }),
  shareClass: one(shareClasses, {
    fields: [shareTransfers.shareClassId],
    references: [shareClasses.id],
  }),
}));

export const templatesRelations = relations(templates, ({ one, many }) => ({
  owner: one(users, {
    fields: [templates.ownerId],
    references: [users.id],
  }),
  generatedDocs: many(generatedDocs),
}));

export const generatedDocsRelations = relations(generatedDocs, ({ one, many }) => ({
  org: one(orgs, {
    fields: [generatedDocs.orgId],
    references: [orgs.id],
  }),
  template: one(templates, {
    fields: [generatedDocs.templateId],
    references: [templates.id],
  }),
  createdBy: one(users, {
    fields: [generatedDocs.createdBy],
    references: [users.id],
  }),
  minuteBookDocs: many(minuteBookDocs),
}));

export const minuteBooksRelations = relations(minuteBooks, ({ one, many }) => ({
  org: one(orgs, {
    fields: [minuteBooks.orgId],
    references: [orgs.id],
  }),
  createdBy: one(users, {
    fields: [minuteBooks.createdBy],
    references: [users.id],
  }),
  docs: many(minuteBookDocs),
}));

export const minuteBookDocsRelations = relations(minuteBookDocs, ({ one }) => ({
  minuteBook: one(minuteBooks, {
    fields: [minuteBookDocs.minuteBookId],
    references: [minuteBooks.id],
  }),
  template: one(templates, {
    fields: [minuteBookDocs.templateId],
    references: [templates.id],
  }),
  generatedDoc: one(generatedDocs, {
    fields: [minuteBookDocs.generatedDocId],
    references: [generatedDocs.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  org: one(orgs, {
    fields: [auditLogs.orgId],
    references: [orgs.id],
  }),
  actor: one(users, {
    fields: [auditLogs.actorId],
    references: [users.id],
  }),
}));

export const orgNotesRelations = relations(orgNotes, ({ one }) => ({
  org: one(orgs, {
    fields: [orgNotes.orgId],
    references: [orgs.id],
  }),
  createdBy: one(users, {
    fields: [orgNotes.createdBy],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertAddressSchema = createInsertSchema(addresses);
export const insertOrgSchema = createInsertSchema(orgs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertPersonSchema = createInsertSchema(people).omit({
  id: true,
  createdAt: true,
});
export const insertPersonOnOrgSchema = createInsertSchema(personOnOrgs).omit({
  id: true,
});
export const insertShareClassSchema = createInsertSchema(shareClasses).omit({
  id: true,
});
export const insertShareIssuanceSchema = createInsertSchema(shareIssuances).omit({
  id: true,
});
export const insertShareTransferSchema = createInsertSchema(shareTransfers).omit({
  id: true,
});
export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  createdAt: true,
});
export const insertGeneratedDocSchema = createInsertSchema(generatedDocs).omit({
  id: true,
  createdAt: true,
});
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});
export const insertOrgNoteSchema = createInsertSchema(orgNotes).omit({
  id: true,
  createdAt: true,
});

export const insertMinuteBookSchema = createInsertSchema(minuteBooks).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertMinuteBookDocSchema = createInsertSchema(minuteBookDocs).omit({
  id: true,
  createdAt: true
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Core types
export type Org = typeof orgs.$inferSelect;
export type InsertOrg = typeof orgs.$inferInsert;

export type Person = typeof people.$inferSelect;
export type InsertPerson = typeof people.$inferInsert;

export type PersonOnOrg = typeof personOnOrgs.$inferSelect;
export type InsertPersonOnOrg = typeof personOnOrgs.$inferInsert;

export type Address = typeof addresses.$inferSelect;
export type InsertAddress = typeof addresses.$inferInsert;

export type ShareClass = typeof shareClasses.$inferSelect;
export type InsertShareClass = typeof shareClasses.$inferInsert;

export type ShareIssuance = typeof shareIssuances.$inferSelect;
export type InsertShareIssuance = typeof shareIssuances.$inferInsert;

export type ShareTransfer = typeof shareTransfers.$inferSelect;
export type InsertShareTransfer = typeof shareTransfers.$inferInsert;

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = typeof templates.$inferInsert;

export type GeneratedDoc = typeof generatedDocs.$inferSelect;
export type InsertGeneratedDoc = typeof generatedDocs.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

export type OrgNote = typeof orgNotes.$inferSelect;
export type InsertOrgNote = typeof orgNotes.$inferInsert;

// Minute Book types
export type MinuteBook = typeof minuteBooks.$inferSelect;
export type InsertMinuteBook = z.infer<typeof insertMinuteBookSchema>;

export type MinuteBookDoc = typeof minuteBookDocs.$inferSelect;
export type InsertMinuteBookDoc = z.infer<typeof insertMinuteBookDocSchema>;

// Ingestion Jobs and Results
export const ingestionJobs = pgTable("ingestion_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  filename: text("filename").notNull(),
  fileKey: text("file_key").notNull(), // storage key for uploaded file
  status: text("status").notNull().default("queued"), // queued, processing, completed, failed
  progress: integer("progress").default(0), // 0-100
  errorMessage: text("error_message"),
  extractionResult: jsonb("extraction_result"), // stores ExtractionResult JSON
  tokensUsed: integer("tokens_used").default(0),
  processingTimeMs: integer("processing_time_ms"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Extraction data types (not stored in DB, used for API responses)
export const extractedOrganizationSchema = z.object({
  legalName: z.string().optional(),
  number: z.string().optional(),
  jurisdiction: z.string().optional(),
  formationDate: z.string().optional(), // ISO date
  registeredOffice: z.string().optional(),
  recordsOffice: z.string().optional(),
});

export const extractedPersonSchema = z.object({
  fullName: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  email: z.string().optional(),
  isDirector: z.boolean().optional(),
  isOfficer: z.boolean().optional(),
  officerTitle: z.string().optional(),
  isShareholder: z.boolean().optional(),
  shareClass: z.string().optional(),
  shareSeries: z.string().optional(),
  shares: z.number().optional(),
  issueDate: z.string().optional(), // ISO date
});

export const extractionResultSchema = z.object({
  organization: extractedOrganizationSchema,
  people: z.array(extractedPersonSchema),
  shareholders: z.array(extractedPersonSchema),
  confidence: z.number().min(0).max(1),
  confidences: z.record(z.string(), z.number().min(0).max(1)).optional(),
  sourceMeta: z.object({
    filename: z.string(),
    pages: z.number(),
  }),
});

export const insertIngestionJobSchema = createInsertSchema(ingestionJobs).omit({
  id: true,
  createdAt: true,
});

export type IngestionJob = typeof ingestionJobs.$inferSelect;
export type InsertIngestionJob = z.infer<typeof insertIngestionJobSchema>;
export type ExtractedOrganization = z.infer<typeof extractedOrganizationSchema>;
export type ExtractedPerson = z.infer<typeof extractedPersonSchema>;
export type ExtractionResult = z.infer<typeof extractionResultSchema>;

// Document Editor types
export interface PersonWithRoles extends Person {
  roles: PersonOnOrg[];
}

export interface EntityData {
  organization: Org;
  people: PersonWithRoles[];
  shareClasses: ShareClass[];
  shareIssuances: ShareIssuance[];
  addresses: Address[];
}

// Corporate Formation Resolution Structure
export interface CorporateFormationResolution {
  id: string;
  title: string;
  description: string;
  content: string;
  category: 'incorporator' | 'directors' | 'shareholders';
  order: number;
  isRequired: boolean;
  isCustomizable: boolean;
  customizationFields?: ResolutionCustomizationField[];
}

export interface ResolutionCustomizationField {
  fieldId: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'person' | 'address' | 'currency';
  placeholder?: string;
  required: boolean;
  options?: string[]; // for select type
  defaultValue?: string | number;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface CorporateFormationConfig {
  customizations: Record<string, any>; // fieldId -> value mapping
  selectedResolutions: string[]; // resolution IDs to include
  additionalData: {
    fiscalYearEnd?: string;
    sharePrice?: number;
    currency?: string;
    numberOfDirectors?: number;
    publicAccountantWaiver?: boolean;
    corporateSeal?: boolean;
  };
}

// Standard Corporate Formation Resolutions Data
export const STANDARD_CORPORATE_FORMATION_RESOLUTIONS: CorporateFormationResolution[] = [
  // INCORPORATOR'S WRITTEN RESOLUTIONS
  {
    id: 'inc_001',
    title: 'Approval of Articles of Incorporation',
    description: 'Approve the form and content of the Articles of Incorporation',
    content: 'Resolved that the form and content of the Articles of Incorporation of the Corporation are approved.',
    category: 'incorporator',
    order: 1,
    isRequired: true,
    isCustomizable: false,
  },
  {
    id: 'inc_002',
    title: 'Appointment of Initial Directors',
    description: 'Appoint the first director(s) of the Corporation',
    content: 'Resolved that the following individuals are appointed as the first directors of the Corporation, effective as of {{incorporationDate}}: {{directorNames}}.',
    category: 'incorporator',
    order: 2,
    isRequired: true,
    isCustomizable: true,
    customizationFields: [
      {
        fieldId: 'incorporationDate',
        label: 'Incorporation Date',
        type: 'date',
        required: true,
      },
      {
        fieldId: 'directorNames',
        label: 'Director Names',
        type: 'text',
        placeholder: 'Enter director names separated by commas',
        required: true,
      },
    ],
  },
  {
    id: 'inc_003',
    title: 'Resignation of Incorporator and Transfer of Corporate Records',
    description: 'Incorporator resigns and transfers corporate records to initial directors',
    content: 'Resolved that the undersigned incorporator hereby resigns as incorporator of the Corporation, delivers the corporate records and minute book (and seal, if any) to the initial directors, and authorizes the initial directors to undertake and complete the organization of the Corporation.',
    category: 'incorporator',
    order: 3,
    isRequired: true,
    isCustomizable: false,
  },

  // FIRST DIRECTORS' RESOLUTIONS
  {
    id: 'dir_001',
    title: 'Adoption of General By-law No. 1',
    description: 'Adopt the corporation\'s general by-law',
    content: 'Resolved that General By-law No. 1, in the form presented to the directors, is hereby adopted as the by-law of the Corporation, to take effect immediately until confirmed, amended or rejected by the shareholders in accordance with the Act.',
    category: 'directors',
    order: 1,
    isRequired: true,
    isCustomizable: false,
  },
  {
    id: 'dir_002',
    title: 'Appointment of Officers',
    description: 'Appoint President/CEO and other officers',
    content: 'Resolved that the following individuals are appointed as officers of the Corporation, to hold office at the pleasure of the Board: {{officerAppointments}}.',
    category: 'directors',
    order: 2,
    isRequired: true,
    isCustomizable: true,
    customizationFields: [
      {
        fieldId: 'presidentName',
        label: 'President/CEO',
        type: 'person',
        required: true,
      },
      {
        fieldId: 'secretaryName',
        label: 'Secretary',
        type: 'person',
        required: true,
      },
      {
        fieldId: 'cfoName',
        label: 'Chief Financial Officer',
        type: 'person',
        required: false,
      },
    ],
  },
  {
    id: 'dir_003',
    title: 'Registered Office',
    description: 'Fix the registered office address',
    content: 'Resolved that the registered office of the Corporation be and is hereby fixed at {{registeredOfficeAddress}} and that the officers are authorized to file any required notices.',
    category: 'directors',
    order: 3,
    isRequired: true,
    isCustomizable: true,
    customizationFields: [
      {
        fieldId: 'registeredOfficeAddress',
        label: 'Registered Office Address',
        type: 'address',
        required: true,
      },
    ],
  },
  {
    id: 'dir_004',
    title: 'Share Certificates',
    description: 'Approve and adopt the form of share certificate',
    content: 'Resolved that the form of share certificate annexed to the minute book is approved and adopted as the form of certificate for the common shares in the capital of the Corporation.',
    category: 'directors',
    order: 4,
    isRequired: true,
    isCustomizable: false,
  },
  {
    id: 'dir_005',
    title: 'Issuance of Shares to Initial Shareholders',
    description: 'Authorize issuance of common shares',
    content: 'Resolved that the Corporation issue the following shares to the following subscribers for the consideration set out: {{shareIssuances}}, and that the officers are authorized to execute and deliver share certificates and to update the securities register accordingly.',
    category: 'directors',
    order: 5,
    isRequired: true,
    isCustomizable: true,
    customizationFields: [
      {
        fieldId: 'sharePrice',
        label: 'Share Price',
        type: 'currency',
        required: true,
        defaultValue: 1.00,
      },
      {
        fieldId: 'currency',
        label: 'Currency',
        type: 'select',
        options: ['CAD', 'USD', 'EUR', 'GBP'],
        required: true,
        defaultValue: 'CAD',
      },
    ],
  },
  {
    id: 'dir_006',
    title: 'Banking Arrangements',
    description: 'Authorize bank account opening and signing authorities',
    content: 'Resolved that the Corporation is authorized to open and maintain one or more bank accounts with such financial institution(s) as any officer may determine, and that any two officers (or such other signing authorities as the Board may designate) are authorized to execute all account opening documents and banking resolutions.',
    category: 'directors',
    order: 6,
    isRequired: true,
    isCustomizable: false,
  },
  {
    id: 'dir_007',
    title: 'Fiscal Year-End',
    description: 'Set the financial year end date',
    content: 'Resolved that the fiscal year-end of the Corporation be and is hereby fixed at {{fiscalYearEnd}} until changed by further resolution of the Board.',
    category: 'directors',
    order: 7,
    isRequired: true,
    isCustomizable: true,
    customizationFields: [
      {
        fieldId: 'fiscalYearEnd',
        label: 'Fiscal Year End',
        type: 'date',
        placeholder: 'December 31',
        required: true,
      },
    ],
  },
  {
    id: 'dir_008',
    title: 'Public Accountant Waiver',
    description: 'Waive appointment of public accountant',
    content: 'Resolved that, subject to the approval of all shareholders, the appointment of a public accountant for the current financial year is waived in accordance with the Act.',
    category: 'directors',
    order: 8,
    isRequired: false,
    isCustomizable: true,
    customizationFields: [
      {
        fieldId: 'waiverApproved',
        label: 'Waive Public Accountant',
        type: 'select',
        options: ['Yes', 'No'],
        required: true,
        defaultValue: 'Yes',
      },
    ],
  },
  {
    id: 'dir_009',
    title: 'Corporate Seal',
    description: 'Adopt corporate seal form (if applicable)',
    content: 'Resolved that the form of corporate seal presented to the directors is hereby adopted as the seal of the Corporation, if a seal is to be used.',
    category: 'directors',
    order: 9,
    isRequired: false,
    isCustomizable: true,
    customizationFields: [
      {
        fieldId: 'useCorporateSeal',
        label: 'Use Corporate Seal',
        type: 'select',
        options: ['Yes', 'No'],
        required: true,
        defaultValue: 'No',
      },
    ],
  },
  {
    id: 'dir_010',
    title: 'Minute Book Maintenance',
    description: 'Establish corporate minute book maintenance',
    content: 'Resolved that a corporate minute book be prepared and maintained by the Secretary at the registered office of the Corporation, including registers, ledgers and copies of all organizational documents.',
    category: 'directors',
    order: 10,
    isRequired: true,
    isCustomizable: false,
  },

  // SHAREHOLDERS' RESOLUTIONS
  {
    id: 'sha_001',
    title: 'Election of Directors',
    description: 'Elect directors to hold office',
    content: 'Resolved that the following individuals are elected as directors of the Corporation, to hold office until their successors are duly elected or appointed: {{directorNames}}.',
    category: 'shareholders',
    order: 1,
    isRequired: true,
    isCustomizable: true,
    customizationFields: [
      {
        fieldId: 'directorNames',
        label: 'Director Names',
        type: 'text',
        required: true,
      },
    ],
  },
  {
    id: 'sha_002',
    title: 'Confirmation of By-law',
    description: 'Confirm General By-law No. 1',
    content: 'Resolved that General By-law No. 1 of the Corporation be and is hereby confirmed.',
    category: 'shareholders',
    order: 2,
    isRequired: true,
    isCustomizable: false,
  },
  {
    id: 'sha_003',
    title: 'Public Accountant Waiver',
    description: 'Dispense with appointment of public accountant',
    content: 'Resolved that the appointment of a public accountant for the current financial year is hereby dispensed with by unanimous resolution of all shareholders entitled to vote, in accordance with the Act.',
    category: 'shareholders',
    order: 3,
    isRequired: false,
    isCustomizable: true,
    customizationFields: [
      {
        fieldId: 'waiverApproved',
        label: 'Waive Public Accountant',
        type: 'select',
        options: ['Yes', 'No'],
        required: true,
        defaultValue: 'Yes',
      },
    ],
  },
  {
    id: 'sha_004',
    title: 'Number of Directors',
    description: 'Fix the number of directors',
    content: 'Resolved that the number of directors of the Corporation is fixed at {{numberOfDirectors}} until changed in accordance with the Articles and the Act.',
    category: 'shareholders',
    order: 4,
    isRequired: true,
    isCustomizable: true,
    customizationFields: [
      {
        fieldId: 'numberOfDirectors',
        label: 'Number of Directors',
        type: 'number',
        required: true,
        defaultValue: 1,
        validation: {
          min: 1,
          max: 50,
        },
      },
    ],
  },
  {
    id: 'sha_005',
    title: 'Ratification of Acts',
    description: 'Approve and ratify all acts by incorporator and directors',
    content: 'Resolved that all acts, contracts, proceedings, appointments and elections made or taken by the incorporator and the Board of Directors to date are approved, ratified and confirmed.',
    category: 'shareholders',
    order: 5,
    isRequired: true,
    isCustomizable: false,
  },
];
