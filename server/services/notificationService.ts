import { storage } from "../storage";
import { db } from "../db";
import { contracts, contractObligations, contractNotifications, type Contract, type ContractObligation, type InsertContractNotification } from "@shared/schema";
import { eq, and, gte, lte, isNull, isNotNull, or } from "drizzle-orm";

export interface NotificationData {
  contractId: string;
  userId: string;
  orgId: string;
  notificationType: string;
  message: string;
  dueDate?: Date;
}

export class NotificationService {
  
  // Check for contracts expiring soon (30, 15, 7, 1 days)
  async checkExpiringContracts(): Promise<void> {
    const today = new Date();
    const intervals = [30, 15, 7, 1]; // Days before expiration
    
    for (const days of intervals) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + days);
      
      // Get contracts expiring on this target date
      const expiringContracts = await db
        .select()
        .from(contracts)
        .where(
          and(
            eq(contracts.status, 'active'),
            gte(contracts.expirationDate, targetDate),
            lte(contracts.expirationDate, new Date(targetDate.getTime() + 24 * 60 * 60 * 1000))
          )
        );
      
      for (const contract of expiringContracts) {
        // Create unique message for this interval
        const message = `Contract "${contract.name}" expires in ${days} day${days > 1 ? 's' : ''}`;
        
        // Check if notification already exists for this contract and specific interval
        const existingNotification = await db
          .select()
          .from(contractNotifications)
          .where(
            and(
              eq(contractNotifications.contractId, contract.id),
              eq(contractNotifications.notificationType, 'contract_expiring'),
              eq(contractNotifications.message, message)
            )
          );
        
        if (existingNotification.length === 0 && contract.expirationDate) {
          await this.createNotification({
            contractId: contract.id,
            userId: contract.createdBy,
            orgId: contract.orgId,
            notificationType: 'contract_expiring',
            message: message,
            dueDate: contract.expirationDate,
          });
        }
      }
    }
  }
  
  // Check for renewal dates approaching
  async checkRenewalDates(): Promise<void> {
    const today = new Date();
    
    // Get all active contracts with renewal dates
    const contractsWithRenewals = await db
      .select()
      .from(contracts)
      .where(
        and(
          eq(contracts.status, 'active'),
          isNotNull(contracts.renewalDate)
        )
      );
    
    for (const contract of contractsWithRenewals) {
      if (!contract.renewalDate) continue;
      
      const renewalNoticeDays = contract.renewalNoticeDays || 30;
      const notificationDate = new Date(contract.renewalDate);
      notificationDate.setDate(notificationDate.getDate() - renewalNoticeDays);
      
      // Check if today is the notification date
      const isSameDate = today.toDateString() === notificationDate.toDateString();
      
      if (isSameDate) {
        // Check if notification already exists
        const existingNotification = await db
          .select()
          .from(contractNotifications)
          .where(
            and(
              eq(contractNotifications.contractId, contract.id),
              eq(contractNotifications.notificationType, 'renewal_due'),
              eq(contractNotifications.dueDate, contract.renewalDate)
            )
          );
        
        if (existingNotification.length === 0) {
          await this.createNotification({
            contractId: contract.id,
            userId: contract.createdBy,
            orgId: contract.orgId,
            notificationType: 'renewal_due',
            message: `Contract "${contract.name}" renewal is due in ${renewalNoticeDays} days${contract.autoRenewal ? ' (auto-renewal enabled)' : ''}`,
            dueDate: contract.renewalDate,
          });
        }
      }
    }
  }
  
  // Check for obligations due soon
  async checkDueObligations(): Promise<void> {
    const today = new Date();
    const intervals = [7, 3, 1]; // Days before due date
    
    for (const days of intervals) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + days);
      
      // Get obligations due on this target date
      const dueObligations = await db
        .select({
          obligation: contractObligations,
          contract: contracts,
        })
        .from(contractObligations)
        .innerJoin(contracts, eq(contractObligations.contractId, contracts.id))
        .where(
          and(
            eq(contractObligations.status, 'pending'),
            gte(contractObligations.dueDate, targetDate),
            lte(contractObligations.dueDate, new Date(targetDate.getTime() + 24 * 60 * 60 * 1000))
          )
        );
      
      for (const { obligation, contract } of dueObligations) {
        // Check if notification already exists
        const existingNotification = await db
          .select()
          .from(contractNotifications)
          .where(
            and(
              eq(contractNotifications.contractId, contract.id),
              eq(contractNotifications.notificationType, 'obligation_due'),
              eq(contractNotifications.message, `Obligation "${obligation.title}" is due in ${days} day${days > 1 ? 's' : ''}`)
            )
          );
        
        if (existingNotification.length === 0 && obligation.dueDate) {
          await this.createNotification({
            contractId: contract.id,
            userId: contract.createdBy,
            orgId: contract.orgId,
            notificationType: 'obligation_due',
            message: `Obligation "${obligation.title}" is due in ${days} day${days > 1 ? 's' : ''}`,
            dueDate: obligation.dueDate,
          });
        }
      }
    }
    
    // Check for overdue obligations
    const overdueObligations = await db
      .select({
        obligation: contractObligations,
        contract: contracts,
      })
      .from(contractObligations)
      .innerJoin(contracts, eq(contractObligations.contractId, contracts.id))
      .where(
        and(
          eq(contractObligations.status, 'pending'),
          lte(contractObligations.dueDate, today)
        )
      );
    
    for (const { obligation, contract } of overdueObligations) {
      // Check if overdue notification already exists
      const existingNotification = await db
        .select()
        .from(contractNotifications)
        .where(
          and(
            eq(contractNotifications.contractId, contract.id),
            eq(contractNotifications.notificationType, 'obligation_overdue'),
            eq(contractNotifications.message, `Obligation "${obligation.title}" is overdue`)
          )
        );
      
      if (existingNotification.length === 0 && obligation.dueDate) {
        await this.createNotification({
          contractId: contract.id,
          userId: contract.createdBy,
          orgId: contract.orgId,
          notificationType: 'obligation_overdue',
          message: `Obligation "${obligation.title}" is overdue`,
          dueDate: obligation.dueDate,
        });
      }
    }
  }
  
  // Create notification
  async createNotification(data: NotificationData): Promise<void> {
    await storage.createContractNotification({
      contractId: data.contractId,
      userId: data.userId,
      orgId: data.orgId,
      notificationType: data.notificationType,
      message: data.message,
      dueDate: data.dueDate || null,
      isRead: false,
    });
  }
  
  // Mark as read
  async markAsRead(notificationId: string): Promise<void> {
    await storage.markNotificationAsRead(notificationId);
  }
  
  // Get user notifications
  async getUserNotifications(userId: string): Promise<any[]> {
    return await storage.getUserNotifications(userId);
  }
  
  // Get unread count
  async getUnreadCount(userId: string): Promise<number> {
    return await storage.getUnreadNotificationCount(userId);
  }
  
  // Mark all as read for a user
  async markAllAsRead(userId: string): Promise<void> {
    await storage.markAllNotificationsAsRead(userId);
  }
  
  // Delete notification
  async deleteNotification(notificationId: string): Promise<void> {
    await storage.deleteNotification(notificationId);
  }
  
  // Run all notification checks
  async runAllChecks(): Promise<void> {
    console.log('Running notification checks...');
    await this.checkExpiringContracts();
    await this.checkRenewalDates();
    await this.checkDueObligations();
    console.log('Notification checks completed');
  }
}

export const notificationService = new NotificationService();
