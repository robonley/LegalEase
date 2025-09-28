import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EntitySelector } from "@/components/EntitySelector";
import { useEntityContext } from "@/hooks/useEntityContext";
import { useTheme } from "@/hooks/useTheme";
import { useState } from "react";
import type { User } from "@shared/schema";

// Navigation items will be dynamically generated based on entity context

const adminItems = [
  { href: "/audit-log", icon: "fas fa-history", label: "Audit Log" },
  { href: "/billing", icon: "fas fa-credit-card", label: "Billing" },
];

export function Sidebar() {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const { currentEntity, clearCurrentEntity } = useEntityContext();
  const { theme, toggleTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(["/documents"]));

  // Documents sub-items
  const documentSubItems = [
    { 
      href: "/documents/templates", 
      icon: "fas fa-cog", 
      label: "Create"
    },
    { 
      href: "/documents/library", 
      icon: "fas fa-folder-open", 
      label: "Manage"
    },
    { 
      href: "/documents/bundles", 
      icon: "fas fa-plus-circle", 
      label: "Minute Books"
    },
  ];

  // Generate navigation items based on entity context
  const getNavigationItems = () => {
    if (currentEntity) {
      // Entity-specific navigation with reorganized document management
      return [
        { href: `/entities/${currentEntity.id}`, icon: "fas fa-tachometer-alt", label: "Dashboard" },
        { href: "/people", icon: "fas fa-users", label: "People & Roles" },
        { 
          href: "/documents", 
          icon: "fas fa-file-alt", 
          label: "Documents",
          hasChildren: true,
          children: documentSubItems
        },
        { href: "/cap-table", icon: "fas fa-chart-pie", label: "Cap Table" },
      ];
    } else {
      // Global navigation
      return [
        { href: "/", icon: "fas fa-tachometer-alt", label: "Dashboard" },
        { href: "/entities", icon: "fas fa-building", label: "Entities" },
        { 
          href: "/documents", 
          icon: "fas fa-file-alt", 
          label: "Documents",
          hasChildren: true,
          children: documentSubItems
        },
        { href: "/cap-table", icon: "fas fa-chart-pie", label: "Cap Table" },
      ];
    }
  };

  const navigationItems = getNavigationItems();

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <aside 
      id="navigation"
      className={cn(
        "bg-card border-r border-border flex-shrink-0 transition-all duration-300 ease-in-out",
        isCollapsed ? "w-16" : "w-64"
      )}
      role="navigation"
      aria-label="Main navigation"
      aria-expanded={!isCollapsed}
    >
      <div className="flex flex-col h-screen">
        {/* Header with Logo and Collapse Toggle */}
        <div className="p-4 border-b border-border">
          {isCollapsed ? (
            /* Collapsed State - Large Expand Button */
            <div className="flex flex-col items-center gap-4">
              <Link 
                href="/" 
                onClick={() => {
                  if (!currentEntity) {
                    clearCurrentEntity();
                  }
                }}
              >
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity">
                  <i className="fas fa-balance-scale text-primary-foreground text-sm"></i>
                </div>
              </Link>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCollapsed(false)}
                className="w-10 h-10 p-0 border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/10"
                data-testid="sidebar-expand"
              >
                <i className="fas fa-angle-right text-lg text-primary"></i>
              </Button>
            </div>
          ) : (
            /* Expanded State */
            <>
              <div className="flex items-center justify-between mb-4">
                <Link 
                  href="/" 
                  onClick={() => {
                    if (!currentEntity) {
                      clearCurrentEntity();
                    }
                  }}
                >
                  <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                      <i className="fas fa-balance-scale text-primary-foreground text-sm"></i>
                    </div>
                    <span className="font-semibold text-lg">LegalEntity</span>
                  </div>
                </Link>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCollapsed(true)}
                  className="w-8 h-8 p-0 text-muted-foreground hover:text-foreground"
                  data-testid="sidebar-collapse"
                >
                  <i className="fas fa-angle-left text-sm"></i>
                </Button>
              </div>
              
              {/* Entity Selector */}
              <EntitySelector />
            </>
          )}
        </div>

        {/* Navigation Menu */}
        <nav 
          className="flex-1 p-4 overflow-y-auto"
          aria-label="Navigation menu"
          role="menubar"
        >
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const hasChildren = item.hasChildren && item.children;
              const isExpanded = expandedItems.has(item.href);
              const isParentActive = hasChildren && item.children?.some(child => location === child.href);
              const isActive = location === item.href || isParentActive;

              return (
                <div key={item.href}>
                  {hasChildren ? (
                    // Parent item with children
                    <div
                      className={cn(
                        "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer",
                        isCollapsed ? "justify-center" : "gap-3",
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      )}
                      onClick={() => {
                        if (!isCollapsed) {
                          setExpandedItems(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(item.href)) {
                              newSet.delete(item.href);
                            } else {
                              newSet.add(item.href);
                            }
                            return newSet;
                          });
                        }
                      }}
                      data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <i className={`${item.icon} w-4`}></i>
                      {!isCollapsed && (
                        <>
                          <span className="flex-1">{item.label}</span>
                          <i className={cn(
                            "fas fa-chevron-right text-xs transition-transform",
                            isExpanded && "rotate-90"
                          )}></i>
                        </>
                      )}
                    </div>
                  ) : (
                    // Regular item without children
                    <Link href={item.href}>
                      <div
                        className={cn(
                          "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer",
                          isCollapsed ? "justify-center" : "gap-3",
                          location === item.href
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        )}
                        data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                        title={isCollapsed ? item.label : undefined}
                      >
                        <i className={`${item.icon} w-4`}></i>
                        {!isCollapsed && item.label}
                      </div>
                    </Link>
                  )}
                  
                  {/* Child items */}
                  {hasChildren && isExpanded && !isCollapsed && (
                    <div className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-3">
                      {item.children?.map((child) => (
                        <Link key={child.href} href={child.href}>
                          <div
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer",
                              location === child.href
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent"
                            )}
                            data-testid={`nav-${child.label.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            <i className={`${child.icon} w-4 text-xs`}></i>
                            <div className="flex-1">
                              <div className="font-medium">{child.label}</div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Admin Navigation */}
          {(user?.role === 'admin' || user?.role === 'lawyer') && (
            <div className="mt-8 pt-4 border-t border-border">
              {!isCollapsed && (
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Administration
                </p>
              )}
              <div className="space-y-1">
                {adminItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={cn(
                        "flex items-center px-3 py-2 text-sm transition-colors rounded-lg cursor-pointer",
                        isCollapsed ? "justify-center" : "gap-3",
                        location === item.href
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      )}
                      data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <i className={`${item.icon} w-4`}></i>
                      {!isCollapsed && item.label}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* Bottom Section with Theme Toggle and User Profile */}
        <div className="mt-auto">
          {/* Theme Toggle */}
          <div className="p-4 border-t border-border">
            <div className={cn(
              "flex",
              isCollapsed ? "justify-center" : "justify-start"
            )}>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="w-8 h-8 p-0 text-muted-foreground hover:text-foreground"
                data-testid="theme-toggle"
                title={isCollapsed ? (theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode') : undefined}
              >
                <i className={`text-sm ${theme === 'dark' ? "fas fa-sun" : "fas fa-moon"}`}></i>
              </Button>
            </div>
          </div>

          {/* User Profile */}
          <div className="p-4 border-t border-border">
            <div className={cn(
              "flex items-center",
              isCollapsed ? "justify-center" : "gap-3"
            )}>
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-primary-foreground">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
              </div>
              {!isCollapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate capitalize">
                      {user?.role}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.location.href = '/api/logout'}
                    data-testid="logout-button"
                    title="Logout"
                  >
                    <i className="fas fa-sign-out-alt"></i>
                  </Button>
                </>
              )}
              {isCollapsed && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.href = '/api/logout'}
                  className="absolute bottom-4 right-4 w-8 h-8 p-0 text-muted-foreground hover:text-foreground"
                  data-testid="logout-button"
                  title="Logout"
                >
                  <i className="fas fa-sign-out-alt text-xs"></i>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
