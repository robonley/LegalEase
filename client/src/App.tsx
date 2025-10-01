import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { EntityProvider } from "@/hooks/useEntityContext";
import { ThemeProvider } from "@/hooks/useTheme";
import { Layout } from "@/components/Layout";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Entities from "@/pages/Entities";
import EntityDetail from "@/pages/EntityDetail";
import EntityEdit from "@/pages/EntityEdit";
import People from "@/pages/People";
import CapTable from "@/pages/CapTable";
import DocumentManagement from "@/pages/DocumentManagement";
import AuditLog from "@/pages/AuditLog";
import BillingSettings from "@/pages/BillingSettings";
import { ComplianceReview } from "@/pages/ComplianceReview";
import { ComplianceCalendar } from "@/pages/ComplianceCalendar";
import { DirectorsRegister } from "@/pages/DirectorsRegister";
import { OfficersRegister } from "@/pages/OfficersRegister";
import { ShareholdersRegister } from "@/pages/ShareholdersRegister";
import Contracts from "@/pages/Contracts";
import ContractDetail from "@/pages/ContractDetail";
import ContractNew from "@/pages/ContractNew";
import ContractEdit from "@/pages/ContractEdit";
import Notifications from "@/pages/Notifications";
import Settings from "@/pages/Settings";

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
        <EntityProvider>
          <Layout>
            <Route path="/" component={Dashboard} />
            <Route path="/entities" component={Entities} />
            <Route path="/entities/:id" component={EntityDetail} />
            <Route path="/entities/:id/edit" component={EntityEdit} />
            <Route path="/people" component={People} />
            <Route path="/documents/:rest*" component={DocumentManagement} />
            <Route path="/documents" component={DocumentManagement} />
            <Route path="/cap-table" component={CapTable} />
            <Route path="/securities-ledger" component={CapTable} />
            <Route path="/directors-register" component={DirectorsRegister} />
            <Route path="/officers-register" component={OfficersRegister} />
            <Route path="/shareholders-register" component={ShareholdersRegister} />
            <Route path="/compliance/review" component={ComplianceReview} />
            <Route path="/compliance/calendar" component={ComplianceCalendar} />
            <Route path="/contracts" component={Contracts} />
            <Route path="/contracts/new" component={ContractNew} />
            <Route path="/contracts/:id/edit" component={ContractEdit} />
            <Route path="/contracts/:id" component={ContractDetail} />
            <Route path="/notifications" component={Notifications} />
            <Route path="/settings" component={Settings} />
            <Route path="/audit-log" component={AuditLog} />
            <Route path="/billing" component={BillingSettings} />
          </Layout>
        </EntityProvider>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
