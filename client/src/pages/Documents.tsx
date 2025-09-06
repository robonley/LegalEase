import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Documents() {
  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Documents</h1>
            <p className="text-sm text-muted-foreground mt-1">
              View and manage generated documents
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <i className="fas fa-file-alt text-4xl text-muted-foreground mb-4"></i>
            <CardTitle className="mb-2">Document Management</CardTitle>
            <CardDescription>
              This feature is coming soon. You'll be able to view and manage generated documents here.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
