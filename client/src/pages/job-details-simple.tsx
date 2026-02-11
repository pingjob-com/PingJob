import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, MapPin, Users, Briefcase, Building, Menu, X, Search } from "lucide-react";
import { Link } from "wouter";
const logoPath = 'https://cdn.pingjob.com/logo.png';
import { useAuth } from "@/hooks/use-auth";
import JobApplicationModal from "@/components/modals/job-application-modal";
import { resolveLogoUrl } from "@/lib/apiConfig";
import { generateJobUrl, parseSlugUrl } from "../../../shared/slug-utils";
import GoogleAdManager from "@/components/ads/GoogleAdManager";

export default function JobDetailsSimple() {
  const { id, idSlug } = useParams();
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMainSearchResults, setShowMainSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<{jobs: any[], companies: any[]}>({jobs: [], companies: []});
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Extract ID from either the old format (:id) or new format (:idSlug)  
  const getJobId = () => {
    if (idSlug) {
      // New format: /jobs/123-software-engineer-position
      const parsed = parseSlugUrl(location);
      return parsed ? parsed.id : parseInt(idSlug.split('-')[0]);
    }
    // Legacy format: /jobs/123
    return parseInt(id || '');
  };
  
  const jobId = getJobId();

  // Handle search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setSearchLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`, {
        credentials: 'include'
      });
      const { jobs, companies } = await response.json();
      setSearchResults({ jobs, companies });
      setShowMainSearchResults(true);
    } catch (error) {
      setSearchResults({ jobs: [], companies: [] });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Handle apply button click
  const handleApply = () => {
    console.log('Apply Now clicked, user:', user);
    
    if (!user) {
      console.log('Redirecting to auth with job redirect...');
      // Store the current canonical URL for post-auth redirect
      localStorage.setItem('postAuthRedirect', location);
      console.log('Stored postAuthRedirect:', location);
      console.log('Current localStorage postAuthRedirect:', localStorage.getItem('postAuthRedirect'));
      navigate('/auth');
      return;
    }

    // User is authenticated, open application modal
    setIsApplicationModalOpen(true);
  };

  const { data: job, isLoading, error } = useQuery<any>({
    queryKey: ['/api/jobs', jobId],
    enabled: !!jobId && !isNaN(jobId),
    retry: false
  });

  // Redirect to canonical URL if needed
  useEffect(() => {
    if (job && job.title && jobId) {
      const canonicalPath = generateJobUrl(jobId, job.title);
      if (location !== canonicalPath && !isLoading) {
        console.log('Redirecting to canonical URL:', canonicalPath);
        // Use replace to avoid creating history entries for redirects
        navigate(canonicalPath, { replace: true });
      }
    }
  }, [job, jobId, location, navigate, isLoading]);

  // Auto-open Apply Now modal after OAuth redirect (only once)
  useEffect(() => {
    if (user && job && !hasAutoOpened) {
      // Check if user just came from auth (within last 5 seconds)
      const authTimestamp = sessionStorage.getItem('authCompleted');
      if (authTimestamp) {
        const timeSinceAuth = Date.now() - parseInt(authTimestamp);
        if (timeSinceAuth < 5000) {
          console.log('🔐 Auto-opening Apply Now modal after auth redirect');
          setIsApplicationModalOpen(true);
          setHasAutoOpened(true);
          sessionStorage.removeItem('authCompleted');
        }
      }
    }
  }, [user, job, hasAutoOpened]);

  // Fetch vendors for this job
  const { data: vendorData } = useQuery<any>({
    queryKey: ['/api/jobs', jobId, 'vendors'],
    enabled: !!jobId && !isNaN(jobId),
    retry: false
  });

  const vendors = vendorData?.vendors || [];
  const isLimited = vendorData?.isLimited || false;
  const totalVendorCount = vendorData?.totalCount || 0;
  const signupMessage = vendorData?.message;

  // Fetch related jobs
  const { data: relatedJobs = [] } = useQuery<any[]>({
    queryKey: ['/api/jobs', jobId, 'related'],
    enabled: !!jobId && !isNaN(jobId),
    retry: false
  });

  // Fetch relevant companies
  const { data: relevantCompanies = [] } = useQuery<any[]>({
    queryKey: ['/api/jobs', jobId, 'companies'],
    enabled: !!jobId && !isNaN(jobId),
    retry: false
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="p-4 sm:p-6">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
              <div className="bg-white rounded-lg shadow-sm p-4 sm:p-8">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    console.error('Job details error:', error);
    return (
      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <Link href="/jobs">
              <Button variant="ghost" className="mb-6">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Jobs
              </Button>
            </Link>
            <Card>
              <CardContent className="p-8 text-center">
                <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
                <p className="text-gray-600 mb-4">
                  Error: {error instanceof Error ? error.message : 'Unknown error'}
                </p>
                <p className="text-gray-600 mb-4">Job ID: {id}</p>
                <Button onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <Link href="/jobs">
              <Button variant="ghost" className="mb-6">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Jobs
              </Button>
            </Link>
            <Card>
              <CardContent className="p-8 text-center">
                <h2 className="text-xl font-semibold mb-2">Job Not Found</h2>
                <p className="text-gray-600 mb-4">Error: 404. Job not found</p>
                <p className="text-gray-600 mb-4">Job ID: {id}</p>
                <Button onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header - Non-logged-in users only */}
      {!user && (
        <header className="bg-white shadow-sm border-b md:hidden sticky top-0 z-50">
          <div className="px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Link href="/">
                  <img src={logoPath} alt="PingJob" className="h-8 w-auto cursor-pointer" />
                </Link>
              </div>
              
              {/* Mobile Hamburger Button */}
              <button
                data-testid="button-mobile-menu"
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>

            {/* Mobile Navigation Menu */}
            {mobileMenuOpen && (
              <nav className="py-4 border-t">
                <div className="flex flex-col space-y-3">
                  <Link 
                    href="/" 
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Home
                  </Link>
                  <Link 
                    href="/jobs" 
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Jobs
                  </Link>
                  <Link 
                    href="/companies" 
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Companies
                  </Link>
                  <Link 
                    href="/pricing" 
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Pricing
                  </Link>
                  <div className="pt-2 border-t">
                    <Link href="/auth" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full">
                        Sign In
                      </Button>
                    </Link>
                  </div>
                </div>
              </nav>
            )}
          </div>
        </header>
      )}

      {/* Desktop Header */}
      {!user && (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50 hidden md:block">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <div className="flex items-center">
                <Link href="/">
                  <img src={logoPath} alt="PingJob" className="h-10 w-auto" />
                </Link>
              </div>

              {/* Search Box */}
              <div className="flex-1 max-w-lg mx-8 relative">
                <form onSubmit={handleSearch} className="relative flex items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search jobs, companies, or skills..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      className="pl-10 pr-4 py-2 w-full"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    size="sm" 
                    className="ml-2 px-3"
                    disabled={!searchQuery.trim()}
                  >
                    Go
                  </Button>
                </form>
              </div>

              {/* Navigation & User Actions */}
              <div className="flex items-center space-x-6">
                {/* Navigation Links */}
                <nav className="hidden md:flex items-center space-x-4">
                  <Link href="/jobs" className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium">
                    Jobs
                  </Link>
                  <Link href="/companies" className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium">
                    Companies
                  </Link>
                  <Link href="/pricing" className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium">
                    Pricing
                  </Link>
                </nav>
                
                {/* Sign In/Sign Up Buttons */}
                <div className="flex items-center space-x-3">
                  <Link href="/auth">
                    <Button size="sm" variant="outline">
                      Sign Up
                    </Button>
                  </Link>
                  <Link href="/auth">
                    <Button size="sm">
                      Login
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </header>
      )}

      <div className="p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Mobile Buttons - Above Card */}
          <div className="flex flex-row items-center gap-2 md:hidden mb-6">
            <Link href="/jobs" className="flex-1">
              <Button variant="ghost" className="w-full px-4 py-2 text-sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Jobs
              </Button>
            </Link>
            
            {/* Apply Now Button - Mobile Only */}
            <Button
              onClick={handleApply}
              className="flex-1 bg-linkedin-blue text-white hover:bg-linkedin-dark px-4 py-2 text-base"
              size="lg"
            >
              Apply Now
            </Button>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Main Content - Left Side */}
            <div className="flex-1 min-w-0">
              <Card className="mb-6">
                {/* Desktop Buttons - Inside Card Header */}
                <div className="flex flex-row items-center gap-2 p-4 sm:p-8 hidden md:flex">
                  <Link href="/jobs" className="flex-initial">
                    <Button variant="ghost" className="px-4 py-2 text-base">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Jobs
                    </Button>
                  </Link>
                  
                  <div className="flex-1"></div>
                  
                  {/* Apply Now Button - Desktop Only */}
                  <div className="flex flex-col items-end gap-2">
                    <Button
                      onClick={handleApply}
                      className="bg-linkedin-blue text-white hover:bg-linkedin-dark px-8 py-2 text-base"
                      size="lg"
                    >
                      Apply Now
                    </Button>
                    {!user && (
                      <div className="w-full max-w-[200px]">
                        <GoogleAdManager slotType="responsive_in_feed" className="w-full scale-75 origin-right" />
                      </div>
                    )}
                  </div>
                </div>

          <CardContent className="p-4 sm:p-8">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              {job.title || 'No Title'}
            </h1>
            <div className="flex items-center gap-3 mb-2">
              {job.company?.logoUrl && job.company.logoUrl !== 'NULL' ? (
                <div className="w-10 h-10 border border-gray-200 rounded overflow-hidden bg-gray-50 flex-shrink-0">
                  <img 
                    src={resolveLogoUrl(job.company.logoUrl)}
                    alt={job.company?.name || 'Company'}
                    className="w-full h-full object-contain p-1"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded overflow-hidden bg-linkedin-blue text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
                  {((job as any).companyName || job.company?.name || 'U').charAt(0)}
                </div>
              )}
              <p className="text-base sm:text-lg text-gray-700 font-medium">
                {(job as any).companyName || job.company?.name || 'Unknown Company'}
              </p>
            </div>
            <p className="text-sm sm:text-base text-gray-600 mb-4">
              {(() => {
                const parts = [job.city, job.state].filter(Boolean);
                if (job.zipCode) parts.push(job.zipCode);
                if (parts.length === 0 && job.country) return job.country;
                return parts.join(', ') || job.location || 'Location not specified';
              })()}
            </p>
            <div className="prose max-w-none">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Job Description</h3>
              <div 
                dangerouslySetInnerHTML={{ 
                  __html: job.description || 'No description available' 
                }} 
                className="mb-6"
              />
              
              {job.requirements && (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Requirements</h3>
                  <div 
                    dangerouslySetInnerHTML={{ 
                      __html: job.requirements 
                    }} 
                    className="mb-6"
                  />
                </>
              )}
              
              {!user && (
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <GoogleAdManager slotType="responsive_in_feed" className="w-full" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

              {vendors.length > 0 && (
                <>
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Users className="h-5 w-5 mr-2" />
                        Approved Vendors
                      </CardTitle>
                      {isLimited && (
                        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                          <p className="text-sm text-blue-700 mb-2">
                            <span className="font-medium">{signupMessage}</span>
                          </p>
                          <Link href="/auth">
                            <Button size="sm" className="bg-linkedin-blue hover:bg-blue-700">
                              Sign Up to View All {totalVendorCount} Vendors
                            </Button>
                          </Link>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-2">
                        {vendors.map((vendor: any) => (
                          <div key={vendor.id} className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                            <div className="space-y-2">
                              <h4 className="font-semibold text-gray-900 text-lg">{vendor.name}</h4>
                              
                              {(vendor.address || vendor.city) && (
                                <div className="flex items-center text-sm text-gray-600">
                                  <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                                  <span>
                                    {vendor.address && vendor.address !== 'NULL' && `${vendor.address}, `}
                                    {vendor.city && vendor.city !== 'NULL' && vendor.state && vendor.state !== 'NULL' && `${vendor.city}, ${vendor.state}`}
                                    {vendor.zipCode && vendor.zipCode !== 'NULL' && `, ${vendor.zipCode}`}
                                    {vendor.city && vendor.city !== 'NULL' && `, United States`}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {!user && (
                    <div className="mb-6">
                      <GoogleAdManager slotType="responsive_in_feed" className="w-full" />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Right Sidebar - Desktop Only */}
            <div className="hidden md:block w-80 flex-shrink-0">
              {/* Related Jobs Section */}
              {relatedJobs.length > 0 && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center text-base">
                      <Briefcase className="h-4 w-4 mr-2" />
                      Related Jobs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {relatedJobs.map((relatedJob: any) => (
                        <Link 
                          key={relatedJob.id} 
                          href={relatedJob.canonicalUrl || `/jobs/${relatedJob.id}`}
                        >
                          <div className="border border-gray-200 rounded-lg p-3 bg-white hover:shadow-md hover:border-linkedin-blue transition-all cursor-pointer">
                            <h4 className="font-semibold text-gray-900 text-sm hover:text-linkedin-blue transition-colors line-clamp-2">
                              {relatedJob.title}
                            </h4>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                              {relatedJob.companyName}
                            </p>
                            {relatedJob.location && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                                {relatedJob.location}
                              </p>
                            )}
                            {relatedJob.salary && (
                              <p className="text-xs text-green-600 font-medium mt-1">
                                {relatedJob.salary}
                              </p>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Relevant Companies Section */}
              {relevantCompanies.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-base">
                      <Building className="h-4 w-4 mr-2" />
                      Relevant Companies
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {relevantCompanies.map((company: any) => (
                        <Link 
                          key={company.id} 
                          href={company.canonicalUrl || `/companies/${company.id}`}
                        >
                          <div className="border border-gray-200 rounded-lg p-3 bg-white hover:shadow-md hover:border-linkedin-blue transition-all cursor-pointer">
                            <div className="flex items-start space-x-2">
                              <div className="w-10 h-10 border border-gray-200 rounded overflow-hidden bg-gray-50 flex-shrink-0">
                                {company.logoUrl && company.logoUrl !== 'NULL' ? (
                                  <img 
                                    src={resolveLogoUrl(company.logoUrl)}
                                    alt={company.name}
                                    className="w-full h-full object-contain p-1"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-linkedin-blue text-white font-bold text-sm">
                                    {company.name.charAt(0)}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 text-sm hover:text-linkedin-blue transition-colors line-clamp-2">
                                  {company.name}
                                </h4>
                                <p className="text-xs text-green-600 mt-1">
                                  {company.jobCount} open {company.jobCount === 1 ? 'job' : 'jobs'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Job Application Modal */}
      {job && (
        <JobApplicationModal
          job={job}
          isOpen={isApplicationModalOpen}
          onClose={() => setIsApplicationModalOpen(false)}
        />
      )}
    </div>
  );
}