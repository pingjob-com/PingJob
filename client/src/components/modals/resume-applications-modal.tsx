import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, FileText, Download, User, Mail, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { resolveResumeUrl } from "@/lib/apiConfig";
import type { JobWithCompany } from "@/lib/types";

interface ResumeApplicationsModalProps {
  job: JobWithCompany;
  isOpen: boolean;
  onClose: () => void;
}

export default function ResumeApplicationsModal({ 
  job, 
  isOpen, 
  onClose 
}: ResumeApplicationsModalProps) {
  const { user } = useAuth();

  // Debug logging
  console.log('ResumeApplicationsModal render:', {
    jobId: job?.id,
    isOpen,
    jobTitle: job?.title
  });

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['/api/jobs', job.id, 'applications'],
    queryFn: async () => {
      const response = await fetch(`/api/jobs/${job.id}/applications`);
      if (!response.ok) {
        throw new Error('Failed to fetch applications');
      }
      return response.json();
    },
    enabled: isOpen && !!job.id,
  });

  const handleDownloadResume = async (resumeUrl: string, fileName?: string) => {
    try {
      console.log(`📄 Starting resume download: ${resumeUrl}`);
      
      // If URL is a CDN URL (https://cdn.pingjob.com or https://bucket.s3.amazonaws.com), download directly
      if (resumeUrl && (resumeUrl.includes('cdn.pingjob.com') || resumeUrl.includes('.s3.'))) {
        console.log(`📄 Downloading directly from CDN/S3: ${resumeUrl}`);
        const link = document.createElement('a');
        link.href = resumeUrl;
        const downloadName = fileName || resumeUrl.split('/').pop() || 'resume.pdf';
        link.download = downloadName;
        link.setAttribute('crossOrigin', 'anonymous');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log(`✅ Resume downloaded successfully from CDN: ${downloadName}`);
        return;
      }
      
      // Fallback: Use backend API endpoint for local paths
      let filename = resumeUrl;
      
      if (resumeUrl.includes('/')) {
        filename = resumeUrl.split('/').pop() || resumeUrl;
      }
      
      console.log(`📄 Using API endpoint to download: ${filename}`);
      const apiUrl = `/api/resume/${filename}`;
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        console.error(`❌ API download failed with status ${response.status}`);
        throw new Error(`Download failed: ${response.status}`);
      }
      
      const contentDisposition = response.headers.get('Content-Disposition');
      let downloadFileName = fileName || 'resume.pdf';
      
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="([^"]+)"/);
        if (fileNameMatch) {
          downloadFileName = fileNameMatch[1];
        }
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadFileName;
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log(`✅ Resume downloaded successfully via API: ${downloadFileName}`);
    } catch (error) {
      console.error('❌ Download failed:', error);
      // Final fallback: try to open in new tab
      if (resumeUrl) {
        console.log(`📄 Attempting fallback: opening in new tab`);
        window.open(resumeUrl, '_blank');
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  console.log('ResumeApplicationsModal about to render Dialog with isOpen:', isOpen);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Resume Applications for {job.title}
          </DialogTitle>
          <DialogDescription>
            View and download resumes submitted for this position at {job.company?.name}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading applications...</span>
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No resume applications found for this job</p>
            <p className="text-sm mt-2">Applications will appear here when candidates apply</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {applications.length} Application{applications.length !== 1 ? 's' : ''}
              </h3>
              <Badge variant="outline">
                {(job as any).resumeCount || applications.length} Resume{((job as any).resumeCount || applications.length) !== 1 ? 's' : ''}
              </Badge>
            </div>

            <div className="grid gap-4">
              {applications.map((application: any) => (
                <Card key={application.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">
                            {application.user?.firstName} {application.user?.lastName}
                          </span>
                          {application.user?.email && (
                            <>
                              <Mail className="h-4 w-4 text-gray-400 ml-2" />
                              <span className="text-sm text-gray-600">{application.user.email}</span>
                            </>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                          <Calendar className="h-4 w-4" />
                          <span>Applied {formatDate(application.createdAt)}</span>
                        </div>

                        {application.coverLetter && (
                          <div className="mb-3">
                            <h4 className="text-sm font-medium mb-1">Cover Letter:</h4>
                            <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded max-h-20 overflow-y-auto">
                              {application.coverLetter}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="ml-4">
                        {application.resumeUrl ? (
                          <Button
                            size="sm"
                            onClick={() => handleDownloadResume(
                              resolveResumeUrl(application.resumeUrl) || application.resumeUrl,
                              application.originalFilename // Don't provide fallback - let server handle filename
                            )}
                            className="flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Download Resume
                          </Button>
                        ) : (
                          <Badge variant="outline" className="text-gray-500">
                            No Resume
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}