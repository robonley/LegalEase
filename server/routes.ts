import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertOrgSchema,
  insertPersonSchema,
  insertAddressSchema,
  insertPersonOnOrgSchema,
  insertShareClassSchema,
  insertShareIssuanceSchema,
  insertShareTransferSchema,
  insertTemplateSchema,
  insertGeneratedDocSchema,
  insertAuditLogSchema,
  insertOrgNoteSchema,
  insertMinuteBookSchema,
  insertEntityRelationshipSchema,
  insertDocumentDraftSchema,
  insertContractSchema,
  insertContractVersionSchema,
  insertContractPartySchema,
  insertContractObligationSchema,
  insertContractClauseSchema,
  type InsertAddress,
  type Contract,
  type ContractVersion
} from "@shared/schema";
import { z } from "zod";
import { extractTemplateVariables, createVariableMapping, CBCA_TEMPLATE_VARIABLES } from "./templateProcessor";
import multer from "multer";
import { nanoid } from "nanoid";
import { addIngestionJob, getJobStatus } from "./queueService";
import { IngestionWorker } from "./ingestionWorker";
import path from "path";
import fs from "fs";
import Stripe from "stripe";
import { complianceService, type ComplianceReview, type ComplianceGap } from "./services/complianceService";
import { notificationService } from "./services/notificationService";

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Organization routes (temporarily bypassing auth for development)
  app.get('/api/orgs', async (req: any, res) => {
    try {
      // Use a default test user ID for development
      const userId = "test-user-123";
      const orgs = await storage.getOrgs(userId);
      res.json(orgs);
    } catch (error) {
      console.error("Error fetching organizations:", error);
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });

  app.post('/api/orgs', async (req: any, res) => {
    try {
      // Use a default test user ID for development
      const userId = "test-user-123";
      
      // Convert date strings to Date objects if provided
      const processedBody = { ...req.body };
      if (processedBody.formationAt && processedBody.formationAt !== '') {
        processedBody.formationAt = new Date(processedBody.formationAt);
      }
      if (processedBody.amendmentDate && processedBody.amendmentDate !== '') {
        processedBody.amendmentDate = new Date(processedBody.amendmentDate);
      }
      
      // Remove empty string dates to avoid validation errors
      if (processedBody.formationAt === '') {
        delete processedBody.formationAt;
      }
      if (processedBody.amendmentDate === '') {
        delete processedBody.amendmentDate;
      }
      
      // Clean up empty string address IDs to avoid foreign key constraint errors
      if (processedBody.mailingAddressId === '') {
        delete processedBody.mailingAddressId;
      }
      if (processedBody.authRepAddressId === '') {
        delete processedBody.authRepAddressId;
      }
      
      const orgData = insertOrgSchema.parse({ ...processedBody, createdById: userId });
      
      // Create addresses if provided
      if (req.body.registeredOffice) {
        const registeredOffice = await storage.createAddress(req.body.registeredOffice);
        orgData.registeredOfficeId = registeredOffice.id;
      }
      if (req.body.recordsOffice) {
        const recordsOffice = await storage.createAddress(req.body.recordsOffice);
        orgData.recordsOfficeId = recordsOffice.id;
      }

      const org = await storage.createOrg(orgData);
      
      // Create enhanced audit log
      await storage.createEnhancedAuditLog({
        orgId: org.id,
        actorId: userId,
        action: "CREATE_ORG",
        entityType: "organization",
        entityId: org.id,
        newValues: org,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        additionalContext: { name: org.name }
      });

      res.status(201).json(org);
    } catch (error) {
      console.error("Error creating organization:", error);
      res.status(500).json({ message: "Failed to create organization" });
    }
  });

  app.get('/api/orgs/:id', async (req, res) => {
    try {
      const org = await storage.getOrgById(req.params.id);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }
      res.json(org);
    } catch (error) {
      console.error("Error fetching organization:", error);
      res.status(500).json({ message: "Failed to fetch organization" });
    }
  });

  app.put('/api/orgs/:id', async (req: any, res) => {
    try {
      // Use a default test user ID for development
      const userId = "test-user-123";
      
      // Convert date strings to Date objects if provided
      const processedBody = { ...req.body };
      if (processedBody.formationAt) {
        processedBody.formationAt = new Date(processedBody.formationAt);
      }
      if (processedBody.amendmentDate) {
        processedBody.amendmentDate = new Date(processedBody.amendmentDate);
      }

      // Handle address creation and linking
      const orgUpdates: any = { ...processedBody };

      // Create registered office address if provided
      if (processedBody.registeredOffice && processedBody.registeredOffice.line1) {
        const registeredOffice = await storage.createAddress(processedBody.registeredOffice);
        orgUpdates.registeredOfficeId = registeredOffice.id;
      }
      delete orgUpdates.registeredOffice;

      // Create mailing address if provided
      if (processedBody.mailingAddress && processedBody.mailingAddress.line1) {
        const mailingAddress = await storage.createAddress(processedBody.mailingAddress);
        orgUpdates.mailingAddressId = mailingAddress.id;
      }
      delete orgUpdates.mailingAddress;

      // Create authorized representative address if provided
      if (processedBody.authRepAddress && processedBody.authRepAddress.line1) {
        const authRepAddress = await storage.createAddress(processedBody.authRepAddress);
        orgUpdates.authRepAddressId = authRepAddress.id;
      }
      delete orgUpdates.authRepAddress;
      
      const updates = insertOrgSchema.partial().parse(orgUpdates);
      const org = await storage.updateOrg(req.params.id, updates);
      
      await storage.createAuditLog({
        orgId: org.id,
        actorId: userId,
        action: "UPDATE_ORG",
        payload: { orgId: org.id, updates }
      });

      res.json(org);
    } catch (error) {
      console.error("Error updating organization:", error);
      res.status(500).json({ message: "Failed to update organization" });
    }
  });

  // Organization Notes routes
  app.get('/api/orgs/:id/notes', async (req, res) => {
    try {
      const notes = await storage.getOrgNotes(req.params.id);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching organization notes:", error);
      res.status(500).json({ message: "Failed to fetch notes" });
    }
  });

  app.post('/api/orgs/:id/notes', async (req: any, res) => {
    try {
      // Use a default test user ID for development
      const userId = "test-user-123";
      
      const noteData = insertOrgNoteSchema.parse({
        orgId: req.params.id,
        content: req.body.content,
        createdBy: userId
      });
      
      const note = await storage.createOrgNote(noteData);
      
      // Create audit log
      await storage.createAuditLog({
        orgId: req.params.id,
        actorId: userId,
        action: "ADD_NOTE",
        payload: { noteId: note.id, content: req.body.content }
      });

      res.status(201).json(note);
    } catch (error) {
      console.error("Error creating organization note:", error);
      res.status(500).json({ message: "Failed to create note" });
    }
  });

  // Address routes
  app.get('/api/addresses/:id', isAuthenticated, async (req, res) => {
    try {
      const address = await storage.getAddressById(req.params.id);
      if (!address) {
        return res.status(404).json({ message: "Address not found" });
      }
      res.json(address);
    } catch (error) {
      console.error("Error fetching address:", error);
      res.status(500).json({ message: "Failed to fetch address" });
    }
  });

  // People routes
  app.get('/api/orgs/:orgId/people', isAuthenticated, async (req, res) => {
    try {
      const people = await storage.getPeopleByOrg(req.params.orgId);
      const relations = await storage.getPersonOrgRelations(req.params.orgId);
      
      const peopleWithRoles = people.map(person => {
        const personRoles = relations.filter(r => r.personId === person.id);
        return { ...person, roles: personRoles };
      });

      res.json(peopleWithRoles);
    } catch (error) {
      console.error("Error fetching people:", error);
      res.status(500).json({ message: "Failed to fetch people" });
    }
  });

  app.post('/api/orgs/:orgId/people', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { person: personData, roles } = req.body;
      
      // Create address if provided
      if (personData.address) {
        const address = await storage.createAddress(personData.address);
        personData.addressId = address.id;
        delete personData.address;
      }

      // Convert date strings to Date objects if provided
      if (personData.dob && personData.dob !== '') {
        personData.dob = new Date(personData.dob);
      }
      // Remove empty string dates to avoid validation errors
      if (personData.dob === '') {
        delete personData.dob;
      }
      
      const person = await storage.createPerson(insertPersonSchema.parse(personData));
      
      // Create person-org relationships
      const createdRoles = [];
      for (const role of roles || []) {
        console.log("Role data received:", role);
        console.log("Role startAt type:", typeof role.startAt, role.startAt);
        
        const relationData = insertPersonOnOrgSchema.parse({
          ...role,
          startAt: role.startAt ? new Date(role.startAt) : new Date(),
          orgId: req.params.orgId,
          personId: person.id
        });
        const relation = await storage.createPersonOnOrg(relationData);
        createdRoles.push(relation);
      }

      await storage.createAuditLog({
        orgId: req.params.orgId,
        actorId: userId,
        action: "ADD_PERSON",
        payload: { 
          personId: person.id, 
          name: `${person.firstName} ${person.lastName}`,
          roles: createdRoles.map(r => r.role)
        }
      });

      res.status(201).json({ ...person, roles: createdRoles });
    } catch (error) {
      console.error("Error creating person:", error);
      res.status(500).json({ message: "Failed to create person" });
    }
  });

  app.put('/api/orgs/:orgId/people/:personId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { orgId, personId } = req.params;
      const { person: personData, roles } = req.body;
      
      // Update person data
      const updates: any = {};
      if (personData.firstName) updates.firstName = personData.firstName;
      if (personData.lastName) updates.lastName = personData.lastName;
      if (personData.email !== undefined) updates.email = personData.email || null;
      if (personData.dob !== undefined) {
        updates.dob = personData.dob ? new Date(personData.dob) : null;
      }
      
      // Handle address update/creation
      if (personData.address) {
        const address = await storage.createAddress(personData.address);
        updates.addressId = address.id;
      }
      
      // Update person if there are changes
      let updatedPerson;
      if (Object.keys(updates).length > 0) {
        const validatedUpdates = insertPersonSchema.partial().parse(updates);
        updatedPerson = await storage.updatePerson(personId, validatedUpdates);
      } else {
        // Get current person data if no updates
        const people = await storage.getPeopleByOrg(orgId);
        updatedPerson = people.find(p => p.id === personId);
      }
      
      if (!updatedPerson) {
        return res.status(404).json({ message: "Person not found" });
      }
      
      // Get current person-org relations
      const currentRelations = await storage.getPersonOrgRelations(orgId);
      const personCurrentRoles = currentRelations.filter(r => r.personId === personId);
      
      // Delete existing relations for this person in this org
      for (const relation of personCurrentRoles) {
        await storage.deletePersonOnOrg(relation.id);
      }
      
      // Create new relations
      const updatedRoles = [];
      for (const role of roles || []) {
        const relationData = insertPersonOnOrgSchema.parse({
          ...role,
          startAt: role.startAt ? new Date(role.startAt) : new Date(),
          orgId,
          personId
        });
        const relation = await storage.createPersonOnOrg(relationData);
        updatedRoles.push(relation);
      }
      
      // Create audit log
      await storage.createAuditLog({
        orgId,
        actorId: userId,
        action: "UPDATE_PERSON",
        payload: { 
          personId, 
          name: `${updatedPerson.firstName} ${updatedPerson.lastName}`,
          roles: updatedRoles.map(r => r.role),
          updates: Object.keys(updates)
        }
      });

      res.json({ ...updatedPerson, roles: updatedRoles });
    } catch (error) {
      console.error("Error updating person:", error);
      res.status(500).json({ message: "Failed to update person" });
    }
  });

  app.delete('/api/orgs/:orgId/people/:personId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { orgId, personId } = req.params;
      
      // Get person details for audit log before deletion
      const relations = await storage.getPersonOrgRelations(orgId);
      const personRelations = relations.filter(r => r.personId === personId);
      
      if (personRelations.length === 0) {
        return res.status(404).json({ message: "Person not found in this organization" });
      }
      
      // Delete all person-org relationships for this person in this organization
      for (const relation of personRelations) {
        await storage.deletePersonOnOrg(relation.id);
      }
      
      await storage.createAuditLog({
        orgId,
        actorId: userId,
        action: "REMOVE_PERSON",
        payload: { 
          personId,
          roles: personRelations.map(r => r.role)
        }
      });

      res.status(200).json({ message: "Person removed from organization successfully" });
    } catch (error) {
      console.error("Error removing person:", error);
      res.status(500).json({ message: "Failed to remove person" });
    }
  });

  // Share class routes
  app.get('/api/orgs/:orgId/share-classes', isAuthenticated, async (req, res) => {
    try {
      const shareClasses = await storage.getShareClassesByOrg(req.params.orgId);
      res.json(shareClasses);
    } catch (error) {
      console.error("Error fetching share classes:", error);
      res.status(500).json({ message: "Failed to fetch share classes" });
    }
  });

  app.post('/api/orgs/:orgId/share-classes', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const shareClassData = insertShareClassSchema.parse({
        ...req.body,
        orgId: req.params.orgId
      });
      
      const shareClass = await storage.createShareClass(shareClassData);
      
      await storage.createAuditLog({
        orgId: req.params.orgId,
        actorId: userId,
        action: "CREATE_SHARE_CLASS",
        payload: { shareClassId: shareClass.id, name: shareClass.name }
      });

      res.status(201).json(shareClass);
    } catch (error) {
      console.error("Error creating share class:", error);
      res.status(500).json({ message: "Failed to create share class" });
    }
  });

  // Share issuance routes
  app.get('/api/orgs/:orgId/issuances', isAuthenticated, async (req, res) => {
    try {
      const issuances = await storage.getShareIssuancesByOrg(req.params.orgId);
      res.json(issuances);
    } catch (error) {
      console.error("Error fetching issuances:", error);
      res.status(500).json({ message: "Failed to fetch issuances" });
    }
  });

  app.post('/api/orgs/:orgId/issuances', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const issuanceData = insertShareIssuanceSchema.parse({
        ...req.body,
        orgId: req.params.orgId
      });
      
      const issuance = await storage.createShareIssuance(issuanceData);
      
      await storage.createAuditLog({
        orgId: req.params.orgId,
        actorId: userId,
        action: "ISSUE_SHARES",
        payload: { 
          issuanceId: issuance.id, 
          quantity: issuance.quantity,
          certNumber: issuance.certNumber
        }
      });

      res.status(201).json(issuance);
    } catch (error) {
      console.error("Error creating share issuance:", error);
      res.status(500).json({ message: "Failed to create share issuance" });
    }
  });

  // Share transfer routes
  app.get('/api/orgs/:orgId/transfers', isAuthenticated, async (req, res) => {
    try {
      const transfers = await storage.getShareTransfersByOrg(req.params.orgId);
      res.json(transfers);
    } catch (error) {
      console.error("Error fetching transfers:", error);
      res.status(500).json({ message: "Failed to fetch transfers" });
    }
  });

  app.post('/api/orgs/:orgId/transfers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const transferData = insertShareTransferSchema.parse({
        ...req.body,
        orgId: req.params.orgId
      });
      
      const transfer = await storage.createShareTransfer(transferData);
      
      await storage.createAuditLog({
        orgId: req.params.orgId,
        actorId: userId,
        action: "TRANSFER_SHARES",
        payload: { 
          transferId: transfer.id, 
          quantity: transfer.quantity
        }
      });

      res.status(201).json(transfer);
    } catch (error) {
      console.error("Error creating share transfer:", error);
      res.status(500).json({ message: "Failed to create share transfer" });
    }
  });

  // Template routes
  app.get('/api/templates', isAuthenticated, async (req, res) => {
    try {
      const templates = await storage.getTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.post('/api/templates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const templateData = insertTemplateSchema.parse({
        ...req.body,
        ownerId: userId
      });
      
      const template = await storage.createTemplate(templateData);
      
      await storage.createEnhancedAuditLog({
        actorId: userId,
        action: "CREATE_TEMPLATE",
        entityType: "template",
        entityId: template.id,
        newValues: template,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        additionalContext: { 
          name: template.name,
          isStarter: false,
          templateType: "custom"
        }
      });

      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating template:", error);
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  // Document generation routes
  app.post('/api/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { orgId, templateId, overrides } = req.body;
      
      // Get org and template data
      const org = await storage.getOrgById(orgId);
      const template = await storage.getTemplateById(templateId);
      
      if (!org || !template) {
        return res.status(404).json({ message: "Organization or template not found" });
      }

      // For now, simulate document generation
      const fileKey = `generated/${orgId}/${templateId}/${Date.now()}.docx`;
      
      const generatedDoc = await storage.createGeneratedDoc({
        orgId,
        templateId,
        fileKey,
        dataUsed: { org, overrides },
        createdBy: userId
      });

      await storage.createEnhancedAuditLog({
        orgId,
        actorId: userId,
        action: "GENERATE_DOCUMENT",
        entityType: "document",
        entityId: generatedDoc.id,
        newValues: generatedDoc,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        additionalContext: { 
          templateName: template.name,
          templateId: template.id,
          fileName: generatedDoc.fileKey,
          overrides
        }
      });

      res.json({ downloadUrl: `/api/docs/${generatedDoc.id}` });
    } catch (error) {
      console.error("Error generating document:", error);
      res.status(500).json({ message: "Failed to generate document" });
    }
  });

  // Minute book generation
  app.post('/api/minute-book', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { orgId, bundle } = req.body;
      
      const org = await storage.getOrgById(orgId);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Simulate minute book generation
      const fileKey = `minute-books/${orgId}/${Date.now()}.zip`;
      
      await storage.createEnhancedAuditLog({
        orgId,
        actorId: userId,
        action: "GENERATE_MINUTE_BOOK",
        entityType: "document_bundle",
        entityId: fileKey,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        additionalContext: { 
          bundle,
          fileKey,
          bundleType: "minute-book"
        }
      });

      res.json({ downloadUrl: `/api/minute-books/${fileKey}` });
    } catch (error) {
      console.error("Error generating minute book:", error);
      res.status(500).json({ message: "Failed to generate minute book" });
    }
  });

  // Generated documents
  app.get('/api/orgs/:orgId/documents', isAuthenticated, async (req, res) => {
    try {
      const documents = await storage.getGeneratedDocsByOrg(req.params.orgId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // Document editor data endpoint
  app.get('/api/orgs/:orgId/editor-data', isAuthenticated, async (req: any, res) => {
    try {
      const orgId = req.params.orgId;
      const userId = req.user?.claims?.sub || "test-user-123";
      
      // Get all data needed for the document editor
      const [orgs, people, shareClasses, shareIssuances, personOrgRelations] = await Promise.all([
        storage.getOrgs(userId), // Get orgs for the authenticated user
        storage.getPeopleByOrg(orgId),
        storage.getShareClassesByOrg(orgId),
        storage.getShareIssuancesByOrg(orgId),
        storage.getPersonOrgRelations(orgId)
      ]);
      
      const organization = orgs.find(org => org.id === orgId);

      // Enrich people with their roles from personOnOrgs table
      const peopleWithRoles = people.map(person => {
        const roles = personOrgRelations.filter(rel => rel.personId === person.id);
        return {
          ...person,
          roles: roles
        };
      });

      console.log('Editor data endpoint:', {
        userId,
        orgId,
        organization: organization ? `Found: ${organization.name}` : 'Not found',
        peopleCount: people.length,
        shareClassCount: shareClasses.length,
        shareIssuanceCount: shareIssuances.length,
        roleRelationsCount: personOrgRelations.length
      });

      res.json({
        organization,
        people: peopleWithRoles,
        shareClasses,
        shareIssuances,
        addresses: [] // No addresses method available yet
      });
    } catch (error) {
      console.error("Error fetching editor data:", error instanceof Error ? error.message : 'Unknown error');
      res.status(500).json({ message: "Failed to fetch editor data" });
    }
  });

  // Document content endpoint
  app.get('/api/documents/:documentId/content', isAuthenticated, async (req, res) => {
    try {
      const document = await storage.getGeneratedDocById(req.params.documentId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // For now, return empty content - in the future this could load from file storage
      res.json({ content: document.content || "" });
    } catch (error) {
      console.error("Error fetching document content:", error);
      res.status(500).json({ message: "Failed to fetch document content" });
    }
  });

  // Save document content endpoint
  app.put('/api/documents/:documentId/content', isAuthenticated, async (req: any, res) => {
    try {
      const documentId = req.params.documentId;
      const { content } = req.body;
      const userId = req.user?.claims?.sub || "test-user-123";

      const document = await storage.getGeneratedDocById(documentId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Update document content
      await storage.updateGeneratedDoc(documentId, { content });

      // Create audit log for content update
      await storage.createEnhancedAuditLog({
        orgId: document.orgId,
        actorId: userId,
        action: "UPDATE_DOCUMENT_CONTENT",
        entityType: "document",
        entityId: documentId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        additionalContext: {
          documentId,
          fileKey: document.fileKey,
          contentLength: content?.length || 0
        }
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error saving document content:", error);
      res.status(500).json({ message: "Failed to save document content" });
    }
  });

  // Get single document by ID
  app.get('/api/documents/:documentId', isAuthenticated, async (req: any, res) => {
    try {
      const documentId = req.params.documentId;
      const document = await storage.getGeneratedDocById(documentId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      res.json(document);
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  // Rename document
  app.put('/api/documents/:documentId/rename', isAuthenticated, async (req: any, res) => {
    try {
      const documentId = req.params.documentId;
      const { fileKey } = req.body;
      const userId = req.user?.claims?.sub || "test-user-123";

      if (!fileKey || !fileKey.trim()) {
        return res.status(400).json({ message: "File name is required" });
      }

      const document = await storage.getGeneratedDocById(documentId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      const oldName = document.fileKey;
      
      // Update document name
      await storage.updateGeneratedDoc(documentId, { fileKey: fileKey.trim() });

      // Create audit log for rename
      await storage.createEnhancedAuditLog({
        orgId: document.orgId,
        actorId: userId,
        action: "RENAME_DOCUMENT",
        entityType: "document",
        entityId: documentId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        additionalContext: {
          documentId,
          oldName,
          newName: fileKey.trim()
        }
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error renaming document:", error);
      res.status(500).json({ message: "Failed to rename document" });
    }
  });

  // Export document as PDF
  app.post('/api/documents/:documentId/export-pdf', isAuthenticated, async (req: any, res) => {
    try {
      const documentId = req.params.documentId;
      const { content } = req.body;
      const userId = req.user?.claims?.sub || "test-user-123";

      const document = await storage.getGeneratedDocById(documentId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Import html-pdf-node
      const htmlPdf = require('html-pdf-node');
      
      // Create HTML content with proper styling
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
              line-height: 1.6;
              max-width: 800px;
              margin: 0 auto;
              padding: 40px 20px;
              color: #333;
            }
            h1, h2, h3, h4, h5, h6 {
              margin-top: 1.5em;
              margin-bottom: 0.5em;
              font-weight: 600;
            }
            p {
              margin-bottom: 1em;
            }
            ul, ol {
              margin-bottom: 1em;
              padding-left: 1.5em;
            }
            strong {
              font-weight: 600;
            }
            em {
              font-style: italic;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #eee;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .document-title {
              font-size: 24px;
              font-weight: 700;
              margin-bottom: 10px;
            }
            .organization-name {
              color: #666;
              font-size: 16px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="document-title">${document.fileKey}</div>
            <div class="organization-name">Generated Document</div>
          </div>
          <div class="content">
            ${content || '<p>No content available</p>'}
          </div>
        </body>
        </html>
      `;

      const options = {
        format: 'A4',
        margin: {
          top: '20mm',
          bottom: '20mm',
          left: '20mm',
          right: '20mm'
        }
      };

      const pdfBuffer = await htmlPdf.generatePdf({ content: htmlContent }, options);

      // Create audit log for PDF export
      await storage.createEnhancedAuditLog({
        orgId: document.orgId,
        actorId: userId,
        action: "EXPORT_PDF",
        entityType: "document",
        entityId: documentId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        additionalContext: {
          documentId,
          fileKey: document.fileKey,
          exportTime: new Date().toISOString()
        }
      });

      // Set headers for PDF download
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${document.fileKey.replace('.docx', '.pdf')}"`,
        'Content-Length': pdfBuffer.length
      });

      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error exporting PDF:", error);
      res.status(500).json({ message: "Failed to export PDF" });
    }
  });

  // Audit logs
  app.get('/api/orgs/:orgId/audit-logs', isAuthenticated, async (req, res) => {
    try {
      const logs = await storage.getAuditLogsByOrg(req.params.orgId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // Enhanced audit logs endpoint with filtering
  app.get('/api/audit-logs/filter', isAuthenticated, async (req: any, res) => {
    try {
      const {
        orgId,
        actorId,
        action,
        entityType,
        entityId,
        startDate,
        endDate,
        fieldName,
        limit = '50',
        offset = '0'
      } = req.query;

      const filters = {
        orgId,
        actorId,
        action,
        entityType,
        entityId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        fieldName,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0
      };

      const logs = await storage.getFilteredAuditLogs(filters);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching filtered audit logs:", error);
      res.status(500).json({ message: "Failed to fetch filtered audit logs" });
    }
  });

  // Registers endpoint
  app.get('/api/orgs/:orgId/registers', isAuthenticated, async (req, res) => {
    try {
      const orgId = req.params.orgId;
      
      // Get all data for registers
      const people = await storage.getPeopleByOrg(orgId);
      const relations = await storage.getPersonOrgRelations(orgId);
      const shareClasses = await storage.getShareClassesByOrg(orgId);
      const issuances = await storage.getShareIssuancesByOrg(orgId);
      const transfers = await storage.getShareTransfersByOrg(orgId);

      // Build registers
      const directorRegister = relations
        .filter(r => r.role === 'Director')
        .map(r => {
          const person = people.find(p => p.id === r.personId);
          return { ...r, person };
        });

      const officerRegister = relations
        .filter(r => r.role === 'Officer')
        .map(r => {
          const person = people.find(p => p.id === r.personId);
          return { ...r, person };
        });

      const shareholderRegister = issuances.map(issuance => {
        const shareholder = people.find(p => p.id === issuance.shareholderId);
        const shareClass = shareClasses.find(sc => sc.id === issuance.shareClassId);
        return { ...issuance, shareholder, shareClass };
      });

      res.json({
        directorRegister,
        officerRegister,
        shareholderRegister,
        shareIssuanceRegister: issuances
      });
    } catch (error) {
      console.error("Error generating registers:", error);
      res.status(500).json({ message: "Failed to generate registers" });
    }
  });

  // Corporate shareholder routes
  app.post('/api/orgs/:orgId/corporate-shareholders', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { entityShareholderId, shareClassId, quantity, certNumber, issuePrice, issueDate } = req.body;
      const orgId = req.params.orgId;

      // Validate that entityShareholderId is not the same as orgId
      if (entityShareholderId === orgId) {
        return res.status(400).json({ message: "An entity cannot be a shareholder of itself" });
      }

      // Create the share issuance for corporate shareholder
      const shareIssuance = await storage.createShareIssuance({
        orgId,
        shareholderType: "entity",
        entityShareholderId,
        shareClassId,
        quantity: parseInt(quantity),
        certNumber,
        issuePrice: issuePrice ? parseFloat(issuePrice).toString() : null,
        issueDate: new Date(issueDate),
      });

      // Create audit log
      await storage.createAuditLog({
        orgId,
        actorId: userId,
        action: "ADD_CORPORATE_SHAREHOLDER",
        payload: { 
          shareIssuanceId: shareIssuance.id,
          entityShareholderId,
          quantity: parseInt(quantity),
          shareClassId
        }
      });

      res.status(201).json(shareIssuance);
    } catch (error) {
      console.error("Error creating corporate shareholder:", error);
      res.status(500).json({ message: "Failed to create corporate shareholder" });
    }
  });

  // Get corporate shareholdings for an organization
  app.get('/api/orgs/:orgId/corporate-shareholders', isAuthenticated, async (req, res) => {
    try {
      const orgId = req.params.orgId;
      
      // Get share issuances with entity shareholders
      const shareIssuances = await storage.getShareIssuancesByOrg(orgId);
      const corporateShareholdings = shareIssuances.filter(issuance => issuance.shareholderType === 'entity');
      
      res.json(corporateShareholdings);
    } catch (error) {
      console.error("Error fetching corporate shareholders:", error);
      res.status(500).json({ message: "Failed to fetch corporate shareholders" });
    }
  });

  // Starter template routes
  app.post('/api/templates/starter/cbca', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { fileUrl } = req.body;
      
      // Create CBCA Minute Book starter template
      const template = await storage.createTemplate({
        name: "CBCA Minute Book - Federal Corporation",
        code: "CBCA_MINUTE_BOOK",
        scope: "minute-book",
        category: "minute-book",
        fileKey: fileUrl,
        schema: {},
        variables: CBCA_TEMPLATE_VARIABLES,
        isStarter: true,
        ownerId: userId,
        description: "Complete minute book template for Canadian Federal Corporations (CBCA)"
      });

      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating CBCA starter template:", error);
      res.status(500).json({ message: "Failed to create starter template" });
    }
  });

  app.get('/api/templates/starter', isAuthenticated, async (req, res) => {
    try {
      const templates = await storage.getTemplates();
      const starterTemplates = templates.filter(t => t.isStarter);
      res.json(starterTemplates);
    } catch (error) {
      console.error("Error fetching starter templates:", error);
      res.status(500).json({ message: "Failed to fetch starter templates" });
    }
  });

  // Get minute book templates
  app.get('/api/templates/minute-book', isAuthenticated, async (req, res) => {
    try {
      const templates = await storage.getTemplates();
      const minuteBookTemplates = templates.filter(t => 
        t.category === 'minute-book' || 
        t.scope === 'organization' || 
        t.scope === 'bylaws' ||
        t.scope === 'resolution' ||
        t.isStarter
      );
      res.json(minuteBookTemplates);
    } catch (error) {
      console.error("Error fetching minute book templates:", error);
      res.status(500).json({ message: "Failed to fetch minute book templates" });
    }
  });

  // Template management routes
  app.get('/api/orgs/:orgId/templates', isAuthenticated, async (req, res) => {
    try {
      const orgId = req.params.orgId;
      const templates = await storage.getTemplatesByOrg(orgId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.post('/api/orgs/:orgId/templates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const orgId = req.params.orgId;
      const { name, type, description, fileUrl, fileName, fileSize } = req.body;

      const template = await storage.createTemplate({
        name,
        code: `${type.toUpperCase()}_${Date.now()}`, // Generate unique code
        scope: type,
        category: type,
        fileKey: fileUrl,
        schema: {}, // Will be populated when we parse template variables
        variables: {}, // Will be populated when processing template
        isStarter: false,
        ownerId: userId,
        description: description || `Custom ${type} template`,
      });

      // Create enhanced audit log
      await storage.createEnhancedAuditLog({
        orgId,
        actorId: userId,
        action: "UPLOAD_TEMPLATE",
        entityType: "template",
        entityId: template.id,
        newValues: template,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        additionalContext: { 
          name,
          type,
          fileName,
          fileSize: fileSize || 0
        }
      });

      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating template:", error);
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  app.delete('/api/orgs/:orgId/templates/:templateId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { orgId, templateId } = req.params;

      await storage.deleteTemplate(templateId);

      // Create audit log
      await storage.createAuditLog({
        orgId,
        actorId: userId,
        action: "DELETE_TEMPLATE",
        payload: { templateId }
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({ message: "Failed to delete template" });
    }
  });

  // Document routes (temporarily bypassing auth for development)
  app.get('/api/documents/:orgId?', async (req, res) => {
    try {
      const orgId = req.params.orgId;
      if (!orgId) {
        return res.status(400).json({ message: "Organization ID required" });
      }
      
      const documents = await storage.getGeneratedDocsByOrg(orgId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.post('/api/orgs/:orgId/documents', async (req: any, res) => {
    try {
      // Use a default test user ID for development
      const userId = "test-user-123";
      const { documentType } = req.body;
      const orgId = req.params.orgId;

      // Document type templates mapping
      const documentTemplates: Record<string, { name: string; code: string; scope: string }> = {
        "minute-book": { name: "Corporate Minute Book", code: "MINUTE_BOOK", scope: "minute-book" },
        "bylaws": { name: "Corporate By-Laws", code: "BYLAWS", scope: "bylaws" },
        "founding-resolution": { name: "Founding Resolution", code: "FOUNDING_RES", scope: "resolution" },
        "dividend-resolution": { name: "Dividend Resolution", code: "DIVIDEND_RES", scope: "resolution" }
      };

      const templateConfig = documentTemplates[documentType];
      if (!templateConfig) {
        return res.status(400).json({ message: "Invalid document type" });
      }

      // Check if template exists, if not create a placeholder
      let template = await storage.getTemplates().then(templates => 
        templates.find(t => t.code === templateConfig.code)
      );

      if (!template) {
        // Create a placeholder template
        template = await storage.createTemplate({
          name: templateConfig.name,
          code: templateConfig.code,
          scope: templateConfig.scope,
          category: templateConfig.scope,
          fileKey: null, // No actual file yet
          schema: {},
          variables: {},
          isStarter: false,
          ownerId: userId,
          description: `Placeholder template for ${templateConfig.name}`,
        });
      }

      // Create the generated document
      const generatedDoc = await storage.createGeneratedDoc({
        orgId,
        templateId: template.id, // Use actual template ID
        fileKey: `${templateConfig.name}_${new Date().toISOString().split('T')[0]}.docx`,
        dataUsed: { documentType, organizationId: orgId },
        createdBy: userId,
      });

      // Create enhanced audit log
      await storage.createEnhancedAuditLog({
        orgId,
        actorId: userId,
        action: "CREATE_DOCUMENT",
        entityType: "document",
        entityId: generatedDoc.id,
        newValues: generatedDoc,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        additionalContext: { 
          documentType, 
          templateName: templateConfig.name,
          fileName: generatedDoc.fileKey
        }
      });

      res.status(201).json(generatedDoc);
    } catch (error) {
      console.error("Error creating document:", error);
      res.status(500).json({ message: "Failed to create document" });
    }
  });

  app.post('/api/orgs/:orgId/documents/bundle', async (req: any, res) => {
    try {
      // Use a default test user ID for development
      const userId = "test-user-123";
      const { bundleType } = req.body;
      const orgId = req.params.orgId;

      if (bundleType !== "new-corporation") {
        return res.status(400).json({ message: "Invalid bundle type" });
      }

      // Create bundle documents: Minute Book, By-Laws, Founding Resolution
      const bundleDocuments = [
        { name: "Corporate Minute Book", code: "MINUTE_BOOK", scope: "minute-book" },
        { name: "Corporate By-Laws", code: "BYLAWS", scope: "bylaws" },
        { name: "Founding Resolution", code: "FOUNDING_RES", scope: "resolution" }
      ];

      const createdDocs = [];
      const dateStr = new Date().toISOString().split('T')[0];

      for (const templateConfig of bundleDocuments) {
        // Check if template exists, if not create a placeholder
        let template = await storage.getTemplates().then(templates => 
          templates.find(t => t.code === templateConfig.code)
        );

        if (!template) {
          // Create a placeholder template
          template = await storage.createTemplate({
            name: templateConfig.name,
            code: templateConfig.code,
            scope: templateConfig.scope,
            category: templateConfig.scope,
            fileKey: null, // No actual file yet
            schema: {},
            variables: {},
            isStarter: false,
            ownerId: userId,
            description: `Placeholder template for ${templateConfig.name}`,
          });
        }

        const generatedDoc = await storage.createGeneratedDoc({
          orgId,
          templateId: template.id, // Use actual template ID
          fileKey: `${templateConfig.name}_${dateStr}.docx`,
          dataUsed: { documentType: templateConfig.code.toLowerCase(), organizationId: orgId, bundleType },
          createdBy: userId,
        });
        createdDocs.push(generatedDoc);
      }

      // Create audit log for bundle creation
      await storage.createEnhancedAuditLog({
        orgId,
        actorId: userId,
        action: "CREATE_DOCUMENT_BUNDLE",
        entityType: "document_bundle",
        entityId: `bundle-${Date.now()}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        additionalContext: { 
          bundleType: "new-corporation",
          documentsCreated: createdDocs.length,
          documentIds: createdDocs.map(d => d.id),
          documents: createdDocs.map(d => ({ id: d.id, fileKey: d.fileKey, templateId: d.templateId }))
        }
      });

      res.status(201).json({ documents: createdDocs, message: "New Corporation Bundle created successfully" });
    } catch (error) {
      console.error("Error creating document bundle:", error);
      res.status(500).json({ message: "Failed to create document bundle" });
    }
  });

  // Document download route
  app.get('/api/documents/:docId/download', isAuthenticated, async (req: any, res) => {
    try {
      const { docId } = req.params;
      const userId = req.user.claims.sub;
      
      // Get document details
      const document = await storage.getGeneratedDocById(docId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Create audit log for document download
      await storage.createEnhancedAuditLog({
        orgId: document.orgId,
        actorId: userId,
        action: "DOWNLOAD_DOCUMENT",
        entityType: "document",
        entityId: docId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        additionalContext: { 
          fileName: document.fileKey,
          downloadTime: new Date().toISOString()
        }
      });

      // For now, return a placeholder response since we don't have actual file storage yet
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${document.fileKey}"`,
      });
      
      // TODO: Implement actual file serving from object storage
      res.status(501).json({ 
        message: "Document download not yet implemented - need to integrate with object storage",
        documentId: docId,
        fileName: document.fileKey 
      });
    } catch (error) {
      console.error("Error downloading document:", error);
      res.status(500).json({ message: "Failed to download document" });
    }
  });

  // Document view route (for getting document details)
  app.get('/api/documents/:docId', isAuthenticated, async (req, res) => {
    try {
      const { docId } = req.params;
      
      // Get document details with related data
      const document = await storage.getGeneratedDocById(docId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Get organization details to show what data was used
      const org = await storage.getOrgById(document.orgId);
      const people = await storage.getPeopleByOrg(document.orgId);
      const template = await storage.getTemplateById(document.templateId);
      const personOrgRelations = await storage.getPersonOrgRelations(document.orgId);

      // Enrich people with their roles from personOnOrgs table
      const peopleWithRoles = people.map(person => {
        const roles = personOrgRelations.filter(rel => rel.personId === person.id);
        return {
          ...person,
          roles: roles
        };
      });

      res.json({
        ...document,
        organization: org,
        people: peopleWithRoles,
        template: template,
        entityDataSnapshot: {
          orgName: org?.name,
          peopleCount: people.length,
          directors: peopleWithRoles.filter(p => p.roles.some(r => r.role === 'director')),
          officers: peopleWithRoles.filter(p => p.roles.some(r => r.role === 'officer'))
        }
      });
    } catch (error) {
      console.error("Error fetching document details:", error);
      res.status(500).json({ message: "Failed to fetch document details" });
    }
  });

  // PDF Ingestion routes
  // Ensure uploads directory exists
  IngestionWorker.ensureUploadsDirectory();

  // Configure multer for file uploads
  const upload = multer({
    dest: 'uploads/',
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/tiff'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only PDF and image files are allowed.'));
      }
    },
  });

  // Upload PDF and start ingestion job
  app.post('/api/ingest/upload', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const userId = req.user.claims.sub;
      const file = req.file;
      const fileKey = `${nanoid()}_${file.originalname}`;
      
      // Rename uploaded file to use our key
      const newPath = path.join('uploads', fileKey);
      fs.renameSync(file.path, newPath);

      // Create ingestion job record
      const job = await storage.createIngestionJob({
        userId,
        filename: file.originalname,
        fileKey,
        status: 'queued',
        progress: 0,
      });

      // Create audit log for file upload
      await storage.createEnhancedAuditLog({
        actorId: userId,
        action: "UPLOAD_FILE",
        entityType: "file",
        entityId: job.id,
        newValues: {
          filename: file.originalname,
          fileKey,
          fileSize: file.size,
          mimetype: file.mimetype
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        additionalContext: {
          originalName: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          uploadType: "ingestion"
        }
      });

      // Add job to queue
      await addIngestionJob({
        jobId: job.id,
        userId,
        filename: file.originalname,
        fileKey,
      });

      res.json({
        jobId: job.id,
        filename: file.originalname,
        status: 'queued',
        message: 'File uploaded successfully, processing started'
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ message: 'Failed to upload file', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Get job status
  app.get('/api/ingest/jobs/:jobId', isAuthenticated, async (req: any, res) => {
    try {
      const { jobId } = req.params;
      const userId = req.user.claims.sub;
      
      const job = await storage.getIngestionJobById(jobId);
      
      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }
      
      // Verify ownership
      if (job.userId !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      res.json(job);
    } catch (error) {
      console.error('Error fetching job status:', error);
      res.status(500).json({ message: 'Failed to fetch job status' });
    }
  });

  // List user's ingestion jobs
  app.get('/api/ingest/jobs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const jobs = await storage.getIngestionJobsByUser(userId);
      res.json(jobs);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      res.status(500).json({ message: 'Failed to fetch jobs' });
    }
  });

  // Helper function to parse address string into Address object
  function parseAddressString(addressStr: string | undefined | null): Partial<InsertAddress> {
    if (!addressStr) {
      return {
        line1: '',
        city: '',
        region: '',
        country: '',
        postal: ''
      };
    }

    const parts = addressStr.split(',').map(p => p.trim());
    
    // Extract postal code patterns (Canadian or US)
    const canadianPostalMatch = addressStr.match(/([A-Z]\d[A-Z]\s?\d[A-Z]\d)/);
    const usPostalMatch = addressStr.match(/([\d]{5}(?:-[\d]{4})?)/);
    
    let postal = '';
    let country = '';
    
    if (canadianPostalMatch) {
      postal = canadianPostalMatch[1];
      country = 'Canada';
    } else if (usPostalMatch) {
      postal = usPostalMatch[1];
      country = 'United States';
    }
    
    // Parse address components
    if (parts.length >= 3) {
      const line1 = parts.slice(0, -2).join(', ');
      const city = parts[parts.length - 2];
      const lastPart = parts[parts.length - 1];
      
      // Extract region (state/province abbreviation)
      const regionMatch = lastPart.match(/\b([A-Z]{2})\b/);
      const region = regionMatch ? regionMatch[1] : lastPart.replace(/[\d\-\s]/g, '').trim();
      
      // If we have a region but no postal code match, try to infer country from common state codes
      if (!country && region.length === 2) {
        const usStates = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 
                          'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS',
                          'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK',
                          'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV',
                          'WI', 'WY', 'DC'];
        const canadianProvinces = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];
        
        if (usStates.includes(region)) {
          country = 'United States';
        } else if (canadianProvinces.includes(region)) {
          country = 'Canada';
        }
        // If region doesn't match known codes, leave country blank
      }
      
      return {
        line1,
        city,
        region,
        country,
        postal
      };
    }
    
    // Fallback for poorly formatted addresses
    return {
      line1: addressStr,
      city: '',
      region: '',
      country,
      postal
    };
  }

  // Apply extraction results (create entities/people from extraction)
  app.post('/api/ingest/:jobId/apply', isAuthenticated, async (req: any, res) => {
    const { jobId } = req.params;
    const userId = req.user.claims.sub;
    
    const job = await storage.getIngestionJobById(jobId);
    
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    if (job.userId !== userId) {
      return res.status(403).json({ message: 'Access denied: This extraction result belongs to another user' });
    }
    
    if (job.status !== 'completed' || !job.extractionResult) {
      return res.status(400).json({ message: 'Job not completed or no results available' });
    }
    
    const extractionResult = job.extractionResult as any; // ExtractionResult type
    const createdResources = {
      addresses: [] as string[],
      orgId: null as string | null,
      personIds: [] as string[],
      relationshipIds: [] as string[],
      shareClassIds: [] as string[],
      shareIssuanceIds: [] as string[]
    };

    try {
      const createdPersonIds: string[] = [];
      let createdOrgId: string | null = null;
      
      // 1. Create organization if data exists
      if (extractionResult.organization && extractionResult.organization.legalName) {
        const orgData = extractionResult.organization;
        
        // Create registered office address if provided
        let registeredOfficeId: string | undefined;
        if (orgData.registeredOffice) {
          const parsedAddress = parseAddressString(orgData.registeredOffice);
          if (parsedAddress && parsedAddress.line1) {
            const registeredOffice = await storage.createAddress(parsedAddress as InsertAddress);
            registeredOfficeId = registeredOffice.id;
            createdResources.addresses.push(registeredOffice.id);
          }
        }
        
        // Create records office address if provided
        let recordsOfficeId: string | undefined;
        if (orgData.recordsOffice) {
          const parsedAddress = parseAddressString(orgData.recordsOffice);
          if (parsedAddress && parsedAddress.line1) {
            const recordsOffice = await storage.createAddress(parsedAddress as InsertAddress);
            recordsOfficeId = recordsOffice.id;
            createdResources.addresses.push(recordsOffice.id);
          }
        }
        
        // Create organization
        const org = await storage.createOrg({
          name: orgData.legalName,
          number: orgData.number || undefined,
          jurisdiction: orgData.jurisdiction || 'CBCA',
          formationAt: orgData.formationDate ? new Date(orgData.formationDate) : undefined,
          registeredOfficeId,
          recordsOfficeId,
          createdById: userId
        });
        
        createdOrgId = org.id;
        createdResources.orgId = org.id;
        
        // Create audit log for org creation
        await storage.createAuditLog({
          orgId: org.id,
          actorId: userId,
          action: 'CREATE_ORG_FROM_EXTRACTION',
          payload: { 
            orgId: org.id, 
            name: org.name,
            source: 'AI Scanner',
            jobId 
          }
        });
      }
      
      if (!createdOrgId) {
        return res.status(400).json({ message: 'No organization data found in extraction results' });
      }
      
      // 2. Create people from extracted people array
      const allPeople = [...(extractionResult.people || []), ...(extractionResult.shareholders || [])];
      const uniquePeopleMap = new Map();
      
      // Deduplicate people by full name
      for (const personData of allPeople) {
        const key = personData.fullName.toLowerCase().trim();
        if (!uniquePeopleMap.has(key)) {
          uniquePeopleMap.set(key, personData);
        } else {
          // Merge data if person appears multiple times
          const existing = uniquePeopleMap.get(key);
          uniquePeopleMap.set(key, { ...existing, ...personData });
        }
      }
      
      const shareClassMap = new Map<string, string>(); // shareClassName -> shareClassId
      
      // Process each unique person
      for (const [_, personData] of Array.from(uniquePeopleMap)) {
        // Create address if provided
        let addressId: string | undefined;
        if (personData.address || (personData.city && personData.province)) {
          const addressData: any = {};
          
          if (personData.address) {
            const parsed = parseAddressString(personData.address);
            if (parsed) {
              Object.assign(addressData, parsed);
            }
          }
          
          // Override with specific fields if available
          if (personData.city) addressData.city = personData.city;
          if (personData.province) addressData.region = personData.province;
          if (personData.country) addressData.country = personData.country;
          if (personData.postalCode) addressData.postal = personData.postalCode;
          
          // Ensure required fields
          if (!addressData.line1) addressData.line1 = personData.address || 'Unknown';
          if (!addressData.city) addressData.city = 'Unknown';
          if (!addressData.region) addressData.region = 'Unknown';
          if (!addressData.country) addressData.country = 'Canada';
          if (!addressData.postal) addressData.postal = 'Unknown';
          
          const address = await storage.createAddress(addressData);
          addressId = address.id;
          createdResources.addresses.push(address.id);
        }
        
        // Parse first/last name from fullName if not provided
        let firstName = personData.firstName;
        let lastName = personData.lastName;
        
        if (!firstName || !lastName) {
          const nameParts = personData.fullName.trim().split(/\s+/);
          if (nameParts.length === 1) {
            firstName = nameParts[0];
            lastName = nameParts[0];
          } else {
            firstName = nameParts[0];
            lastName = nameParts.slice(1).join(' ');
          }
        }
        
        // Create person
        const person = await storage.createPerson({
          firstName,
          lastName,
          email: personData.email || undefined,
          addressId
        });
        
        createdPersonIds.push(person.id);
        createdResources.personIds.push(person.id);
        
        // 3. Create person-org relationships based on roles
        const roles: Array<{ role: string; title?: string }> = [];
        
        if (personData.isDirector) {
          roles.push({ role: 'Director' });
        }
        
        if (personData.isOfficer) {
          roles.push({ 
            role: 'Officer',
            title: personData.officerTitle
          });
        }
        
        if (personData.isShareholder) {
          roles.push({ role: 'Shareholder' });
        }
        
        // Create each role relationship
        for (const roleData of roles) {
          const relation = await storage.createPersonOnOrg({
            orgId: createdOrgId,
            personId: person.id,
            role: roleData.role,
            title: roleData.title,
            startAt: new Date()
          });
          createdResources.relationshipIds.push(relation.id);
        }
        
        // 4. Create share class and issuance for shareholders
        if (personData.isShareholder && personData.shareClass && personData.shares) {
          // Check if share class already exists
          let shareClassId = shareClassMap.get(personData.shareClass);
          
          if (!shareClassId) {
            // Extract short code from share class name (e.g., "Class A" -> "A")
            const shortCodeMatch = personData.shareClass.match(/Class\s+([A-Z])/i);
            const shortCode = shortCodeMatch ? shortCodeMatch[1].toUpperCase() : personData.shareClass.charAt(0).toUpperCase();
            
            // Create share class
            const shareClass = await storage.createShareClass({
              orgId: createdOrgId,
              name: personData.shareClass,
              shortCode,
              voting: true,
              participating: true,
              redemption: false
            });
            
            shareClassId = shareClass.id;
            shareClassMap.set(personData.shareClass, shareClassId);
            createdResources.shareClassIds.push(shareClass.id);
          }
          
          // Generate certificate number
          const certNumber = `CERT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
          
          // Create share issuance
          const issuance = await storage.createShareIssuance({
            orgId: createdOrgId,
            shareholderType: 'person',
            shareholderId: person.id,
            shareClassId,
            quantity: personData.shares,
            certNumber,
            issueDate: personData.issueDate ? new Date(personData.issueDate) : new Date()
          });
          createdResources.shareIssuanceIds.push(issuance.id);
        }
        
        // Create audit log for person creation
        await storage.createAuditLog({
          orgId: createdOrgId,
          actorId: userId,
          action: 'CREATE_PERSON_FROM_EXTRACTION',
          payload: { 
            personId: person.id,
            name: `${firstName} ${lastName}`,
            roles: roles.map(r => r.role),
            source: 'AI Scanner',
            jobId 
          }
        });
      }
      
      res.json({ 
        success: true, 
        orgId: createdOrgId, 
        personIds: createdPersonIds,
        message: `Successfully created organization and ${createdPersonIds.length} people from extraction results`
      });
    } catch (error) {
      console.error('Error applying extraction results:', error);
      
      // Attempt cleanup of partially created records
      try {
        for (const id of createdResources.shareIssuanceIds) {
          await storage.deleteShareIssuance(id).catch(() => {});
        }
        for (const id of createdResources.shareClassIds) {
          await storage.deleteShareClass(id).catch(() => {});
        }
        for (const id of createdResources.relationshipIds) {
          await storage.deletePersonOnOrg(id).catch(() => {});
        }
        if (createdResources.orgId) {
          await storage.deleteOrg(createdResources.orgId).catch(() => {});
        }
      } catch (cleanupError) {
        console.error('Cleanup failed:', cleanupError);
      }
      
      return res.status(500).json({ 
        message: 'Failed to apply extraction results', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Minute Books API routes
  app.get('/api/orgs/:orgId/minute-books', isAuthenticated, async (req, res) => {
    try {
      const { orgId } = req.params;
      const minuteBooks = await storage.getMinuteBooks(orgId);
      res.json(minuteBooks);
    } catch (error) {
      console.error("Error fetching minute books:", error);
      res.status(500).json({ message: "Failed to fetch minute books" });
    }
  });

  app.post('/api/orgs/:orgId/minute-books', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      const userId = req.user.claims.sub;
      const { name, type, fiscalYear, description, templateIds } = req.body;

      if (!name || !type || !templateIds || templateIds.length === 0) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const minuteBook = await storage.createMinuteBook({
        orgId,
        name,
        type,
        fiscalYear,
        description,
        status: "draft",
        createdBy: userId,
      });

      for (let i = 0; i < templateIds.length; i++) {
        await storage.createMinuteBookDoc({
          minuteBookId: minuteBook.id,
          templateId: templateIds[i],
          sortOrder: i,
          status: "pending",
        });
      }

      res.status(201).json(minuteBook);
    } catch (error) {
      console.error("Error creating minute book:", error);
      res.status(500).json({ message: "Failed to create minute book" });
    }
  });

  // Corporate Formation Minute Book API endpoint
  app.post('/api/orgs/:orgId/minute-books/corporate-formation', isAuthenticated, async (req: any, res) => {
    try {
      const { orgId } = req.params;
      const userId = req.user.claims.sub;
      const { name, description, selectedResolutions, customizations } = req.body;

      if (!name || !selectedResolutions || selectedResolutions.length === 0) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Get current entity data for generation
      const entityData = await storage.getEntityDataForGeneration(orgId);

      const minuteBook = await storage.createMinuteBook({
        orgId,
        name,
        type: "incorporation",
        description,
        status: "draft",
        createdBy: userId,
        isPreConfigured: true,
        selectedResolutions,
        resolutionCustomizations: customizations,
        generationData: entityData,
      });

      res.status(201).json(minuteBook);
    } catch (error) {
      console.error("Error creating corporate formation minute book:", error);
      res.status(500).json({ message: "Failed to create corporate formation minute book" });
    }
  });

  // Entity data endpoint for auto-population
  app.get('/api/orgs/:orgId/entity-data', isAuthenticated, async (req, res) => {
    try {
      const { orgId } = req.params;
      const entityData = await storage.getEntityDataForGeneration(orgId);
      res.json(entityData);
    } catch (error) {
      console.error("Error fetching entity data:", error);
      res.status(500).json({ message: "Failed to fetch entity data" });
    }
  });

  app.post('/api/minute-books/:id/generate', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.updateMinuteBook(id, { status: "generating" });
      
      setTimeout(async () => {
        try {
          await storage.updateMinuteBook(id, { 
            status: "ready",
            bundleFileKey: `minute-book-${id}.pdf`
          });
        } catch (error) {
          await storage.updateMinuteBook(id, { status: "error" });
        }
      }, 5000);

      res.json({ message: "Generation started" });
    } catch (error) {
      console.error("Error generating minute book:", error);
      res.status(500).json({ message: "Failed to generate minute book" });
    }
  });

  app.delete('/api/minute-books/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteMinuteBook(id);
      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting minute book:", error);
      res.status(500).json({ message: "Failed to delete minute book" });
    }
  });

  // Stripe payment routes for subscription billing
  app.post("/api/create-payment-intent", isAuthenticated, async (req: any, res) => {
    try {
      const { amount } = req.body;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        metadata: {
          userId: req.user.claims.sub
        }
      });
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Subscription management endpoint
  app.post('/api/create-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { priceId } = req.body; // Stripe price ID from frontend
      
      let user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // If user already has an active subscription, return existing details
      if (user.stripeSubscriptionId) {
        try {
          const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          if (subscription.status === 'active') {
            return res.json({
              subscriptionId: subscription.id,
              status: subscription.status,
              currentPeriodEnd: (subscription as any).current_period_end
            });
          }
        } catch (error) {
          console.log("Existing subscription not found, creating new one");
        }
      }
      
      if (!user.email) {
        return res.status(400).json({ message: 'User email is required for billing' });
      }

      // Create or retrieve Stripe customer
      let stripeCustomer;
      if (user.stripeCustomerId) {
        try {
          stripeCustomer = await stripe.customers.retrieve(user.stripeCustomerId);
        } catch (error) {
          stripeCustomer = null;
        }
      }

      if (!stripeCustomer) {
        stripeCustomer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          metadata: { userId }
        });
        
        // Update user with Stripe customer ID
        await storage.updateUserBilling(userId, {
          stripeCustomerId: stripeCustomer.id
        });
      }

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: stripeCustomer.id,
        items: [{
          price: priceId
        }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });

      // Update user with subscription details
      await storage.updateUserBilling(userId, {
        stripeCustomerId: stripeCustomer.id,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status
      });

      const invoice = subscription.latest_invoice as Stripe.Invoice;
      const paymentIntent = (invoice as any).payment_intent as Stripe.PaymentIntent;
  
      res.json({
        subscriptionId: subscription.id,
        clientSecret: paymentIntent.client_secret,
      });
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      return res.status(500).json({ message: "Error creating subscription: " + error.message });
    }
  });

  // Get subscription status
  app.get('/api/subscription-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.stripeSubscriptionId) {
        return res.json({ status: 'inactive', subscription: null });
      }

      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      
      res.json({
        status: subscription.status,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          current_period_start: (subscription as any).current_period_start,
          current_period_end: (subscription as any).current_period_end,
          cancel_at_period_end: (subscription as any).cancel_at_period_end
        }
      });
    } catch (error: any) {
      console.error("Error fetching subscription status:", error);
      res.status(500).json({ message: "Error fetching subscription status" });
    }
  });

  // Cancel subscription
  app.delete('/api/cancel-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || !user.stripeSubscriptionId) {
        return res.status(404).json({ message: "No active subscription found" });
      }

      const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true
      });

      await storage.updateUserBilling(userId, {
        subscriptionStatus: subscription.status
      });

      res.json({ message: "Subscription will cancel at period end", subscription });
    } catch (error: any) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({ message: "Error canceling subscription" });
    }
  });

  // ========================================
  // COMPLIANCE ROUTES
  // ========================================

  // Get compliance review for an organization
  app.get('/api/compliance/review/:orgId', async (req, res) => {
    try {
      const { orgId } = req.params;
      
      // For now, return mock data or stored review
      // In a real implementation, this would fetch from database
      const mockReview: ComplianceReview = {
        id: `review-${orgId}`,
        status: "completed",
        overallScore: 85,
        gaps: [
          {
            id: "gap-1",
            category: "annual-return",
            severity: "medium",
            description: "Annual return filing is approaching deadline",
            recommendation: "File annual return before due date to avoid penalties",
            status: "pending"
          }
        ],
        lastRunAt: new Date().toISOString(),
        documentsAnalyzed: 5,
        recommendations: [
          "Consider scheduling quarterly board meetings to maintain compliance",
          "Update corporate records to reflect recent changes"
        ]
      };

      res.json(mockReview);
    } catch (error) {
      console.error("Error fetching compliance review:", error);
      res.status(500).json({ message: "Failed to fetch compliance review" });
    }
  });

  // Run AI compliance analysis
  app.post('/api/compliance/analyze/:orgId', async (req, res) => {
    try {
      const { orgId } = req.params;
      
      // Get organization documents
      const documents = await storage.getGeneratedDocsByOrg(orgId);
      
      // Transform documents for analysis
      const documentContents = documents.map((doc: any) => ({
        name: doc.fileKey || 'Unknown Document',
        content: doc.content || '',
        type: 'document'
      }));

      // Run AI analysis
      const review = await complianceService.analyzeDocuments(documentContents);
      
      // In a real implementation, you would store this in the database
      res.json({ message: "Analysis started", reviewId: review.id });
    } catch (error) {
      console.error("Error running compliance analysis:", error);
      res.status(500).json({ message: "Failed to run compliance analysis" });
    }
  });

  // Resolve compliance gap
  app.patch('/api/compliance/gaps/:gapId/resolve', async (req, res) => {
    try {
      const { gapId } = req.params;
      
      // In a real implementation, update the gap status in database
      res.json({ message: "Gap resolved", gapId });
    } catch (error) {
      console.error("Error resolving compliance gap:", error);
      res.status(500).json({ message: "Failed to resolve compliance gap" });
    }
  });

  // Get compliance deadlines for an organization
  app.get('/api/compliance/deadlines/:orgId', async (req, res) => {
    try {
      const { orgId } = req.params;
      
      // Get organization details
      const org = await storage.getOrgById(orgId);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Generate AI-powered deadlines
      const aiDeadlines = await complianceService.generateComplianceDeadlines(org);
      
      // Mock some deadlines for demonstration
      const mockDeadlines = [
        {
          id: "deadline-1",
          title: "Annual Return Filing",
          description: "File annual return with corporate registry",
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          category: "annual-return",
          priority: "high",
          status: "pending",
          isAutoGenerated: true,
          reminderSent: false,
          createdAt: new Date().toISOString()
        },
        ...aiDeadlines.map((deadline: any, index: number) => ({
          id: `ai-deadline-${index}`,
          ...deadline,
          status: "pending",
          isAutoGenerated: true,
          reminderSent: false,
          createdAt: new Date().toISOString()
        }))
      ];

      res.json(mockDeadlines);
    } catch (error) {
      console.error("Error fetching compliance deadlines:", error);
      res.status(500).json({ message: "Failed to fetch compliance deadlines" });
    }
  });

  // Add new compliance deadline
  app.post('/api/compliance/deadlines', async (req, res) => {
    try {
      const { title, description, dueDate, category, priority, orgId } = req.body;
      
      const newDeadline = {
        id: `deadline-${Date.now()}`,
        title,
        description,
        dueDate,
        category,
        priority,
        status: "pending",
        isAutoGenerated: false,
        reminderSent: false,
        createdAt: new Date().toISOString()
      };

      // In a real implementation, save to database
      res.json(newDeadline);
    } catch (error) {
      console.error("Error adding compliance deadline:", error);
      res.status(500).json({ message: "Failed to add compliance deadline" });
    }
  });

  // Mark deadline as complete
  app.patch('/api/compliance/deadlines/:deadlineId/complete', async (req, res) => {
    try {
      const { deadlineId } = req.params;
      
      // In a real implementation, update deadline status in database
      res.json({ message: "Deadline completed", deadlineId });
    } catch (error) {
      console.error("Error completing deadline:", error);
      res.status(500).json({ message: "Failed to complete deadline" });
    }
  });

  // Export calendar
  app.post('/api/compliance/deadlines/export/:format', async (req, res) => {
    try {
      const { format } = req.params;
      const { orgId } = req.body;
      
      if (!['google', 'outlook'].includes(format)) {
        return res.status(400).json({ message: "Invalid calendar format" });
      }

      // Get deadlines (mock for now)
      const deadlines = [
        {
          id: "deadline-1",
          title: "Annual Return Filing",
          description: "File annual return with corporate registry",
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          category: "annual-return"
        }
      ];

      // Generate calendar file
      const calendarContent = complianceService.generateCalendarFile(deadlines, format as 'google' | 'outlook');
      
      // In a real implementation, save file and return download URL
      const fileName = `compliance-calendar-${orgId}.ics`;
      const downloadUrl = `/tmp/calendar-exports/${fileName}`;
      
      res.json({ downloadUrl });
    } catch (error) {
      console.error("Error exporting calendar:", error);
      res.status(500).json({ message: "Failed to export calendar" });
    }
  });

  // Global search endpoint
  app.get("/api/search", async (req, res) => {
    try {
      const { q: query } = req.query;
      
      if (!query || typeof query !== 'string' || query.trim().length < 2) {
        return res.json({
          entities: [],
          people: [],
          total: 0
        });
      }

      const searchTerm = query.trim().toLowerCase();
      
      // Search entities
      const entities = await storage.searchEntities(searchTerm);
      
      // Search people across all entities
      const people = await storage.searchPeople(searchTerm);
      
      res.json({
        entities,
        people,
        total: entities.length + people.length
      });
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ error: "Failed to perform search" });
    }
  });

  // Entity relationship routes
  app.get('/api/entity-relationships/:orgId', async (req: any, res) => {
    try {
      const { orgId } = req.params;
      
      // Validate that the organization exists
      const org = await storage.getOrgById(orgId);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const relationships = await storage.getEntityRelationshipsByOrg(orgId);
      res.json(relationships);
    } catch (error) {
      console.error("Error fetching entity relationships:", error);
      res.status(500).json({ message: "Failed to fetch entity relationships" });
    }
  });

  app.post('/api/entity-relationships', async (req: any, res) => {
    try {
      // Use a default test user ID for development
      const userId = "test-user-123";
      
      // Convert date strings to Date objects if provided
      const processedBody = { ...req.body };
      if (processedBody.effectiveDate && processedBody.effectiveDate !== '') {
        processedBody.effectiveDate = new Date(processedBody.effectiveDate);
      }
      if (processedBody.endDate && processedBody.endDate !== '') {
        processedBody.endDate = new Date(processedBody.endDate);
      }
      
      // Remove empty string dates to avoid validation errors
      if (processedBody.effectiveDate === '') {
        delete processedBody.effectiveDate;
      }
      if (processedBody.endDate === '') {
        delete processedBody.endDate;
      }

      // Validate relationship types
      const validRelationshipTypes = ["subsidiary", "parent", "sister", "related", "joint_venture"];
      if (!validRelationshipTypes.includes(processedBody.relationshipType)) {
        return res.status(400).json({ 
          message: `Invalid relationship type. Must be one of: ${validRelationshipTypes.join(", ")}` 
        });
      }

      // Validate ownership percentage if provided
      if (processedBody.ownershipPercentage !== undefined) {
        const percentage = parseFloat(processedBody.ownershipPercentage);
        if (isNaN(percentage) || percentage < 0 || percentage > 100) {
          return res.status(400).json({ 
            message: "Ownership percentage must be a number between 0 and 100" 
          });
        }
        processedBody.ownershipPercentage = percentage.toString();
      }

      // Validate that parent and child entities exist and are different
      const [parentEntity, childEntity] = await Promise.all([
        storage.getOrgById(processedBody.parentEntityId),
        storage.getOrgById(processedBody.childEntityId)
      ]);

      if (!parentEntity) {
        return res.status(400).json({ message: "Parent entity not found" });
      }
      if (!childEntity) {
        return res.status(400).json({ message: "Child entity not found" });
      }
      if (processedBody.parentEntityId === processedBody.childEntityId) {
        return res.status(400).json({ message: "Parent and child entities must be different" });
      }

      const relationshipData = insertEntityRelationshipSchema.parse({
        ...processedBody,
        createdBy: userId
      });
      
      const relationship = await storage.createEntityRelationship(relationshipData);
      
      // Create audit log
      await storage.createAuditLog({
        orgId: relationship.parentEntityId,
        actorId: userId,
        action: "CREATE_ENTITY_RELATIONSHIP",
        payload: { 
          relationshipId: relationship.id,
          parentEntity: parentEntity.name,
          childEntity: childEntity.name,
          relationshipType: relationship.relationshipType,
          ownershipPercentage: relationship.ownershipPercentage
        }
      });

      // Return relationship with full entity details
      const relationshipWithEntities = {
        ...relationship,
        parentEntity,
        childEntity
      };

      res.status(201).json(relationshipWithEntities);
    } catch (error) {
      console.error("Error creating entity relationship:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create entity relationship" });
    }
  });

  app.put('/api/entity-relationships/:id', async (req: any, res) => {
    try {
      // Use a default test user ID for development
      const userId = "test-user-123";
      const { id } = req.params;
      
      // Check if relationship exists
      const existingRelationship = await storage.getEntityRelationshipById(id);
      if (!existingRelationship) {
        return res.status(404).json({ message: "Entity relationship not found" });
      }

      // Convert date strings to Date objects if provided
      const processedBody = { ...req.body };
      if (processedBody.effectiveDate && processedBody.effectiveDate !== '') {
        processedBody.effectiveDate = new Date(processedBody.effectiveDate);
      }
      if (processedBody.endDate && processedBody.endDate !== '') {
        processedBody.endDate = new Date(processedBody.endDate);
      }
      
      // Remove empty string dates to avoid validation errors
      if (processedBody.effectiveDate === '') {
        delete processedBody.effectiveDate;
      }
      if (processedBody.endDate === '') {
        delete processedBody.endDate;
      }

      // Validate relationship types if provided
      if (processedBody.relationshipType) {
        const validRelationshipTypes = ["subsidiary", "parent", "sister", "related", "joint_venture"];
        if (!validRelationshipTypes.includes(processedBody.relationshipType)) {
          return res.status(400).json({ 
            message: `Invalid relationship type. Must be one of: ${validRelationshipTypes.join(", ")}` 
          });
        }
      }

      // Validate ownership percentage if provided
      if (processedBody.ownershipPercentage !== undefined) {
        const percentage = parseFloat(processedBody.ownershipPercentage);
        if (isNaN(percentage) || percentage < 0 || percentage > 100) {
          return res.status(400).json({ 
            message: "Ownership percentage must be a number between 0 and 100" 
          });
        }
        processedBody.ownershipPercentage = percentage.toString();
      }

      // Validate entities if IDs are being changed
      if (processedBody.parentEntityId || processedBody.childEntityId) {
        const parentId = processedBody.parentEntityId || existingRelationship.parentEntityId;
        const childId = processedBody.childEntityId || existingRelationship.childEntityId;

        if (parentId === childId) {
          return res.status(400).json({ message: "Parent and child entities must be different" });
        }

        const [parentEntity, childEntity] = await Promise.all([
          storage.getOrgById(parentId),
          storage.getOrgById(childId)
        ]);

        if (!parentEntity) {
          return res.status(400).json({ message: "Parent entity not found" });
        }
        if (!childEntity) {
          return res.status(400).json({ message: "Child entity not found" });
        }
      }

      const updates = insertEntityRelationshipSchema.partial().parse(processedBody);
      const updatedRelationship = await storage.updateEntityRelationship(id, updates);
      
      // Create audit log
      await storage.createAuditLog({
        orgId: updatedRelationship.parentEntityId,
        actorId: userId,
        action: "UPDATE_ENTITY_RELATIONSHIP",
        payload: { 
          relationshipId: updatedRelationship.id,
          updates
        }
      });

      // Get full entity details for response
      const [parentEntity, childEntity] = await Promise.all([
        storage.getOrgById(updatedRelationship.parentEntityId),
        storage.getOrgById(updatedRelationship.childEntityId)
      ]);

      const relationshipWithEntities = {
        ...updatedRelationship,
        parentEntity,
        childEntity
      };

      res.json(relationshipWithEntities);
    } catch (error) {
      console.error("Error updating entity relationship:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to update entity relationship" });
    }
  });

  app.delete('/api/entity-relationships/:id', async (req: any, res) => {
    try {
      // Use a default test user ID for development
      const userId = "test-user-123";
      const { id } = req.params;
      
      // Check if relationship exists
      const existingRelationship = await storage.getEntityRelationshipById(id);
      if (!existingRelationship) {
        return res.status(404).json({ message: "Entity relationship not found" });
      }

      await storage.deleteEntityRelationship(id);
      
      // Create audit log
      await storage.createAuditLog({
        orgId: existingRelationship.parentEntityId,
        actorId: userId,
        action: "DELETE_ENTITY_RELATIONSHIP",
        payload: { 
          relationshipId: id,
          parentEntityId: existingRelationship.parentEntityId,
          childEntityId: existingRelationship.childEntityId,
          relationshipType: existingRelationship.relationshipType
        }
      });

      res.json({ message: "Entity relationship deleted successfully" });
    } catch (error) {
      console.error("Error deleting entity relationship:", error);
      res.status(500).json({ message: "Failed to delete entity relationship" });
    }
  });

  // Document Draft routes
  app.get('/api/drafts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const drafts = await storage.listDraftsByUser(userId);
      res.json(drafts);
    } catch (error) {
      console.error("Error fetching drafts:", error);
      res.status(500).json({ message: "Failed to fetch drafts" });
    }
  });

  app.get('/api/drafts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const draft = await storage.getDraft(req.params.id);
      
      if (!draft) {
        return res.status(404).json({ message: "Draft not found" });
      }

      if (draft.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(draft);
    } catch (error) {
      console.error("Error fetching draft:", error);
      res.status(500).json({ message: "Failed to fetch draft" });
    }
  });

  app.post('/api/drafts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const draftData = insertDocumentDraftSchema.parse({
        ...req.body,
        userId
      });

      const draft = await storage.createDraft(draftData);
      res.status(201).json(draft);
    } catch (error) {
      console.error("Error creating draft:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create draft" });
    }
  });

  app.patch('/api/drafts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const draft = await storage.getDraft(req.params.id);
      
      if (!draft) {
        return res.status(404).json({ message: "Draft not found" });
      }

      if (draft.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updates = insertDocumentDraftSchema.partial().parse(req.body);
      const updatedDraft = await storage.updateDraft(req.params.id, updates);
      
      res.json(updatedDraft);
    } catch (error) {
      console.error("Error updating draft:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to update draft" });
    }
  });

  app.delete('/api/drafts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const draft = await storage.getDraft(req.params.id);
      
      if (!draft) {
        return res.status(404).json({ message: "Draft not found" });
      }

      if (draft.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteDraft(req.params.id);
      res.json({ message: "Draft deleted successfully" });
    } catch (error) {
      console.error("Error deleting draft:", error);
      res.status(500).json({ message: "Failed to delete draft" });
    }
  });

  // Contract routes
  app.get('/api/contracts', async (req: any, res) => {
    try {
      const userId = "test-user-123";
      const contracts = await storage.getContracts(userId);
      res.json(contracts);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  app.get('/api/contracts/:id', async (req, res) => {
    try {
      const contract = await storage.getContractById(req.params.id);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      res.json(contract);
    } catch (error) {
      console.error("Error fetching contract:", error);
      res.status(500).json({ message: "Failed to fetch contract" });
    }
  });

  app.post('/api/contracts', async (req: any, res) => {
    try {
      const userId = "test-user-123";
      
      // Convert date strings to Date objects if provided
      const processedBody = { ...req.body };
      if (processedBody.effectiveDate) {
        processedBody.effectiveDate = new Date(processedBody.effectiveDate);
      }
      if (processedBody.expirationDate) {
        processedBody.expirationDate = new Date(processedBody.expirationDate);
      }
      if (processedBody.renewalDate) {
        processedBody.renewalDate = new Date(processedBody.renewalDate);
      }
      
      const contractData = insertContractSchema.parse({ ...processedBody, createdBy: userId });
      const contract = await storage.createContract(contractData);
      
      // Create enhanced audit log
      await storage.createEnhancedAuditLog({
        orgId: contract.orgId,
        actorId: userId,
        action: "CREATE_CONTRACT",
        entityType: "contract",
        entityId: contract.id,
        newValues: contract,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        additionalContext: { name: contract.name, contractType: contract.contractType }
      });

      res.status(201).json(contract);
    } catch (error) {
      console.error("Error creating contract:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create contract" });
    }
  });

  app.patch('/api/contracts/:id', async (req: any, res) => {
    try {
      const userId = "test-user-123";
      
      // Get the old contract for audit log
      const oldContract = await storage.getContractById(req.params.id);
      if (!oldContract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      
      // Convert date strings to Date objects if provided
      const processedBody = { ...req.body };
      if (processedBody.effectiveDate) {
        processedBody.effectiveDate = new Date(processedBody.effectiveDate);
      }
      if (processedBody.expirationDate) {
        processedBody.expirationDate = new Date(processedBody.expirationDate);
      }
      if (processedBody.renewalDate) {
        processedBody.renewalDate = new Date(processedBody.renewalDate);
      }
      
      const updates = insertContractSchema.partial().parse(processedBody);
      const contract = await storage.updateContract(req.params.id, updates);
      
      // Create enhanced audit log
      await storage.createEnhancedAuditLog({
        orgId: contract.orgId,
        actorId: userId,
        action: "UPDATE_CONTRACT",
        entityType: "contract",
        entityId: contract.id,
        oldValues: oldContract,
        newValues: contract,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        additionalContext: { name: contract.name }
      });

      res.json(contract);
    } catch (error) {
      console.error("Error updating contract:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to update contract" });
    }
  });

  app.delete('/api/contracts/:id', async (req: any, res) => {
    try {
      const userId = "test-user-123";
      
      const contract = await storage.getContractById(req.params.id);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      await storage.deleteContract(req.params.id);
      
      // Create audit log
      await storage.createAuditLog({
        orgId: contract.orgId,
        actorId: userId,
        action: "DELETE_CONTRACT",
        payload: { contractId: req.params.id, name: contract.name }
      });

      res.json({ message: "Contract deleted successfully" });
    } catch (error) {
      console.error("Error deleting contract:", error);
      res.status(500).json({ message: "Failed to delete contract" });
    }
  });

  app.get('/api/contracts/org/:orgId', async (req, res) => {
    try {
      const contracts = await storage.getContractsByOrg(req.params.orgId);
      res.json(contracts);
    } catch (error) {
      console.error("Error fetching contracts by org:", error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  app.post('/api/contracts/:id/version', async (req: any, res) => {
    try {
      const userId = "test-user-123";
      const contractId = req.params.id;
      
      const contract = await storage.getContractById(contractId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      // Get existing versions to determine next version number
      const versions = await storage.getContractVersions(contractId);
      const nextVersionNumber = versions.length > 0 
        ? Math.max(...versions.map(v => v.versionNumber)) + 1 
        : 1;

      const versionData = insertContractVersionSchema.parse({
        contractId,
        versionNumber: nextVersionNumber,
        content: req.body.content || contract.content || '',
        fileKey: req.body.fileKey,
        pdfKey: req.body.pdfKey,
        changesSummary: req.body.changesSummary,
        changeLog: req.body.changeLog,
        snapshot: req.body.snapshot, // Store full contract state snapshot
        isCurrent: true,
        createdBy: userId
      });

      const version = await storage.createContractVersion(versionData);
      
      // Set this version as current (will set all others to false)
      await storage.setCurrentVersion(contractId, version.id);
      
      // Create audit log
      await storage.createAuditLog({
        orgId: contract.orgId,
        actorId: userId,
        action: "CREATE_CONTRACT_VERSION",
        payload: { 
          contractId, 
          versionId: version.id,
          versionNumber: version.versionNumber 
        }
      });

      res.status(201).json(version);
    } catch (error) {
      console.error("Error creating contract version:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create contract version" });
    }
  });

  // Add POST route for creating versions (plural endpoint)
  app.post('/api/contracts/:id/versions', async (req: any, res) => {
    try {
      const userId = "test-user-123";
      const contractId = req.params.id;
      
      const contract = await storage.getContractById(contractId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      // Get existing versions to determine next version number
      const versions = await storage.getContractVersions(contractId);
      const nextVersionNumber = versions.length > 0 
        ? Math.max(...versions.map(v => v.versionNumber)) + 1 
        : 1;

      const versionData = insertContractVersionSchema.parse({
        contractId,
        versionNumber: nextVersionNumber,
        content: req.body.content || contract.content || '',
        fileKey: req.body.fileKey,
        pdfKey: req.body.pdfKey,
        changesSummary: req.body.changesSummary,
        changeLog: req.body.changeLog,
        snapshot: req.body.snapshot, // Store full contract state snapshot
        isCurrent: true,
        createdBy: userId
      });

      const version = await storage.createContractVersion(versionData);
      
      // Set this version as current (will set all others to false)
      await storage.setCurrentVersion(contractId, version.id);
      
      // Create audit log
      await storage.createAuditLog({
        orgId: contract.orgId,
        actorId: userId,
        action: "CREATE_CONTRACT_VERSION",
        payload: { 
          contractId, 
          versionId: version.id,
          versionNumber: version.versionNumber 
        }
      });

      res.status(201).json(version);
    } catch (error) {
      console.error("Error creating contract version:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create contract version" });
    }
  });

  app.get('/api/contracts/:id/versions', async (req, res) => {
    try {
      const versions = await storage.getContractVersions(req.params.id);
      res.json(versions);
    } catch (error) {
      console.error("Error fetching contract versions:", error);
      res.status(500).json({ message: "Failed to fetch contract versions" });
    }
  });

  app.get('/api/contracts/:id/parties', async (req, res) => {
    try {
      const contractId = req.params.id;
      
      const contract = await storage.getContractById(contractId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      res.json(contract.parties || []);
    } catch (error) {
      console.error("Error fetching contract parties:", error);
      res.status(500).json({ message: "Failed to fetch contract parties" });
    }
  });

  app.post('/api/contracts/:id/parties', async (req: any, res) => {
    try {
      const userId = "test-user-123";
      const contractId = req.params.id;
      
      const contract = await storage.getContractById(contractId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      const partyData = insertContractPartySchema.parse({
        ...req.body,
        contractId
      });

      const party = await storage.createContractParty(partyData);
      
      // Create audit log
      await storage.createAuditLog({
        orgId: contract.orgId,
        actorId: userId,
        action: "ADD_CONTRACT_PARTY",
        payload: { 
          contractId, 
          partyId: party.id,
          role: party.role 
        }
      });

      res.status(201).json(party);
    } catch (error) {
      console.error("Error adding contract party:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to add contract party" });
    }
  });

  app.get('/api/contracts/:id/obligations', async (req, res) => {
    try {
      const contractId = req.params.id;
      
      const contract = await storage.getContractById(contractId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      res.json(contract.obligations || []);
    } catch (error) {
      console.error("Error fetching contract obligations:", error);
      res.status(500).json({ message: "Failed to fetch contract obligations" });
    }
  });

  app.post('/api/contracts/:id/obligations', async (req: any, res) => {
    try {
      const userId = "test-user-123";
      const contractId = req.params.id;
      
      const contract = await storage.getContractById(contractId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      // Convert date strings to Date objects if provided
      const processedBody = { ...req.body };
      if (processedBody.dueDate) {
        processedBody.dueDate = new Date(processedBody.dueDate);
      }
      if (processedBody.completedAt) {
        processedBody.completedAt = new Date(processedBody.completedAt);
      }

      const obligationData = insertContractObligationSchema.parse({
        ...processedBody,
        contractId
      });

      const obligation = await storage.createContractObligation(obligationData);
      
      // Create audit log
      await storage.createAuditLog({
        orgId: contract.orgId,
        actorId: userId,
        action: "ADD_CONTRACT_OBLIGATION",
        payload: { 
          contractId, 
          obligationId: obligation.id,
          title: obligation.title 
        }
      });

      res.status(201).json(obligation);
    } catch (error) {
      console.error("Error adding contract obligation:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to add contract obligation" });
    }
  });

  // Analyze contract with AI
  app.post('/api/contracts/:id/analyze', async (req: any, res) => {
    try {
      const userId = "test-user-123";
      const contractId = req.params.id;
      
      const contract = await storage.getContractById(contractId);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      if (!contract.content || contract.content.trim().length === 0) {
        return res.status(400).json({ message: "Contract has no content to analyze" });
      }

      // Import the ContractAnalyzer
      const { ContractAnalyzer } = await import('./services/contractAnalyzer');
      const analyzer = new ContractAnalyzer();
      
      // Perform analysis
      let analysis;
      try {
        analysis = await analyzer.analyzeContract(contract.content);
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          console.error('Contract analysis parse error:', error.errors);
          console.error('Failed to parse GPT response - this may indicate the AI returned unexpected data types');
          return res.status(400).json({ 
            message: 'Failed to parse AI analysis results. The AI may have returned data in an unexpected format.',
            errors: error.errors 
          });
        }
        throw error;
      }
      
      // Update contract with analysis results
      const contractUpdates: any = {};
      if (analysis.aiSummary) contractUpdates.aiSummary = analysis.aiSummary;
      if (analysis.riskLevel) contractUpdates.riskLevel = analysis.riskLevel;
      if (analysis.complianceStatus) contractUpdates.complianceStatus = analysis.complianceStatus;
      if (analysis.contractType) contractUpdates.contractType = analysis.contractType;
      if (analysis.contractValue) contractUpdates.contractValue = analysis.contractValue.toString();
      if (analysis.currency) contractUpdates.currency = analysis.currency;
      if (analysis.governingLaw) contractUpdates.governingLaw = analysis.governingLaw;
      if (analysis.autoRenewal !== undefined) contractUpdates.autoRenewal = analysis.autoRenewal;
      if (analysis.renewalNoticeDays) contractUpdates.renewalNoticeDays = analysis.renewalNoticeDays;
      if (analysis.terminationNoticeDays) contractUpdates.terminationNoticeDays = analysis.terminationNoticeDays;
      
      // Handle dates
      if (analysis.effectiveDate) {
        contractUpdates.effectiveDate = new Date(analysis.effectiveDate);
      }
      if (analysis.expirationDate) {
        contractUpdates.expirationDate = new Date(analysis.expirationDate);
      }
      if (analysis.renewalDate) {
        contractUpdates.renewalDate = new Date(analysis.renewalDate);
      }

      await storage.updateContract(contractId, contractUpdates);
      
      // Create parties from analysis
      for (const party of analysis.parties) {
        try {
          await storage.createContractParty({
            contractId,
            partyType: 'external',
            externalPartyName: party.name,
            role: party.role,
            signatureStatus: 'pending'
          });
        } catch (error) {
          console.error("Error creating party:", error);
        }
      }
      
      // Create obligations from analysis
      for (const obligation of analysis.obligations) {
        try {
          const obligationData: any = {
            contractId,
            title: `${obligation.party}: ${obligation.description.substring(0, 100)}`,
            description: obligation.description,
            obligationType: 'general',
            priority: obligation.priority,
            status: 'pending'
          };
          
          if (obligation.dueDate) {
            obligationData.dueDate = new Date(obligation.dueDate);
          }
          
          await storage.createContractObligation(obligationData);
        } catch (error) {
          console.error("Error creating obligation:", error);
        }
      }
      
      // Create audit log
      await storage.createAuditLog({
        orgId: contract.orgId,
        actorId: userId,
        action: "AI_ANALYZE_CONTRACT",
        payload: { 
          contractId,
          confidence: analysis.confidence,
          partiesFound: analysis.parties.length,
          obligationsFound: analysis.obligations.length,
          risksFound: analysis.risks.length
        }
      });

      res.json(analysis);
    } catch (error: any) {
      console.error("Error analyzing contract:", error);
      res.status(500).json({ 
        message: "Failed to analyze contract",
        error: error.message 
      });
    }
  });

  app.get('/api/clauses', async (req: any, res) => {
    try {
      const userId = "test-user-123";
      const clauses = await storage.getClauses(userId);
      res.json(clauses);
    } catch (error) {
      console.error("Error fetching clauses:", error);
      res.status(500).json({ message: "Failed to fetch clauses" });
    }
  });

  app.post('/api/clauses', async (req: any, res) => {
    try {
      const userId = "test-user-123";
      
      const clauseData = insertContractClauseSchema.parse({
        ...req.body,
        createdBy: userId
      });

      const clause = await storage.createClause(clauseData);
      
      // Create audit log if orgId is provided
      if (clause.orgId) {
        await storage.createAuditLog({
          orgId: clause.orgId,
          actorId: userId,
          action: "CREATE_CONTRACT_CLAUSE",
          payload: { 
            clauseId: clause.id,
            name: clause.name,
            category: clause.category 
          }
        });
      }

      res.status(201).json(clause);
    } catch (error) {
      console.error("Error creating clause:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create clause" });
    }
  });

  // Notification routes
  app.get('/api/notifications', async (req: any, res) => {
    try {
      const userId = "test-user-123";
      const notifications = await notificationService.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get('/api/notifications/unread', async (req: any, res) => {
    try {
      const userId = "test-user-123";
      const count = await notificationService.getUnreadCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  app.patch('/api/notifications/:id/read', async (req: any, res) => {
    try {
      await notificationService.markAsRead(req.params.id);
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.post('/api/notifications/mark-all-read', async (req: any, res) => {
    try {
      const userId = "test-user-123";
      await notificationService.markAllAsRead(userId);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  app.delete('/api/notifications/:id', async (req: any, res) => {
    try {
      await notificationService.deleteNotification(req.params.id);
      res.json({ message: "Notification deleted" });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  app.post('/api/notifications/check', async (req: any, res) => {
    try {
      // Manual trigger for notification checks (admin only in production)
      await notificationService.runAllChecks();
      res.json({ message: "Notification checks completed successfully" });
    } catch (error) {
      console.error("Error running notification checks:", error);
      res.status(500).json({ message: "Failed to run notification checks" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
