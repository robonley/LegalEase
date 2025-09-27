import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { CheckCircle, X, ArrowRight } from "lucide-react";

interface GettingStartedBannerProps {
  totalEntities: number;
  totalDocuments: number;
  totalPeople: number;
}

export function GettingStartedBanner({ 
  totalEntities, 
  totalDocuments, 
  totalPeople 
}: GettingStartedBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [, setLocation] = useLocation();

  // Don't show if user has made significant progress
  const hasProgress = totalEntities > 2 && totalDocuments > 5 && totalPeople > 3;
  
  if (!isVisible || hasProgress) {
    return null;
  }

  const steps = [
    {
      id: 1,
      title: "Create Your First Entity",
      description: "Set up a corporation, partnership, or LLC",
      completed: totalEntities > 0,
      action: () => setLocation('/entities'),
      icon: "fas fa-building",
      color: "bg-blue-500"
    },
    {
      id: 2,
      title: "Add People & Roles",
      description: "Add directors, officers, and shareholders",
      completed: totalPeople > 0,
      action: () => setLocation('/people'),
      icon: "fas fa-users",
      color: "bg-green-500"
    },
    {
      id: 3,
      title: "Upload Templates",
      description: "Add your document templates for automation",
      completed: false, // Would need template count data
      action: () => setLocation('/documents/templates'),
      icon: "fas fa-upload",
      color: "bg-purple-500"
    },
    {
      id: 4,
      title: "Generate Documents",
      description: "Create your first minute book or resolution",
      completed: totalDocuments > 0,
      action: () => setLocation('/documents'),
      icon: "fas fa-file-alt",
      color: "bg-orange-500"
    }
  ];

  const completedSteps = steps.filter(step => step.completed).length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  return (
    <Card className="mb-8 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <i className="fas fa-rocket text-primary-foreground"></i>
            </div>
            <div>
              <h2 className="text-lg font-semibold">Get Started with LegalEntity</h2>
              <p className="text-sm text-muted-foreground">
                Complete these steps to unlock the full power of the platform
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
            className="text-muted-foreground hover:text-foreground"
            data-testid="close-getting-started"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">{completedSteps}/{steps.length}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary rounded-full h-2 transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`relative p-4 rounded-lg border transition-all duration-200 cursor-pointer group ${
                step.completed
                  ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
                  : 'bg-background border-border hover:border-primary/50 hover:shadow-md'
              }`}
              onClick={step.action}
              data-testid={`getting-started-step-${step.id}`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  step.completed ? 'bg-green-500' : step.color
                }`}>
                  {step.completed ? (
                    <CheckCircle className="h-4 w-4 text-white" />
                  ) : (
                    <i className={`${step.icon} text-white text-xs`}></i>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm mb-1 group-hover:text-primary transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
                {!step.completed && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                )}
              </div>
              
              {step.completed && (
                <Badge variant="success" className="absolute top-2 right-2 text-xs">
                  Done
                </Badge>
              )}
            </div>
          ))}
        </div>

        {completedSteps === steps.length && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-green-800 dark:text-green-200">
                  🎉 Congratulations! You're all set up
                </h3>
                <p className="text-sm text-green-600 dark:text-green-400">
                  You can now use all features of LegalEntity to manage your corporate governance
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}