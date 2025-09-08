import { Switch, Route, useLocation } from "wouter";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import Templates from "./Templates";
import MinuteBooks from "./MinuteBooks";
import Documents from "./Documents";

export default function DocumentManagement() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Direct Page Content - navigation now handled by sidebar */}
      <Switch>
        <Route path="/documents/templates" component={Templates} />
        <Route path="/documents/bundles" component={MinuteBooks} />
        <Route path="/documents/library" component={Documents} />
        {/* Default to templates if no specific path */}
        <Route path="/documents" component={() => <Templates />} />
      </Switch>
    </div>
  );
}