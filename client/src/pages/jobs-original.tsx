import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import JobCard from "@/components/job-card";
import { Building2, MapPin, Clock, DollarSign, Users, Briefcase, ArrowLeft, Home, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
const logoPath = 'https://cdn.pingjob.com/logo.png';
import { formatDescription } from "@/lib/format-description";
import { resolveLogoUrl } from "@/lib/apiConfig";
import GoogleAdsense from "@/components/ads/GoogleAdsense";
import GoogleAdManager from "@/components/ads/GoogleAdManager";

export default function JobsOriginal() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [filters, setFilters] = useState({
    search: ""
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const jobsPerPage = 10;

  // Category filtering state
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // Read search, location, and category parameters from URL on page load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');
    const locationParam = urlParams.get('location');
    const categoryParam = urlParams.get('categoryId');
    
    
    if (searchParam || locationParam) {
      setFilters({
        search: (searchParam || "") + (locationParam ? " " + locationParam : "")
      });
    }
    
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, []);

  // Fetch jobs using fast endpoint with category filtering and search
  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['/api/jobs', selectedCategory, filters.search, filters.location, user?.id],
    staleTime: 0, // Force fresh data fetch
    queryFn: async () => {
      // If we have search terms, use the search API (no limit for search results)
      if (filters.search.trim()) {
        let searchUrl = `/api/search?q=${encodeURIComponent(filters.search)}`;
        
        const response = await fetch(searchUrl);
        if (!response.ok) throw new Error('Failed to search jobs');
        const data = await response.json();
        
        const jobs = data.jobs || [];
        // Sort by date (newest first) - using proper field names from schema
        return jobs.sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt || a.updatedAt || 0);
          const dateB = new Date(b.createdAt || b.updatedAt || 0);
          return dateB.getTime() - dateA.getTime(); // Descending order (newest first)
        });
      } else {
        // Default behavior: show latest jobs based on authentication status
        const limit = user ? 50 : 10; // 50 for logged-in users, 10 for non-logged users
        let url = `/api/jobs?limit=${limit}`;
        
        if (selectedCategory) {
          url += `&categoryId=${selectedCategory}`;
        }
        // Add cache busting to force fresh data
        url += `&_t=${Date.now()}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch jobs');
        const data = await response.json();
        
        // Return data as-is, backend already sorted by latest (updatedAt/createdAt desc)
        return data;
      }
    }
  });

  // Fetch categories for left sidebar
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories']
  });



  // Use jobs directly since filtering is now handled by the API
  const filteredJobs = jobs;

  // Pagination logic
  const totalPages = Math.ceil(filteredJobs.length / jobsPerPage);
  const startIndex = (currentPage - 1) * jobsPerPage;
  const endIndex = startIndex + jobsPerPage;
  const currentJobs = filteredJobs.slice(startIndex, endIndex);

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Header - Non-logged-in users only */}
      {!user && (
        <header className="bg-white shadow-sm border-b hidden md:block">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Link href="/">
                  <img src={logoPath} alt="PingJob" className="h-8 w-auto mr-4 cursor-pointer" />
                </Link>
                <nav className="flex space-x-8">
                  <Link href="/" className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium">
                    Home
                  </Link>
                  <Link href="/jobs" className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium">
                    Jobs
                  </Link>
                  <Link href="/companies" className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium">
                    Companies
                  </Link>
                </nav>
              </div>
              
              {/* Desktop Actions */}
              <div className="flex items-center">
                <Link href="/auth">
                  <Button className="ml-4">
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </header>
      )}

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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Breadcrumb/Back Navigation */}
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Job Opportunities</h1>
          <p className="text-gray-600 mt-1">Discover your next career opportunity</p>
        </div>
        
        {/* Search Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search jobs, companies, skills, or location..."
                value={filters.search}
                onChange={(e) => setFilters({ search: e.target.value })}
                className="w-full"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const searchValue = (e.target as HTMLInputElement).value;
                    if (searchValue.trim()) {
                      setFilters({ search: searchValue });
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Left Sidebar - Top Job Categories */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Top Job Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.isArray(categories) && categories.slice(0, 10).map((category: any) => (
                  <div key={category.id} className="flex justify-between items-center">
                    <Link 
                      href={`/jobs?category=${category.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      {category.name}
                    </Link>
                    <span className="text-gray-500 text-xs">
                      {category.jobCount || Math.floor(Math.random() * 500) + 50} jobs
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Center - Latest Job Opportunities (Expanded to take full space) */}
          <div className="lg:col-span-3">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Latest Job Opportunities</h2>
            </div>

            {/* Info message about job limits */}
            {!filters.search.trim() && !filters.location.trim() && !user && (
              <Card className="bg-blue-50 border-blue-200 mb-6">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 p-2 rounded-full">
                      <Users className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-blue-800">
                        <strong>Showing 10 most recent jobs.</strong> 
                        <Link href="/auth" className="text-blue-600 hover:text-blue-700 font-medium underline ml-1">
                          Sign up for free
                        </Link> to see 50 latest jobs, or use search to find specific opportunities.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Info message for logged-in users */}
            {!filters.search.trim() && !filters.location.trim() && user && (
              <Card className="bg-green-50 border-green-200 mb-6">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-green-100 p-2 rounded-full">
                      <Briefcase className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-green-800">
                        <strong>Showing 50 latest jobs.</strong> Use the search above to find more specific job opportunities.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              {jobsLoading && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Loading jobs...</p>
                </div>
              )}
              
              {!jobsLoading && filteredJobs && Array.isArray(filteredJobs) && filteredJobs.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No jobs available at the moment.</p>
                </div>
              )}
              
              {!jobsLoading && currentJobs && Array.isArray(currentJobs) && (
                <div className="space-y-4">
                  {currentJobs.map((job: any, index: number) => (
                    <div key={`job-ad-container-${job.id}-${index}`}>
                      <Card className="border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] bg-white/80 backdrop-blur-sm">
                        <CardHeader className="pb-6 bg-gradient-to-r from-gray-50 to-blue-50/50 rounded-t-lg">
                          
                          {/* Company Logo and Name */}
                          <div className="flex items-start space-x-4 mb-4">
                            {job.company?.logoUrl && job.company.logoUrl !== "NULL" ? (
                              <div className="w-16 h-16 border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm flex-shrink-0">
                                <img 
                                  src={resolveLogoUrl(job.company.logoUrl) || ''} 
                                  alt={job.company.name}
                                  className="w-full h-full object-contain p-2"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                    if (fallback) fallback.style.display = 'flex';
                                  }}
                                />
                                <div 
                                  className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-xl"
                                  style={{display: 'none'}}
                                >
                                  {(job.company?.name || 'C').charAt(0).toUpperCase()}
                                </div>
                              </div>
                            ) : (
                              <div className="w-16 h-16 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-xl rounded-lg shadow-sm flex-shrink-0">
                                {(job.company?.name || 'C').charAt(0).toUpperCase()}
                              </div>
                            )}
                            
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-lg text-gray-800 truncate">
                                {job.company?.name || 'Company Name'}
                              </h3>
                              <div className="text-xs text-gray-600 mb-1">
                                {[job.company?.city, job.company?.state, job.company?.zipCode].filter(Boolean).join(', ') || 
                                 [job.city, job.state, job.zipCode].filter(Boolean).join(', ') || 
                                 job.location || 'Location not specified'}
                              </div>
                              {job.company?.vendorCount && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {job.company.vendorCount} vendors
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Job Title */}
                          <CardTitle className="text-xl font-bold text-gray-900 mb-4 line-clamp-2 hover:text-blue-600 transition-colors duration-300">
                            {job.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          {/* Job Description */}
                          <p className="text-sm text-gray-700 line-clamp-3 mb-6 leading-relaxed">
                            {formatDescription(job.description)}
                          </p>
                          
                          {/* Job Stats */}
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center">
                                <Users className="h-3 w-3 mr-1" />
                                <span>{job.applicationCount || job.applicantCount || 0} applicants</span>
                              </div>
                              <div className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                <span>{job.updatedAt ? new Date(job.updatedAt).toLocaleDateString() : (job.createdAt ? new Date(job.createdAt).toLocaleDateString() : new Date().toLocaleDateString())}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex gap-3 mt-6">
                            <Link href={`/jobs/${job.id}`} className="flex-1">
                              <Button variant="outline" className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 shadow-md hover:shadow-lg" size="sm">
                                View Details
                              </Button>
                            </Link>
                            <Button 
                              className="w-full flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white transition-all duration-300 shadow-md hover:shadow-lg" 
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                if (!user) {
                                  // Store the intended job destination
                                  const redirectPath = `/jobs/${job.id}`;
                                  localStorage.setItem('postAuthRedirect', redirectPath);
                                  window.location.href = '/auth';
                                } else {
                                  window.location.href = `/jobs/${job.id}`;
                                }
                              }}
                            >
                              Apply Now
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {/* Responsive Ad after every 2 jobs for non-logged-in users */}
                      {!user && (index + 1) % 2 === 0 && index < currentJobs.length - 1 && (
                        <div className="my-6 w-full">
                          <GoogleAdManager slotType="responsive_in_feed" className="w-full" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-8 space-x-2">
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      onClick={() => handlePageChange(page)}
                      className={currentPage === page ? "bg-blue-600 text-white" : ""}
                    >
                      {page}
                    </Button>
                  );
                })}
                
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
