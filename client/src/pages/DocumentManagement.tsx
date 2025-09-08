import { Switch, Route, useLocation } from "wouter";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import Templates from "./Templates";
import MinuteBooks from "./MinuteBooks";
import Documents from "./Documents";

export default function DocumentManagement() {
  const [location] = useLocation();

  // Sub-navigation items for document management workflow
  const subNavItems = [
    { 
      href: "/documents/templates", 
      icon: "fas fa-cog", 
      label: "Setup Templates",
      description: "Upload and configure .docx templates"
    },
    { 
      href: "/documents/bundles", 
      icon: "fas fa-plus-circle", 
      label: "Generate Bundles",
      description: "Create minute books for entities"
    },
    { 
      href: "/documents/library", 
      icon: "fas fa-folder-open", 
      label: "Document Library",
      description: "View and download completed documents"
    },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Sub-navigation Header */}
      <div className="bg-card border-b border-border">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3 mb-4">
            <i className="fas fa-file-alt text-primary"></i>
            <h1 className="text-2xl font-semibold">Document Management</h1>
          </div>
          
          {/* Workflow Navigation */}
          <nav className="flex gap-1">
            {subNavItems.map((item, index) => {
              const isActive = location === item.href;
              const isCompleted = index < subNavItems.findIndex(nav => nav.href === location);
              
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors cursor-pointer relative",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : isCompleted
                        ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                    data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {/* Step number or check icon */}
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                      isActive
                        ? "bg-primary-foreground text-primary"
                        : isCompleted
                        ? "bg-green-600 text-white"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {isCompleted ? (
                        <i className="fas fa-check text-xs"></i>
                      ) : (
                        index + 1
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="font-medium">{item.label}</div>
                      <div className={cn(
                        "text-xs",
                        isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                      )}>
                        {item.description}
                      </div>
                    </div>
                    
                    <i className={`${item.icon} text-sm`}></i>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Page Content */}
      <div className="flex-1 overflow-hidden">
        <Switch>
          <Route path="/documents/templates" component={Templates} />
          <Route path="/documents/bundles" component={MinuteBooks} />
          <Route path="/documents/library" component={Documents} />
          {/* Default to templates if no specific path */}
          <Route path="/documents" component={() => <Templates />} />
        </Switch>
      </div>
    </div>
  );
}