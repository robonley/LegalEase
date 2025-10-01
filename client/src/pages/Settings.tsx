import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Info, CheckCircle, XCircle, Loader2, Settings as SettingsIcon } from "lucide-react";

type DocuSignConfig = {
  configured: boolean;
  enabled?: boolean;
  apiKey?: string;
  accountId?: string;
  baseUrl?: string;
  message?: string;
};

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    apiKey: "",
    accountId: "",
    baseUrl: "https://demo.docusign.net/restapi",
    enabled: false,
  });

  const { data: docusignStatus, isLoading } = useQuery<DocuSignConfig>({
    queryKey: ["/api/integrations/docusign/status"],
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("POST", "/api/integrations/docusign/config", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/docusign/status"] });
      toast({
        title: "Success",
        description: "DocuSign configuration saved (placeholder)",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/integrations/docusign/test");
    },
    onSuccess: () => {
      toast({
        title: "Test Connection",
        description: "DocuSign integration is coming soon. Connection test is not yet available.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveConfigMutation.mutate(formData);
  };

  const handleTestConnection = () => {
    testConnectionMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-semibold" data-testid="page-title">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Configure integrations and application settings
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-6 max-w-4xl">
        {/* Integrations Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4" data-testid="section-integrations">Integrations</h2>
          
          {/* DocuSign Integration Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle data-testid="card-title-docusign">DocuSign Integration</CardTitle>
                  <CardDescription>
                    Configure DocuSign for electronic signatures on contracts
                  </CardDescription>
                </div>
                {docusignStatus?.configured ? (
                  <CheckCircle className="h-5 w-5 text-green-500" data-testid="icon-configured" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground" data-testid="icon-not-configured" />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert data-testid="alert-coming-soon">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  DocuSign integration coming soon. Pre-configure your credentials to be ready when the integration launches.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="apiKey" data-testid="label-api-key">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="Enter your DocuSign API key"
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    data-testid="input-api-key"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountId" data-testid="label-account-id">Account ID</Label>
                  <Input
                    id="accountId"
                    placeholder="Enter your DocuSign Account ID"
                    value={formData.accountId}
                    onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                    data-testid="input-account-id"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="baseUrl" data-testid="label-base-url">Base URL</Label>
                  <Input
                    id="baseUrl"
                    placeholder="https://demo.docusign.net/restapi"
                    value={formData.baseUrl}
                    onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                    data-testid="input-base-url"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use demo URL for testing or production URL for live environment
                  </p>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="enabled" data-testid="label-enable-docusign">Enable DocuSign</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable DocuSign integration for contract signatures
                    </p>
                  </div>
                  <Switch
                    id="enabled"
                    checked={formData.enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                    data-testid="switch-enable"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={testConnectionMutation.isPending || !formData.apiKey || !formData.accountId}
                    data-testid="button-test-connection"
                  >
                    {testConnectionMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      "Test Connection"
                    )}
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saveConfigMutation.isPending}
                    data-testid="button-save-settings"
                  >
                    {saveConfigMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Settings"
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Future Integrations Placeholder */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4" data-testid="section-more-integrations">More Integrations</h2>
          <Card>
            <CardContent className="p-12 text-center">
              <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground" data-testid="text-more-coming">
                More integrations coming soon
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
