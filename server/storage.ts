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
  ingestionJobs,
  orgNotes,
  minuteBooks,
  minuteBookDocs,
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
  type IngestionJob,
  type InsertIngestionJob,
  type ExtractionResult,
  type OrgNote,
  type InsertOrgNote,
  type MinuteBook,
  type InsertMinuteBook,
  type MinuteBookDoc,
  type InsertMinuteBookDoc,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte } from "drizzle-orm";

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

  // Minute Book operations
  getMinuteBooks(orgId: string): Promise<MinuteBook[]>;
  getMinuteBookById(id: string): Promise<MinuteBook | undefined>;
  createMinuteBook(minuteBook: InsertMinuteBook): Promise<MinuteBook>;
  updateMinuteBook(id: string, updates: Partial<InsertMinuteBook>): Promise<MinuteBook>;
  deleteMinuteBook(id: string): Promise<void>;
  
  // Minute Book Doc operations
  getMinuteBookDocs(minuteBookId: string): Promise<MinuteBookDoc[]>;
  createMinuteBookDoc(doc: InsertMinuteBookDoc): Promise<MinuteBookDoc>;
  updateMinuteBookDoc(id: string, updates: Partial<InsertMinuteBookDoc>): Promise<MinuteBookDoc>;
  
  // Generated document operations
  createGeneratedDoc(doc: InsertGeneratedDoc): Promise<GeneratedDoc>;
  getGeneratedDocsByOrg(orgId: string): Promise<GeneratedDoc[]>;
  getGeneratedDocById(id: string): Promise<GeneratedDoc | undefined>;
  
  // Audit log operations
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogsByOrg(orgId: string): Promise<AuditLog[]>;
  createEnhancedAuditLog(params: {
    orgId?: string;
    actorId: string;
    action: string;
    entityType?: string;
    entityId?: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    additionalContext?: Record<string, any>;
  }): Promise<AuditLog>;
  getFilteredAuditLogs(filters?: {
    orgId?: string;
    actorId?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
    fieldName?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLog[]>;
  
  // Ingestion job operations
  createIngestionJob(job: InsertIngestionJob): Promise<IngestionJob>;
  getIngestionJobById(id: string): Promise<IngestionJob | undefined>;
  updateIngestionJob(id: string, updates: Partial<InsertIngestionJob>): Promise<IngestionJob>;
  getIngestionJobsByUser(userId: string): Promise<IngestionJob[]>;
  
  // Organization notes operations
  createOrgNote(note: InsertOrgNote): Promise<OrgNote>;
  getOrgNotes(orgId: string): Promise<OrgNote[]>;
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
        dob: people.dob,
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

  // Minute Book operations
  async getMinuteBooks(orgId: string): Promise<MinuteBook[]> {
    return await db
      .select()
      .from(minuteBooks)
      .where(eq(minuteBooks.orgId, orgId))
      .orderBy(desc(minuteBooks.createdAt));
  }

  async getMinuteBookById(id: string): Promise<MinuteBook | undefined> {
    const [minuteBook] = await db
      .select()
      .from(minuteBooks)
      .where(eq(minuteBooks.id, id));
    return minuteBook;
  }

  async createMinuteBook(minuteBook: InsertMinuteBook): Promise<MinuteBook> {
    const [created] = await db
      .insert(minuteBooks)
      .values(minuteBook)
      .returning();
    return created;
  }

  async updateMinuteBook(id: string, updates: Partial<InsertMinuteBook>): Promise<MinuteBook> {
    const [updated] = await db
      .update(minuteBooks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(minuteBooks.id, id))
      .returning();
    return updated;
  }

  async deleteMinuteBook(id: string): Promise<void> {
    await db.delete(minuteBooks).where(eq(minuteBooks.id, id));
  }

  // Minute Book Doc operations
  async getMinuteBookDocs(minuteBookId: string): Promise<MinuteBookDoc[]> {
    return await db
      .select()
      .from(minuteBookDocs)
      .where(eq(minuteBookDocs.minuteBookId, minuteBookId))
      .orderBy(minuteBookDocs.sortOrder);
  }

  async createMinuteBookDoc(doc: InsertMinuteBookDoc): Promise<MinuteBookDoc> {
    const [created] = await db
      .insert(minuteBookDocs)
      .values(doc)
      .returning();
    return created;
  }

  async updateMinuteBookDoc(id: string, updates: Partial<InsertMinuteBookDoc>): Promise<MinuteBookDoc> {
    const [updated] = await db
      .update(minuteBookDocs)
      .set(updates)
      .where(eq(minuteBookDocs.id, id))
      .returning();
    return updated;
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

  async getGeneratedDocById(id: string): Promise<GeneratedDoc | undefined> {
    const [doc] = await db.select().from(generatedDocs).where(eq(generatedDocs.id, id));
    return doc;
  }

  async updateGeneratedDoc(id: string, updates: Partial<Pick<GeneratedDoc, 'content'>>): Promise<GeneratedDoc> {
    const [updated] = await db
      .update(generatedDocs)
      .set(updates)
      .where(eq(generatedDocs.id, id))
      .returning();
    return updated;
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

  // Enhanced audit logging with field-level change tracking
  async createEnhancedAuditLog({
    orgId,
    actorId,
    action,
    entityType,
    entityId,
    oldValues,
    newValues,
    ipAddress,
    userAgent,
    additionalContext = {}
  }: {
    orgId?: string;
    actorId: string;
    action: string;
    entityType?: string;
    entityId?: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    additionalContext?: Record<string, any>;
  }): Promise<AuditLog> {
    // Calculate field changes
    const fieldChanges: Record<string, { old: any; new: any }> = {};
    
    if (oldValues && newValues) {
      // Compare old and new values to identify changed fields
      const allKeys = [...new Set([...Object.keys(oldValues), ...Object.keys(newValues)])];
      
      for (const key of allKeys) {
        const oldVal = oldValues[key];
        const newVal = newValues[key];
        
        // Only track actual changes (excluding timestamps and IDs)
        if (oldVal !== newVal && !['createdAt', 'updatedAt', 'id'].includes(key)) {
          fieldChanges[key] = {
            old: oldVal,
            new: newVal
          };
        }
      }
    }

    const auditData = {
      orgId,
      actorId,
      action,
      entityType,
      entityId,
      fieldChanges: Object.keys(fieldChanges).length > 0 ? fieldChanges : null,
      payload: {
        ...additionalContext,
        hasFieldChanges: Object.keys(fieldChanges).length > 0,
        changedFields: Object.keys(fieldChanges),
        entityType,
        entityId
      },
      ipAddress,
      userAgent
    };

    const [created] = await db.insert(auditLogs).values(auditData).returning();
    return created;
  }

  // Get audit logs with comprehensive filtering
  async getFilteredAuditLogs({
    orgId,
    actorId,
    action,
    entityType,
    entityId,
    startDate,
    endDate,
    fieldName,
    limit = 50,
    offset = 0
  }: {
    orgId?: string;
    actorId?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
    fieldName?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<AuditLog[]> {
    let query = db.select().from(auditLogs).$dynamic();
    
    // Apply filters
    const conditions = [];
    
    if (orgId) {
      conditions.push(eq(auditLogs.orgId, orgId));
    }
    
    if (actorId) {
      conditions.push(eq(auditLogs.actorId, actorId));
    }
    
    if (action) {
      conditions.push(eq(auditLogs.action, action));
    }
    
    if (entityType) {
      conditions.push(eq(auditLogs.entityType, entityType));
    }
    
    if (entityId) {
      conditions.push(eq(auditLogs.entityId, entityId));
    }
    
    if (startDate) {
      conditions.push(gte(auditLogs.createdAt, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(auditLogs.createdAt, endDate));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const results = await query
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);
      
    // Filter by field name in application logic if specified
    if (fieldName) {
      return results.filter(log => 
        log.fieldChanges && 
        typeof log.fieldChanges === 'object' &&
        Object.keys(log.fieldChanges).includes(fieldName)
      );
    }
    
    return results;
  }

  // Ingestion job operations
  async createIngestionJob(job: InsertIngestionJob): Promise<IngestionJob> {
    const [created] = await db.insert(ingestionJobs).values(job).returning();
    return created;
  }

  async getIngestionJobById(id: string): Promise<IngestionJob | undefined> {
    const [job] = await db.select().from(ingestionJobs).where(eq(ingestionJobs.id, id));
    return job;
  }

  async updateIngestionJob(id: string, updates: Partial<InsertIngestionJob>): Promise<IngestionJob> {
    const [updated] = await db
      .update(ingestionJobs)
      .set(updates)
      .where(eq(ingestionJobs.id, id))
      .returning();
    return updated;
  }

  async getIngestionJobsByUser(userId: string): Promise<IngestionJob[]> {
    return await db
      .select()
      .from(ingestionJobs)
      .where(eq(ingestionJobs.userId, userId))
      .orderBy(desc(ingestionJobs.createdAt));
  }

  // Organization notes operations
  async createOrgNote(note: InsertOrgNote): Promise<OrgNote> {
    const [created] = await db.insert(orgNotes).values(note).returning();
    return created;
  }

  async getOrgNotes(orgId: string): Promise<OrgNote[]> {
    return await db
      .select()
      .from(orgNotes)
      .where(eq(orgNotes.orgId, orgId))
      .orderBy(desc(orgNotes.createdAt));
  }
}

export const storage = new DatabaseStorage();
