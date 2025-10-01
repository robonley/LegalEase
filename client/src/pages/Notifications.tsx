import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Bell, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import type { ContractNotification } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function Notifications() {
  const { toast } = useToast();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "read" | "unread">("all");

  // Fetch all notifications
  const { data: notifications = [], isLoading } = useQuery<ContractNotification[]>({
    queryKey: ['/api/notifications'],
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return await apiRequest(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread'] });
      toast({
        title: "Success",
        description: "Notification marked as read",
      });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/notifications/mark-all-read', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread'] });
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return await apiRequest(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread'] });
      toast({
        title: "Success",
        description: "Notification deleted",
      });
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'contract_expiring':
        return '⏰';
      case 'contract_expired':
        return '❌';
      case 'renewal_due':
        return '🔄';
      case 'obligation_due':
        return '📋';
      case 'obligation_overdue':
        return '⚠️';
      case 'signature_pending':
        return '✍️';
      case 'version_created':
        return '📄';
      default:
        return '🔔';
    }
  };

  const getNotificationTypeName = (type: string) => {
    switch (type) {
      case 'contract_expiring':
        return 'Contract Expiring';
      case 'contract_expired':
        return 'Contract Expired';
      case 'renewal_due':
        return 'Renewal Due';
      case 'obligation_due':
        return 'Obligation Due';
      case 'obligation_overdue':
        return 'Obligation Overdue';
      case 'signature_pending':
        return 'Signature Pending';
      case 'version_created':
        return 'Version Created';
      default:
        return type;
    }
  };

  // Filter notifications
  const filteredNotifications = notifications.filter((notification) => {
    const typeMatch = typeFilter === "all" || notification.notificationType === typeFilter;
    const statusMatch =
      statusFilter === "all" ||
      (statusFilter === "read" && notification.isRead) ||
      (statusFilter === "unread" && !notification.isRead);
    return typeMatch && statusMatch;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const notificationTypes = Array.from(new Set(notifications.map((n) => n.notificationType)));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <i className="fas fa-spinner fa-spin text-2xl text-muted-foreground" data-testid="loading-spinner"></i>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Notifications</h1>
            <p className="text-muted-foreground" data-testid="text-unread-count">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                data-testid="button-mark-all-read"
              >
                <Check className="mr-2 h-4 w-4" />
                Mark All as Read
              </Button>
            )}
          </div>
        </div>

        <div className="flex gap-4 flex-wrap">
          <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
            <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unread">Unread</SelectItem>
              <SelectItem value="read">Read</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[200px]" data-testid="select-type-filter">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {notificationTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {getNotificationTypeName(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="h-12 w-12 mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground" data-testid="text-no-notifications">No notifications to display</p>
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`${!notification.isRead ? 'border-l-4 border-l-primary' : ''}`}
              data-testid={`notification-card-${notification.id}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex gap-3 flex-1">
                    <span className="text-2xl" data-testid={`icon-${notification.notificationType}`}>
                      {getNotificationIcon(notification.notificationType)}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-base" data-testid="text-notification-message">
                          {notification.message}
                        </CardTitle>
                        {!notification.isRead && (
                          <Badge variant="default" data-testid="badge-unread">New</Badge>
                        )}
                      </div>
                      <CardDescription data-testid="text-notification-type">
                        {getNotificationTypeName(notification.notificationType)} •{" "}
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsReadMutation.mutate(notification.id)}
                        disabled={markAsReadMutation.isPending}
                        data-testid={`button-mark-read-${notification.id}`}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteNotificationMutation.mutate(notification.id)}
                      disabled={deleteNotificationMutation.isPending}
                      data-testid={`button-delete-${notification.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Link href={`/contracts/${notification.contractId}`}>
                  <Button variant="outline" size="sm" data-testid={`link-view-contract-${notification.id}`}>
                    View Contract
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
