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
  insertAuditLogSchema
} from "@shared/schema";
import { z } from "zod";

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
      
      // Convert formationAt string to Date if provided
      const processedBody = { ...req.body };
      if (processedBody.formationAt) {
        processedBody.formationAt = new Date(processedBody.formationAt);
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
      
      // Create audit log
      await storage.createAuditLog({
        orgId: org.id,
        actorId: userId,
        action: "CREATE_ORG",
        payload: { orgId: org.id, name: org.name }
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
      
      // Convert formationAt string to Date if provided
      const processedBody = { ...req.body };
      if (processedBody.formationAt) {
        processedBody.formationAt = new Date(processedBody.formationAt);
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
      
      await storage.createAuditLog({
        actorId: userId,
        action: "CREATE_TEMPLATE",
        payload: { templateId: template.id, name: template.name }
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

      await storage.createAuditLog({
        orgId,
        actorId: userId,
        action: "GENERATE_DOCUMENT",
        payload: { 
          docId: generatedDoc.id, 
          templateName: template.name 
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
      
      await storage.createAuditLog({
        orgId,
        actorId: userId,
        action: "GENERATE_MINUTE_BOOK",
        payload: { bundle, fileKey }
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
        issuePrice: issuePrice ? parseFloat(issuePrice) : null,
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
        fileKey: fileUrl,
        schema: {}, // Will be populated when we parse template variables
        ownerId: userId,
      });

      // Create audit log
      await storage.createAuditLog({
        orgId,
        actorId: userId,
        action: "UPLOAD_TEMPLATE",
        payload: { 
          templateId: template.id,
          name,
          type,
          fileName
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

  // Document routes
  app.get('/api/documents/:orgId?', isAuthenticated, async (req, res) => {
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

  app.post('/api/orgs/:orgId/documents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
          fileKey: null, // No actual file yet
          schema: {},
          ownerId: userId,
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

      // Create audit log
      await storage.createAuditLog({
        orgId,
        actorId: userId,
        action: "CREATE_DOCUMENT",
        payload: { documentId: generatedDoc.id, documentType, templateName: templateConfig.name }
      });

      res.status(201).json(generatedDoc);
    } catch (error) {
      console.error("Error creating document:", error);
      res.status(500).json({ message: "Failed to create document" });
    }
  });

  app.post('/api/orgs/:orgId/documents/bundle', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
            fileKey: null, // No actual file yet
            schema: {},
            ownerId: userId,
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
      await storage.createAuditLog({
        orgId,
        actorId: userId,
        action: "CREATE_DOCUMENT_BUNDLE",
        payload: { 
          bundleType: "new-corporation", 
          documentsCreated: createdDocs.length,
          documentIds: createdDocs.map(d => d.id)
        }
      });

      res.status(201).json({ documents: createdDocs, message: "New Corporation Bundle created successfully" });
    } catch (error) {
      console.error("Error creating document bundle:", error);
      res.status(500).json({ message: "Failed to create document bundle" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
