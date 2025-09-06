import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Entities from "@/pages/Entities";
import EntityDetail from "@/pages/EntityDetail";
import EntityEdit from "@/pages/EntityEdit";
import People from "@/pages/People";
import CapTable from "@/pages/CapTable";
import Documents from "@/pages/Documents";
import Templates from "@/pages/Templates";
import MinuteBooks from "@/pages/MinuteBooks";
import AuditLog from "@/pages/AuditLog";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <i className="fas fa-spinner fa-spin text-2xl text-muted-foreground"></i>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <Layout>
          <Route path="/" component={Dashboard} />
          <Route path="/entities" component={Entities} />
          <Route path="/entities/:id" component={EntityDetail} />
          <Route path="/entities/:id/edit" component={EntityEdit} />
          <Route path="/people" component={People} />
          <Route path="/cap-table" component={CapTable} />
          <Route path="/documents" component={Documents} />
          <Route path="/templates" component={Templates} />
          <Route path="/minute-books" component={MinuteBooks} />
          <Route path="/audit-log" component={AuditLog} />
        </Layout>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
