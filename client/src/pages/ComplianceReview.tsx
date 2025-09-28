import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useEntityContext } from "@/hooks/useEntityContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ComplianceGap {
  id: string;
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  recommendation: string;
  documentName?: string;
  status: "pending" | "reviewing" | "resolved";
}

interface ComplianceReview {
  id: string;
  status: "pending" | "analyzing" | "completed" | "error";
  overallScore: number;
  gaps: ComplianceGap[];
  lastRunAt: string;
  documentsAnalyzed: number;
  recommendations: string[];
}

export function ComplianceReview() {
  const { currentEntity } = useEntityContext();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { data: review, isLoading } = useQuery<ComplianceReview>({
    queryKey: ['/api/compliance/review', currentEntity?.id],
    enabled: !!currentEntity?.id,
  });

  const runAnalysisMutation = useMutation({
    mutationFn: () => apiRequest(`/api/compliance/analyze/${currentEntity?.id}`, "POST"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/compliance/review'] });
      toast({
        title: "Analysis Started",
        description: "AI compliance analysis is running. This may take a few minutes.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start compliance analysis. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resolveGapMutation = useMutation({
    mutationFn: (gapId: string) => apiRequest(`/api/compliance/gaps/${gapId}/resolve`, "PATCH"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/compliance/review'] });
      toast({
        title: "Gap Resolved",
        description: "Compliance gap marked as resolved.",
      });
    },
  });

  if (!currentEntity) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              Please select an entity to view compliance review.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "destructive";
      case "high": return "destructive";
      case "medium": return "secondary";
      case "low": return "outline";
      default: return "outline";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-green-600";
      case "analyzing": return "text-yellow-600";
      case "pending": return "text-blue-600";
      case "error": return "text-red-600";
      default: return "text-muted-foreground";
    }
  };

  const filteredGaps = review?.gaps?.filter((gap: ComplianceGap) => 
    selectedCategory === "all" || gap.category === selectedCategory
  ) || [];

  const categories = ["all", ...Array.from(new Set(review?.gaps?.map((gap: ComplianceGap) => gap.category) || []))];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">AI Compliance Review ⭐</h1>
          <p className="text-muted-foreground">
            AI-powered compliance gap analysis for {currentEntity.name}
          </p>
        </div>
        <Button 
          onClick={() => runAnalysisMutation.mutate()}
          disabled={runAnalysisMutation.isPending || review?.status === "analyzing"}
          data-testid="run-analysis-button"
        >
          {runAnalysisMutation.isPending || review?.status === "analyzing" ? (
            <>
              <i className="fas fa-spinner fa-spin mr-2"></i>
              Analyzing...
            </>
          ) : (
            <>
              <i className="fas fa-robot mr-2"></i>
              Run AI Analysis
            </>
          )}
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <i className="fas fa-spinner fa-spin text-2xl text-muted-foreground mb-4"></i>
              <p className="text-muted-foreground">Loading compliance review...</p>
            </div>
          </CardContent>
        </Card>
      ) : !review ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <i className="fas fa-shield-alt text-4xl text-muted-foreground"></i>
              <div>
                <h3 className="text-lg font-medium">No Compliance Review Available</h3>
                <p className="text-muted-foreground">
                  Run an AI analysis to identify potential compliance gaps.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Overall Score</p>
                    <p className="text-2xl font-bold">{review.overallScore}%</p>
                  </div>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    review.overallScore >= 80 ? 'bg-green-100 text-green-600' :
                    review.overallScore >= 60 ? 'bg-yellow-100 text-yellow-600' :
                    'bg-red-100 text-red-600'
                  }`}>
                    <i className={`fas ${
                      review.overallScore >= 80 ? 'fa-check-circle' :
                      review.overallScore >= 60 ? 'fa-exclamation-triangle' :
                      'fa-times-circle'
                    }`}></i>
                  </div>
                </div>
                <Progress value={review.overallScore} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Gaps</p>
                    <p className="text-2xl font-bold">{review.gaps?.length || 0}</p>
                  </div>
                  <i className="fas fa-exclamation-triangle text-2xl text-yellow-500"></i>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Documents Analyzed</p>
                    <p className="text-2xl font-bold">{review.documentsAnalyzed || 0}</p>
                  </div>
                  <i className="fas fa-file-text text-2xl text-blue-500"></i>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className={`text-sm font-medium capitalize ${getStatusColor(review.status)}`}>
                      {review.status}
                    </p>
                  </div>
                  <i className="fas fa-chart-line text-2xl text-purple-500"></i>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Category Filter */}
          <Card>
            <CardHeader>
              <CardTitle>Compliance Gaps</CardTitle>
              <CardDescription>
                Review identified compliance issues and take action
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className="capitalize"
                    data-testid={`filter-${category}`}
                  >
                    {category}
                  </Button>
                ))}
              </div>

              <div className="space-y-4">
                {filteredGaps.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {selectedCategory === "all" ? 
                      "No compliance gaps identified! 🎉" :
                      `No gaps found in "${selectedCategory}" category.`
                    }
                  </div>
                ) : (
                  filteredGaps.map((gap: ComplianceGap) => (
                    <Card key={gap.id} className="border-l-4 border-l-yellow-400">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant={getSeverityColor(gap.severity) as any}>
                                {gap.severity.toUpperCase()}
                              </Badge>
                              <span className="text-sm text-muted-foreground capitalize">
                                {gap.category}
                              </span>
                              {gap.documentName && (
                                <span className="text-sm text-muted-foreground">
                                  • {gap.documentName}
                                </span>
                              )}
                            </div>
                            <h4 className="font-medium">{gap.description}</h4>
                            <p className="text-sm text-muted-foreground">
                              <strong>Recommendation:</strong> {gap.recommendation}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={gap.status === "resolved" ? "success" : "secondary"}>
                              {gap.status}
                            </Badge>
                            {gap.status !== "resolved" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => resolveGapMutation.mutate(gap.id)}
                                disabled={resolveGapMutation.isPending}
                                data-testid={`resolve-gap-${gap.id}`}
                              >
                                <i className="fas fa-check mr-1"></i>
                                Resolve
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* AI Recommendations */}
          {review.recommendations && review.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>AI Recommendations</CardTitle>
                <CardDescription>
                  General compliance improvement suggestions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {review.recommendations.map((recommendation: string, index: number) => (
                    <div key={index} className="flex items-start gap-3">
                      <i className="fas fa-lightbulb text-yellow-500 mt-1"></i>
                      <p className="text-sm">{recommendation}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}