import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <i className="fas fa-balance-scale text-primary-foreground text-lg"></i>
            </div>
            <CardTitle className="text-2xl">LegalEntity</CardTitle>
          </div>
          <CardDescription>
            Corporate minute book and entity management platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">Features:</p>
              <ul className="space-y-1 text-xs">
                <li>• Entity and cap table management</li>
                <li>• Document generation and templating</li>
                <li>• Minute book creation</li>
                <li>• Audit logging and compliance</li>
              </ul>
            </div>
            
            <Button 
              className="w-full" 
              onClick={() => window.location.href = '/api/login'}
              data-testid="login-button"
            >
              <i className="fas fa-sign-in-alt mr-2"></i>
              Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
