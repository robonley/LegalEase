import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EntitySelector } from "@/components/EntitySelector";
import { useEntityContext } from "@/hooks/useEntityContext";
import type { User } from "@shared/schema";

const navigationItems = [
  { href: "/", icon: "fas fa-tachometer-alt", label: "Dashboard" },
  { href: "/entities", icon: "fas fa-building", label: "Entities" },
  { href: "/people", icon: "fas fa-users", label: "People & Roles" },
  { href: "/cap-table", icon: "fas fa-chart-pie", label: "Cap Table" },
  { href: "/documents", icon: "fas fa-file-alt", label: "Documents" },
  { href: "/templates", icon: "fas fa-folder", label: "Templates" },
  { href: "/minute-books", icon: "fas fa-book", label: "Minute Books" },
];

const adminItems = [
  { href: "/audit-log", icon: "fas fa-history", label: "Audit Log" },
];

export function Sidebar() {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const { currentEntity, clearCurrentEntity } = useEntityContext();

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <aside className="w-64 bg-card border-r border-border flex-shrink-0">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <Link 
            href="/" 
            onClick={() => {
              if (!currentEntity) {
                // If no entity selected, clear any entity context
                clearCurrentEntity();
              }
              // Navigate to dashboard - either main or entity-specific
            }}
          >
            <div className="flex items-center gap-3 mb-4 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <i className="fas fa-balance-scale text-primary-foreground text-sm"></i>
              </div>
              <span className="font-semibold text-lg">LegalEntity</span>
            </div>
          </Link>
          
          {/* Entity Selector */}
          <EntitySelector />
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4">
          <div className="space-y-1">
            {navigationItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer",
                    location === item.href
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <i className={`${item.icon} w-4`}></i>
                  {item.label}
                </div>
              </Link>
            ))}
          </div>

          {/* Admin Navigation */}
          {(user?.role === 'admin' || user?.role === 'lawyer') && (
            <div className="mt-8 pt-4 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Administration
              </p>
              <div className="space-y-1">
                {adminItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 text-sm transition-colors rounded-lg cursor-pointer",
                        location === item.href
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      )}
                      data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <i className={`${item.icon} w-4`}></i>
                      {item.label}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-primary-foreground">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
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
            >
              <i className="fas fa-sign-out-alt"></i>
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
