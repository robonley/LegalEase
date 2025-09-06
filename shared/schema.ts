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
  jurisdiction: text("jurisdiction").notNull(), // e.g., "CBCA", "OBCA", "DE"
  formationAt: timestamp("formation_at"),
  registeredOfficeId: varchar("registered_office_id").references(() => addresses.id),
  recordsOfficeId: varchar("records_office_id").references(() => addresses.id),
  mailingAddressId: varchar("mailing_address_id").references(() => addresses.id),
  // Authorized Representative fields
  authRepName: text("auth_rep_name"),
  authRepCompany: text("auth_rep_company"),
  authRepAddressId: varchar("auth_rep_address_id").references(() => addresses.id),
  authRepEmail: text("auth_rep_email"),
  authRepPhone: text("auth_rep_phone"),
  createdById: varchar("created_by_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const people = pgTable("people", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  dateOfBirth: timestamp("dob"),
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
  startDate: timestamp("start_at"),
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
  fileKey: text("file_key").notNull(), // storage key for .docx
  schema: json("schema").notNull(), // required fields map
  ownerId: varchar("owner_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const generatedDocs = pgTable("generated_docs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").notNull().references(() => orgs.id),
  templateId: varchar("template_id").notNull().references(() => templates.id),
  fileKey: text("file_key").notNull(), // output .docx
  pdfKey: text("pdf_key"),
  dataUsed: json("data_used").notNull(),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orgId: varchar("org_id").references(() => orgs.id),
  actorId: varchar("actor_id").notNull().references(() => users.id),
  action: text("action").notNull(), // e.g., "UPDATE_CAP_TABLE"
  payload: json("payload").notNull(),
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
  // Entity shareholdings - where this org holds shares in other entities
  entityShareholdings: many(shareIssuances, { relationName: "entityShareholder" }),
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

export const generatedDocsRelations = relations(generatedDocs, ({ one }) => ({
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

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Address = typeof addresses.$inferSelect;
export type InsertAddress = z.infer<typeof insertAddressSchema>;
export type Org = typeof orgs.$inferSelect;
export type InsertOrg = z.infer<typeof insertOrgSchema>;
export type Person = typeof people.$inferSelect;
export type InsertPerson = z.infer<typeof insertPersonSchema>;
export type PersonOnOrg = typeof personOnOrgs.$inferSelect;
export type InsertPersonOnOrg = z.infer<typeof insertPersonOnOrgSchema>;
export type ShareClass = typeof shareClasses.$inferSelect;
export type InsertShareClass = z.infer<typeof insertShareClassSchema>;
export type ShareIssuance = typeof shareIssuances.$inferSelect;
export type InsertShareIssuance = z.infer<typeof insertShareIssuanceSchema>;
export type ShareTransfer = typeof shareTransfers.$inferSelect;
export type InsertShareTransfer = z.infer<typeof insertShareTransferSchema>;
export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type GeneratedDoc = typeof generatedDocs.$inferSelect;
export type InsertGeneratedDoc = z.infer<typeof insertGeneratedDocSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
