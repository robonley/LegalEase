import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Trash2, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IngestionJob {
  id: string;
  filename: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  errorMessage?: string;
  extractionResult?: any;
  createdAt: string;
}

interface PDFIngestionProps {
  onExtractionComplete?: (results: any[]) => void;
  className?: string;
}

export function PDFIngestion({ onExtractionComplete, className }: PDFIngestionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedJobs, setUploadedJobs] = useState<IngestionJob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const results = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/ingest/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        results.push(result);
      }
      return results;
    },
    onSuccess: (results) => {
      toast({
        title: 'Upload Successful',
        description: `${results.length} file(s) uploaded and processing started`,
      });
      
      // Add jobs to local state for tracking
      const newJobs = results.map(result => ({
        ...result,
        createdAt: new Date().toISOString(),
      }));
      setUploadedJobs(prev => [...prev, ...newJobs]);
      
      // Start polling for job status
      results.forEach(result => {
        pollJobStatus(result.jobId);
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload files',
        variant: 'destructive',
      });
    },
  });

  // Poll job status
  const pollJobStatus = useCallback(async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/ingest/jobs/${jobId}`, {
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to fetch job status');
        const jobStatus = await response.json();
        
        setUploadedJobs(prev => prev.map(job => 
          job.id === jobId ? { ...job, ...jobStatus } : job
        ));
        
        if (jobStatus.status === 'completed' || jobStatus.status === 'failed') {
          clearInterval(pollInterval);
          
          if (jobStatus.status === 'completed' && onExtractionComplete) {
            // Collect all completed results
            const allCompleted = uploadedJobs.filter(j => 
              j.status === 'completed' && j.extractionResult
            );
            if (allCompleted.length > 0) {
              onExtractionComplete(allCompleted.map(j => j.extractionResult));
            }
          }
        }
      } catch (error) {
        console.error('Error polling job status:', error);
        clearInterval(pollInterval);
      }
    }, 2000);
  }, [uploadedJobs, onExtractionComplete]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
  }, []);

  const handleFileUpload = useCallback((files: FileList) => {
    // Validate file types
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/tiff'];
    const invalidFiles = Array.from(files).filter(file => !allowedTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      toast({
        title: 'Invalid File Type',
        description: 'Only PDF and image files (PNG, JPEG, TIFF) are allowed',
        variant: 'destructive',
      });
      return;
    }

    // Check file sizes (50MB limit)
    const oversizedFiles = Array.from(files).filter(file => file.size > 50 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast({
        title: 'File Too Large',
        description: 'Files must be smaller than 50MB',
        variant: 'destructive',
      });
      return;
    }

    uploadMutation.mutate(files);
  }, [uploadMutation, toast]);

  const removeJob = useCallback((jobId: string) => {
    setUploadedJobs(prev => prev.filter(job => job.id !== jobId));
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <AlertCircle className="h-4 w-4 text-blue-500 animate-pulse" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      queued: 'secondary',
      processing: 'default',
      completed: 'default',
      failed: 'destructive',
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            ✨ Smart Document Extraction
          </CardTitle>
          <CardDescription>
            Upload incorporation papers, shareholder agreements, minute books, or other corporate documents. 
            Our AI scanning technology extracts structured data automatically. Multiple files can be uploaded at once. 
            Supported formats: PDF, PNG, JPEG, TIFF.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
              isDragging 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            data-testid="pdf-upload-area"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 rounded-full bg-muted">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <p className="text-lg font-medium">
                  {isDragging ? 'Drop files here' : 'Drag & drop files or click to browse'}
                </p>
                <p className="text-sm text-muted-foreground">
                  PDF, PNG, JPEG, TIFF files up to 50MB each
                </p>
              </div>
              <Button variant="outline" disabled={uploadMutation.isPending}>
                {uploadMutation.isPending ? 'Uploading...' : 'Select Files'}
              </Button>
            </div>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.tiff"
            onChange={handleFileSelect}
            className="hidden"
            data-testid="file-input"
          />
        </CardContent>
      </Card>

      {/* Job Status List */}
      {uploadedJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Status</CardTitle>
            <CardDescription>
              Track the progress of your document processing jobs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {uploadedJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center gap-4 p-4 border rounded-lg"
                  data-testid={`job-status-${job.id}`}
                >
                  <div className="flex-shrink-0">
                    {getStatusIcon(job.status)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-medium truncate" data-testid={`job-filename-${job.id}`}>
                        {job.filename}
                      </p>
                      {getStatusBadge(job.status)}
                    </div>
                    
                    {job.status === 'processing' && (
                      <div className="space-y-1">
                        <Progress value={job.progress} className="w-full" />
                        <p className="text-xs text-muted-foreground">
                          {job.progress}% complete
                        </p>
                      </div>
                    )}
                    
                    {job.status === 'failed' && job.errorMessage && (
                      <p className="text-sm text-red-600" data-testid={`job-error-${job.id}`}>
                        {job.errorMessage}
                      </p>
                    )}
                    
                    {job.status === 'completed' && job.extractionResult && (
                      <div className="text-sm text-green-600">
                        <p>✓ Extraction completed successfully</p>
                        {job.extractionResult.entitiesFound && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Found: {job.extractionResult.entitiesFound} entities, {job.extractionResult.peopleFound} people
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {job.status === 'completed' && job.extractionResult && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // TODO: Open extraction results modal
                        }}
                        data-testid={`view-results-${job.id}`}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Results
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeJob(job.id)}
                      data-testid={`remove-job-${job.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}