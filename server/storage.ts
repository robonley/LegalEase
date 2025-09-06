import {
  users,
  orgs,
  people,
  addresses,
  personOnOrgs,
  shareClasses,
  shareIssuances,
  shareTransfers,
  templates,
  generatedDocs,
  auditLogs,
  type User,
  type UpsertUser,
  type Org,
  type InsertOrg,
  type Person,
  type InsertPerson,
  type Address,
  type InsertAddress,
  type PersonOnOrg,
  type InsertPersonOnOrg,
  type ShareClass,
  type InsertShareClass,
  type ShareIssuance,
  type InsertShareIssuance,
  type ShareTransfer,
  type InsertShareTransfer,
  type Template,
  type InsertTemplate,
  type GeneratedDoc,
  type InsertGeneratedDoc,
  type AuditLog,
  type InsertAuditLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Organization operations
  createOrg(org: InsertOrg): Promise<Org>;
  getOrgs(userId: string): Promise<Org[]>;
  getOrgById(id: string): Promise<Org | undefined>;
  updateOrg(id: string, updates: Partial<InsertOrg>): Promise<Org>;
  deleteOrg(id: string): Promise<void>;
  
  // Address operations
  createAddress(address: InsertAddress): Promise<Address>;
  getAddressById(id: string): Promise<Address | undefined>;
  
  // People operations
  createPerson(person: InsertPerson): Promise<Person>;
  getPeopleByOrg(orgId: string): Promise<Person[]>;
  getPersonById(id: string): Promise<Person | undefined>;
  updatePerson(id: string, updates: Partial<InsertPerson>): Promise<Person>;
  
  // Person-Org relationships
  createPersonOnOrg(relation: InsertPersonOnOrg): Promise<PersonOnOrg>;
  getPersonOrgRelations(orgId: string): Promise<PersonOnOrg[]>;
  updatePersonOnOrg(id: string, updates: Partial<InsertPersonOnOrg>): Promise<PersonOnOrg>;
  deletePersonOnOrg(id: string): Promise<void>;
  
  // Share class operations
  createShareClass(shareClass: InsertShareClass): Promise<ShareClass>;
  getShareClassesByOrg(orgId: string): Promise<ShareClass[]>;
  updateShareClass(id: string, updates: Partial<InsertShareClass>): Promise<ShareClass>;
  deleteShareClass(id: string): Promise<void>;
  
  // Share issuance operations
  createShareIssuance(issuance: InsertShareIssuance): Promise<ShareIssuance>;
  getShareIssuancesByOrg(orgId: string): Promise<ShareIssuance[]>;
  updateShareIssuance(id: string, updates: Partial<InsertShareIssuance>): Promise<ShareIssuance>;
  deleteShareIssuance(id: string): Promise<void>;
  
  // Share transfer operations
  createShareTransfer(transfer: InsertShareTransfer): Promise<ShareTransfer>;
  getShareTransfersByOrg(orgId: string): Promise<ShareTransfer[]>;
  
  // Template operations
  createTemplate(template: InsertTemplate): Promise<Template>;
  getTemplates(): Promise<Template[]>;
  getTemplatesByOrg(orgId: string): Promise<Template[]>;
  getTemplateById(id: string): Promise<Template | undefined>;
  updateTemplate(id: string, updates: Partial<InsertTemplate>): Promise<Template>;
  deleteTemplate(id: string): Promise<void>;
  
  // Generated document operations
  createGeneratedDoc(doc: InsertGeneratedDoc): Promise<GeneratedDoc>;
  getGeneratedDocsByOrg(orgId: string): Promise<GeneratedDoc[]>;
  
  // Audit log operations
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogsByOrg(orgId: string): Promise<AuditLog[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Organization operations
  async createOrg(org: InsertOrg): Promise<Org> {
    const [createdOrg] = await db.insert(orgs).values(org).returning();
    return createdOrg;
  }

  async getOrgs(userId: string): Promise<Org[]> {
    return await db
      .select()
      .from(orgs)
      .where(eq(orgs.createdById, userId))
      .orderBy(desc(orgs.updatedAt));
  }

  async getOrgById(id: string): Promise<Org | undefined> {
    const [org] = await db.select().from(orgs).where(eq(orgs.id, id));
    return org;
  }

  async updateOrg(id: string, updates: Partial<InsertOrg>): Promise<Org> {
    const [updatedOrg] = await db
      .update(orgs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(orgs.id, id))
      .returning();
    return updatedOrg;
  }

  async deleteOrg(id: string): Promise<void> {
    await db.delete(orgs).where(eq(orgs.id, id));
  }

  // Address operations
  async createAddress(address: InsertAddress): Promise<Address> {
    const [createdAddress] = await db.insert(addresses).values(address).returning();
    return createdAddress;
  }

  async getAddressById(id: string): Promise<Address | undefined> {
    const [address] = await db.select().from(addresses).where(eq(addresses.id, id));
    return address;
  }

  // People operations
  async createPerson(person: InsertPerson): Promise<Person> {
    const [createdPerson] = await db.insert(people).values(person).returning();
    return createdPerson;
  }

  async getPeopleByOrg(orgId: string): Promise<Person[]> {
    return await db
      .select({
        id: people.id,
        firstName: people.firstName,
        lastName: people.lastName,
        email: people.email,
        dateOfBirth: people.dateOfBirth,
        addressId: people.addressId,
        kycId: people.kycId,
        createdAt: people.createdAt,
      })
      .from(people)
      .innerJoin(personOnOrgs, eq(people.id, personOnOrgs.personId))
      .where(eq(personOnOrgs.orgId, orgId));
  }

  async getPersonById(id: string): Promise<Person | undefined> {
    const [person] = await db.select().from(people).where(eq(people.id, id));
    return person;
  }

  async updatePerson(id: string, updates: Partial<InsertPerson>): Promise<Person> {
    const [updatedPerson] = await db
      .update(people)
      .set(updates)
      .where(eq(people.id, id))
      .returning();
    return updatedPerson;
  }

  // Person-Org relationships
  async createPersonOnOrg(relation: InsertPersonOnOrg): Promise<PersonOnOrg> {
    const [created] = await db.insert(personOnOrgs).values(relation).returning();
    return created;
  }

  async getPersonOrgRelations(orgId: string): Promise<PersonOnOrg[]> {
    return await db
      .select()
      .from(personOnOrgs)
      .where(eq(personOnOrgs.orgId, orgId));
  }

  async updatePersonOnOrg(id: string, updates: Partial<InsertPersonOnOrg>): Promise<PersonOnOrg> {
    const [updated] = await db
      .update(personOnOrgs)
      .set(updates)
      .where(eq(personOnOrgs.id, id))
      .returning();
    return updated;
  }

  async deletePersonOnOrg(id: string): Promise<void> {
    await db.delete(personOnOrgs).where(eq(personOnOrgs.id, id));
  }

  // Share class operations
  async createShareClass(shareClass: InsertShareClass): Promise<ShareClass> {
    const [created] = await db.insert(shareClasses).values(shareClass).returning();
    return created;
  }

  async getShareClassesByOrg(orgId: string): Promise<ShareClass[]> {
    return await db
      .select()
      .from(shareClasses)
      .where(eq(shareClasses.orgId, orgId));
  }

  async updateShareClass(id: string, updates: Partial<InsertShareClass>): Promise<ShareClass> {
    const [updated] = await db
      .update(shareClasses)
      .set(updates)
      .where(eq(shareClasses.id, id))
      .returning();
    return updated;
  }

  async deleteShareClass(id: string): Promise<void> {
    await db.delete(shareClasses).where(eq(shareClasses.id, id));
  }

  // Share issuance operations
  async createShareIssuance(issuance: InsertShareIssuance): Promise<ShareIssuance> {
    const [created] = await db.insert(shareIssuances).values(issuance).returning();
    return created;
  }

  async getShareIssuancesByOrg(orgId: string): Promise<ShareIssuance[]> {
    return await db
      .select()
      .from(shareIssuances)
      .where(eq(shareIssuances.orgId, orgId))
      .orderBy(desc(shareIssuances.issueDate));
  }

  async updateShareIssuance(id: string, updates: Partial<InsertShareIssuance>): Promise<ShareIssuance> {
    const [updated] = await db
      .update(shareIssuances)
      .set(updates)
      .where(eq(shareIssuances.id, id))
      .returning();
    return updated;
  }

  async deleteShareIssuance(id: string): Promise<void> {
    await db.delete(shareIssuances).where(eq(shareIssuances.id, id));
  }

  // Share transfer operations
  async createShareTransfer(transfer: InsertShareTransfer): Promise<ShareTransfer> {
    const [created] = await db.insert(shareTransfers).values(transfer).returning();
    return created;
  }

  async getShareTransfersByOrg(orgId: string): Promise<ShareTransfer[]> {
    return await db
      .select()
      .from(shareTransfers)
      .where(eq(shareTransfers.orgId, orgId))
      .orderBy(desc(shareTransfers.transferDate));
  }

  // Template operations
  async createTemplate(template: InsertTemplate): Promise<Template> {
    const [created] = await db.insert(templates).values(template).returning();
    return created;
  }

  async getTemplates(): Promise<Template[]> {
    return await db
      .select()
      .from(templates)
      .orderBy(desc(templates.createdAt));
  }

  async getTemplatesByOrg(orgId: string): Promise<Template[]> {
    // For now, return all templates since templates aren't org-specific in current schema
    // This can be updated when we add orgId to templates table
    return await db
      .select()
      .from(templates)
      .orderBy(desc(templates.createdAt));
  }

  async getTemplateById(id: string): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.id, id));
    return template;
  }

  async updateTemplate(id: string, updates: Partial<InsertTemplate>): Promise<Template> {
    const [updated] = await db
      .update(templates)
      .set(updates)
      .where(eq(templates.id, id))
      .returning();
    return updated;
  }

  async deleteTemplate(id: string): Promise<void> {
    await db.delete(templates).where(eq(templates.id, id));
  }

  // Generated document operations
  async createGeneratedDoc(doc: InsertGeneratedDoc): Promise<GeneratedDoc> {
    const [created] = await db.insert(generatedDocs).values(doc).returning();
    return created;
  }

  async getGeneratedDocsByOrg(orgId: string): Promise<GeneratedDoc[]> {
    return await db
      .select()
      .from(generatedDocs)
      .where(eq(generatedDocs.orgId, orgId))
      .orderBy(desc(generatedDocs.createdAt));
  }

  // Audit log operations
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [created] = await db.insert(auditLogs).values(log).returning();
    return created;
  }

  async getAuditLogsByOrg(orgId: string): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.orgId, orgId))
      .orderBy(desc(auditLogs.createdAt));
  }
}

export const storage = new DatabaseStorage();
