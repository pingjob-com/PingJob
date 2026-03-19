import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import BackToTopButton from "@/components/back-to-top-button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import {
  Search,
  Building2,
  Users,
  MapPin,
  Briefcase,
  LogOut,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Rocket,
  Target,
  Bot,
  BarChart3,
  Star,
  TrendingUp,
  Clock,
  Calendar,
  DollarSign,
  Plus,
  Edit,
  Smartphone,
  Download,
  Menu,
  X
} from "lucide-react";
import { Link, useLocation } from "wouter";
const logoPath = 'https://cdn.pingjob.com/logo.webp';
import { resolveLogoUrl } from "@/lib/apiConfig";
import { JobCategories } from "@/components/job-categories";
import Footer from "../components/footer";
import GoogleAdsense from "@/components/ads/GoogleAdsense";
import GoogleAdManager from "@/components/ads/GoogleAdManager";
import { LiveActivityFeed, InstantJobMatchBar, ResumeScoreTeaser } from "@/components/engagement-features";

// Helper function to format location - shows real location data when available
const formatJobLocation = (job: any) => {
  // Priority 1: Use job's city, state, zip if all available and meaningful
  if (job.city && job.city.trim() && job.city !== "Remote" && job.state && job.state.trim()) {
    if (job.zipCode && job.zipCode.trim()) {
      return `${job.city}, ${job.state} ${job.zipCode}`;
    } else {
      return `${job.city}, ${job.state}`;
    }
  }
  
  // Priority 2: Use just city if meaningful
  if (job.city && job.city.trim() && job.city !== "Remote") {
    return job.city;
  }
  
  // Priority 3: Use just state if city is missing
  if (job.state && job.state.trim()) {
    return job.state;
  }
  
  // Priority 4: Use job location field if meaningful
  if (job.location && job.location.trim() && job.location !== "Remote") {
    const cleaned = job.location.replace(', United States', '').replace(' United States', '').replace('United States', '').trim();
    if (cleaned) return cleaned;
  }
  
  // Don't show anything if no meaningful location found
  return '';
};

// Custom hook to check if an image URL loads successfully
const useImageExists = (url: string | undefined) => {
  const [exists, setExists] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!url) {
      setExists(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const img = new Image();
    
    img.onload = () => {
      setExists(true);
      setLoading(false);
    };
    
    img.onerror = () => {
      setExists(false);
      setLoading(false);
    };
    
    img.src = url;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [url]);

  return { exists, loading };
};

// Component that only shows logo if it exists
const LogoImage = ({ company, className = "w-12 h-12" }: { company: any; className?: string }) => {
  const logoUrl = company.logoUrl && company.logoUrl !== "NULL" ? resolveLogoUrl(company.logoUrl) : undefined;
  const { exists, loading } = useImageExists(logoUrl);

  if (loading) {
    // Show loading placeholder while checking if image exists
    return (
      <div className={`${className} bg-gray-100 rounded flex items-center justify-center flex-shrink-0 animate-pulse`}>
        <Building2 className="h-6 w-6 text-gray-300" />
      </div>
    );
  }

  if (!exists || !logoUrl) {
    // Show fallback icon if logo doesn't exist
    return (
      <div className={`${className} bg-gray-100 rounded flex items-center justify-center flex-shrink-0`}>
        <Building2 className="h-6 w-6 text-gray-400" />
      </div>
    );
  }

  // Show actual logo if it exists
  return (
    <div className={`${className} border border-gray-200 rounded overflow-hidden bg-white flex-shrink-0`}>
      <img 
        src={logoUrl} 
        alt={company.name}
        className="w-full h-full object-contain"
      />
    </div>
  );
};

export default function PingJobHome() {
  const { user, logoutMutation } = useAuth();
  const queryClient = useQueryClient();
  const [location, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentJobPage, setCurrentJobPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [companyCount, setCompanyCount] = useState<number>(76806);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [featuredJobId, setFeaturedJobId] = useState<number | null>(null);
  const [showCompanies, setShowCompanies] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showMainSearchResults, setShowMainSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<{jobs: any[], companies: any[]}>({jobs: [], companies: []});
  const [searchLoading, setSearchLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [heroExpanded, setHeroExpanded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [aiResults, setAiResults] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSearched, setAiSearched] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const jobsPerPage = 40; // 4 columns × 10 rows
  const totalJobsToShow = 200; // 5 pages × 40 jobs

  // Determine job display limit based on user authentication status
  const getJobDisplayLimit = () => {
    return user ? 25 : 10; // 25 jobs for logged-in users, 10 for non-logged-in users
  };

  // Detect mobile device with more robust detection
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = (
        window.innerWidth <= 768 || 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        ('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0)
      );
      setIsMobile(isMobileDevice);
      // Debug log for troubleshooting
      console.log('Mobile detection:', {
        isMobileDevice,
        innerWidth: window.innerWidth,
        userAgent: navigator.userAgent,
        touchSupport: 'ontouchstart' in window
      });
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Handle Apply Now click - preserves job context for after login
  const handleApplyNow = (jobId: number) => {
    if (!user) {
      // Store the intended job destination in localStorage
      const redirectPath = `/jobs/${jobId}`;
      localStorage.setItem('postAuthRedirect', redirectPath);
      // Use router navigation instead of window.location.href to preserve localStorage
      navigate('/auth');
    } else {
      // User is logged in, go directly to job details page
      navigate(`/jobs/${jobId}`);
    }
  };

  // Fetch public jobs for homepage display (100 jobs total for pagination)
  const { data: jobsData, isLoading: jobsLoading, refetch: refetchJobs } = useQuery<any[]>({
    queryKey: ['/api/jobs', { limit: totalJobsToShow }],
    staleTime: 0, // Always fetch fresh data
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: true, // Refetch when window gets focus
    refetchOnMount: true, // Always refetch when component mounts
    retry: false // Don't retry on failure
  });


  // Listen for job application events to refresh applicant counts
  useEffect(() => {
    const handleJobApplicationSubmitted = (event: any) => {
      queryClient.removeQueries({ queryKey: ['/api/jobs'] });
      
      // Single refresh with delay to prevent rate limiting
      setTimeout(() => {
        refetchJobs();
      }, 1000);
    };

    window.addEventListener('jobApplicationSubmitted', handleJobApplicationSubmitted);
    return () => window.removeEventListener('jobApplicationSubmitted', handleJobApplicationSubmitted);
  }, [queryClient, refetchJobs]);

  // Fetch categories with error handling
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ['/api/categories'],
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false
  });

  // Fetch top companies with error handling
  const { data: topCompanies = [] } = useQuery<any[]>({
    queryKey: ['/api/companies/top'],
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false
  });

  // Fetch platform statistics with error handling (using global fetcher for mobile)
  const { data: platformStats } = useQuery<{totalUsers: number, totalCompanies: number, activeJobs: number, totalJobs: number, todayJobs: number}>({
    queryKey: ['/api/platform/stats'],
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: false
  });

  // Force update company count when data arrives
  useEffect(() => {
    if (platformStats?.totalCompanies) {
      setCompanyCount(platformStats.totalCompanies);
    }
  }, [platformStats]);

  const displayStats = {
    totalUsers: platformStats?.totalUsers || 872,
    totalCompanies: companyCount,
    activeJobs: platformStats?.activeJobs || 12
  };

  const jobs = jobsData || [];
  const jobDisplayLimit = getJobDisplayLimit();
  
  // Apply user-based job limit to available jobs (show all 100 for proper pagination)
  const limitedJobs = jobs.slice(0, totalJobsToShow);
  
  // Calculate pagination for jobs based on limited jobs
  const startIndex = (currentJobPage - 1) * jobsPerPage;
  const endIndex = startIndex + jobsPerPage;
  const currentJobs = limitedJobs.slice(startIndex, endIndex);

  
  // Handle job pagination
  const handleJobPageChange = (page: number) => {
    setCurrentJobPage(page);
    // Scroll to jobs section when page changes
    const jobsSection = document.getElementById('jobs-section');
    if (jobsSection) {
      jobsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Force re-render when page changes
  useEffect(() => {
    // This effect runs whenever currentJobPage changes
    // The dependency on currentJobPage ensures jobs display updates
  }, [currentJobPage]);
  
  const totalJobs = limitedJobs.length;
  const totalPages = Math.ceil(totalJobs / jobsPerPage);

  // Calculate real-time statistics
  const jobStats = {
    totalJobs: platformStats?.totalJobs || jobs.length,
    activeCompanies: platformStats?.totalCompanies || 76806,
    totalCategories: categories.length,
    todayJobs: platformStats?.todayJobs || Math.floor(jobs.length * 0.08)
  };

  // Featured job rotation - reduced frequency to prevent rate limiting
  useEffect(() => {
    if (jobs.length > 0) {
      const interval = setInterval(() => {
        const randomJob = jobs[Math.floor(Math.random() * jobs.length)];
        setFeaturedJobId(randomJob.id);
      }, 60000); // Changed from 10 seconds to 60 seconds

      return () => clearInterval(interval);
    }
  }, [jobs]);

  // Listen for job updates and applications (throttled to prevent rate limiting)
  useEffect(() => {
    let updateTimeout: NodeJS.Timeout;
    
    const handleJobUpdated = () => {
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => {
        queryClient.removeQueries({ queryKey: ['/api/jobs'] });
        queryClient.refetchQueries({ queryKey: ['/api/jobs'] });
      }, 2000); // Throttle to 2 seconds
    };

    window.addEventListener('jobUpdated', handleJobUpdated);
    
    return () => {
      window.removeEventListener('jobUpdated', handleJobUpdated);
      clearTimeout(updateTimeout);
    };
  }, [queryClient]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchLoading(true);
      setShowSearchDropdown(false); // Hide dropdown when doing main search
      setShowMainSearchResults(true); // Show main search results
      
      try {
        // Search both jobs and companies using mobile-aware fetcher
        const [jobsResponse, companiesResponse] = await Promise.all([
          apiRequest('GET', `/api/search?q=${encodeURIComponent(searchQuery)}&limit=20`),
          apiRequest('GET', `/api/companies/search?query=${encodeURIComponent(searchQuery)}&limit=20`)
        ]);
        
        const jobsData = await jobsResponse.json();
        const companiesData = await companiesResponse.json();
        
        // Handle different response structures
        const jobs = jobsData?.jobs || jobsData || [];
        const companies = companiesData || [];
        
        setSearchResults({ jobs, companies });
      } catch (error) {
        // Search failed silently
        setSearchResults({ jobs: [], companies: [] });
      } finally {
        setSearchLoading(false);
      }
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // If user clears the search, immediately hide results
    if (value.trim() === '') {
      setShowMainSearchResults(false);
      setShowSearchDropdown(false);
      setSearchResults({jobs: [], companies: []});
      return;
    }
    
    // Debounced search for both mobile and desktop
    if (value.length >= 2) {
      const timeout = setTimeout(() => {
        // Both mobile and desktop: Show main search results inline, no dropdown overlay
        setShowSearchDropdown(false);
        performLiveSearch(value);
      }, 300); // 300ms debounce
      
      setSearchTimeout(timeout);
    } else {
      setShowMainSearchResults(false);
      setShowSearchDropdown(false);
      setSearchResults({jobs: [], companies: []});
    }
  };

  // Live search function for both mobile and desktop
  const performLiveSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setSearchLoading(true);
    // Show main results for both mobile and desktop
    setShowMainSearchResults(true);
    
    try {
      const [jobsResponse, companiesResponse] = await Promise.all([
        apiRequest('GET', `/api/search?q=${encodeURIComponent(query)}&limit=10`),
        apiRequest('GET', `/api/companies/search?query=${encodeURIComponent(query)}&limit=5`)
      ]);
      
      const jobsData = await jobsResponse.json();
      const companiesData = await companiesResponse.json();
      
      const jobs = jobsData?.jobs || jobsData || [];
      const companies = companiesData || [];
      
      setSearchResults({ jobs, companies });
    } catch (error) {
      setSearchResults({ jobs: [], companies: [] });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim() || aiQuery.trim().length < 2) return;
    setAiLoading(true);
    setAiSearched(true);
    try {
      const response = await apiRequest('GET', `/api/ai-search?q=${encodeURIComponent(aiQuery.trim())}`);
      const data = await response.json();
      setAiResults(data.results || []);
      setAiSummary(data.summary || "");
    } catch (error) {
      setAiResults([]);
      setAiSummary("");
    } finally {
      setAiLoading(false);
    }
  };

  const handleResultClick = () => {
    // Always close desktop dropdown
    setShowSearchDropdown(false);
    if (isMobile) {
      // On mobile, clear search results but keep query for context
      setShowMainSearchResults(false);
      // Optional: Clear search query on mobile too for clean UX
      // setSearchQuery("");
    } else {
      // On desktop, clear everything
      setSearchQuery("");
      setShowMainSearchResults(false);
    }
  };

  return (
    <>
      {/* Mobile Header - Non-logged-in users only - EXACTLY like jobs page */}
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
      
      <div className="min-h-screen bg-gray-50">
      {/* Desktop Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 hidden md:block w-full">
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
                    placeholder="Search jobs, companies, skills, or location..."
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
              
              {/* User Actions */}
              {user ? (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-700">
                    Welcome, {user.firstName || user.email}
                  </span>
                  {user.userType === 'admin' && (
                    <Link href="/admin">
                      <Button size="sm" variant="outline">
                        Admin
                      </Button>
                    </Link>
                  )}
                  {user.userType === 'recruiter' && (
                    <Link href="/recruiter">
                      <Button size="sm" variant="outline">
                        Dashboard
                      </Button>
                    </Link>
                  )}
                  <Button size="sm" variant="outline" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-1" />
                    Logout
                  </Button>
                </div>
              ) : (
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
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Feature 2: Live Hiring Activity Feed Ticker */}
      <LiveActivityFeed />

      {/* Universal Search Results Section - Visible on both mobile and desktop */}
      {showMainSearchResults && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Search Results for "{searchQuery}"
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {searchLoading ? "Searching..." : `Found ${searchResults.jobs.length} jobs and ${searchResults.companies.length} companies`}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setShowMainSearchResults(false);
                  setShowSearchDropdown(false);
                  setSearchQuery("");
                  setSearchResults({jobs: [], companies: []});
                }}
              >
                Clear Search
              </Button>
            </div>

            {searchLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Jobs Results */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Briefcase className="h-5 w-5 mr-2 text-blue-600" />
                    Jobs ({searchResults.jobs.length})
                  </h3>
                  {searchResults.jobs.length > 0 ? (
                    <div className="space-y-4">
                      {searchResults.jobs.slice(0, 10).map((job: any) => (
                        <div key={job.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/jobs/${job.id}`)}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 mb-1">{job.title}</h4>
                              <p className="text-sm text-gray-600 mb-1">{job.company?.name}</p>
                              <div className="flex items-center space-x-4 text-sm mb-2">
                                {formatJobLocation(job) && (
                                  <div className="flex items-center text-blue-600 font-medium">
                                    <MapPin className="h-4 w-4 mr-1" />
                                    <span>{formatJobLocation(job)}</span>
                                  </div>
                                )}
                                <div className="flex items-center">
                                  <Users className="h-3 w-3 mr-1" />
                                  <span>{job.applicationCount || 0} applicants</span>
                                </div>
                                {job.salary && (
                                  <div className="flex items-center">
                                    <DollarSign className="h-3 w-3 mr-1" />
                                    <span>{job.salary}</span>
                                  </div>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 line-clamp-2">{job.description}</p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 ml-2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No jobs found matching your search.</p>
                  )}
                </div>

                {/* Companies Results */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Building2 className="h-5 w-5 mr-2 text-green-600" />
                    Companies ({searchResults.companies.length})
                  </h3>
                  {searchResults.companies.length > 0 ? (
                    <div className="space-y-4">
                      {searchResults.companies.slice(0, 10).map((company: any) => (
                        <div key={company.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/companies/${company.id}`)}>
                          <div className="flex items-center space-x-3">
                            <LogoImage company={company} />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 mb-1">{company.name}</h4>
                              <p className="text-sm text-gray-600 mb-1">{company.industry || 'Technology'}</p>
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                {(company.city || company.state || company.zipCode || company.location) && (
                                  <div className="flex items-center">
                                    <MapPin className="h-3 w-3 mr-1" />
                                    <span>
                                      {[
                                        company.location,
                                        [company.city, company.state, company.zipCode].filter(Boolean).join(', ')
                                      ].filter(Boolean).join(' • ')}
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-center">
                                  <Briefcase className="h-3 w-3 mr-1" />
                                  <span>{company.jobCount || 0} jobs</span>
                                </div>
                              </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No companies found matching your search.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Desktop Search Results Overlay - STRICTLY desktop only */}
      {!isMobile && showSearchDropdown && !showMainSearchResults && (
        <div className="fixed inset-0 bg-black bg-opacity-20 z-40" onClick={() => setShowSearchDropdown(false)} />
      )}
      
      {/* Desktop Search Dropdown - STRICTLY desktop only, positioned relative to search box */}
      {!isMobile && showSearchDropdown && !showMainSearchResults && (searchResults.jobs.length > 0 || searchResults.companies.length > 0) && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {searchResults.jobs.length > 0 && (
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Jobs</h3>
              {searchResults.jobs.slice(0, 5).map((job: any) => (
                <Link 
                  key={job.id} 
                  href={`/jobs/${job.id}`}
                  onClick={handleResultClick}
                  className="block p-2 hover:bg-gray-50 rounded"
                >
                  <div className="font-medium">{job.title}</div>
                  <div className="text-sm text-gray-600">{job.company?.name} • {formatJobLocation(job)}</div>
                </Link>
              ))}
            </div>
          )}
          
          {searchResults.companies.length > 0 && (
            <div className="p-4 border-t border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">Companies</h3>
              {searchResults.companies.slice(0, 5).map((company: any) => (
                <Link 
                  key={company.id} 
                  href={`/companies/${company.id}`}
                  onClick={handleResultClick}
                  className="block p-2 hover:bg-gray-50 rounded"
                >
                  <div className="font-medium">{company.name}</div>
                  <div className="text-sm text-gray-600">
                    {company.industry} • {[
                      company.location,
                      [company.city, company.state, company.zipCode].filter(Boolean).join(', ')
                    ].filter(Boolean).join(' • ')}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Desktop Main Content */}
      <main className="desktop-only">
        {/* Platform Features Row */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <TooltipProvider>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center cursor-default">
                    <p className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">100% Client-Only Jobs</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Direct opportunities from hiring Companies.</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center cursor-default">
                    <p className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">10X Recruiter Engagement</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Higher response rates than traditional job boards</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center cursor-default">
                    <p className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">One Clear Goal</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Presenting Qualified Talent Directly.</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center cursor-default">
                    <p className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">AI-Powered Matching</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Smart algorithms match you with relevant jobs</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center cursor-default">
                    <p className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">Real-Time Analytics</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Track your application progress and market trends</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-center cursor-default">
                    <p className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">Resume Score™</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Get instant feedback on your resume quality</p>
                </TooltipContent>
              </Tooltip>
              </div>
            </TooltipProvider>
          </div>
        </div>

        {/* AI Job Assistant + Instant Job Match - Two Column Layout */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <Card className="border-0 shadow-xl bg-gradient-to-r from-indigo-50 via-blue-50 to-purple-50 overflow-hidden h-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-2.5 rounded-xl shadow-lg">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">AI Job Assistant</h3>
                  <p className="text-sm text-gray-500">Ask me anything about jobs, companies, or skills</p>
                </div>
              </div>
              <form onSubmit={handleAiSearch} className="flex gap-2 mb-4">
                <Input
                  type="text"
                  placeholder='Try "React developer jobs in Texas" or "companies hiring for cloud engineers"...'
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  className="flex-1 bg-white border-gray-200 shadow-sm"
                />
                <Button
                  type="submit"
                  disabled={aiLoading || aiQuery.trim().length < 2}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 shadow-md"
                >
                  {aiLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </form>

              {aiLoading && (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              )}

              {!aiLoading && aiSearched && aiSummary && (
                <div className="bg-white rounded-lg px-4 py-2 mb-2 border border-blue-100">
                  <p className="text-sm text-blue-700 font-medium">{aiSummary}</p>
                </div>
              )}

              {!aiLoading && aiSearched && aiResults.length === 0 && (
                <div className="text-center py-6 bg-white rounded-lg">
                  <p className="text-gray-500 text-sm">No results found. Try a different query.</p>
                </div>
              )}

              {!aiLoading && aiResults.length > 0 && (
                <div className="space-y-2">
                  {aiResults.map((item: any, idx: number) => (
                    <Link
                      key={`ai-${idx}-${item.id}`}
                      href={item._type === 'vendor' ? `/companies/${item.client_company_id}` : item._type === 'company' ? `/companies/${item.id}` : `/jobs/${item.id}`}
                    >
                      <div className="bg-white rounded-lg p-4 hover:shadow-md transition-all duration-200 border border-gray-100 cursor-pointer flex items-center gap-4">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${item._type === 'vendor' ? 'bg-purple-100' : item._type === 'company' ? 'bg-green-100' : 'bg-blue-100'}`}>
                          {item._type === 'vendor' ? (
                            <Users className="h-5 w-5 text-purple-600" />
                          ) : item._type === 'company' ? (
                            <Building2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <Briefcase className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm text-gray-900 truncate">
                              {item._type === 'vendor' ? item.name : item._type === 'company' ? item.name : item.title}
                            </h4>
                            <Badge variant="secondary" className={`text-xs flex-shrink-0 ${item._type === 'vendor' ? 'bg-purple-100 text-purple-700' : ''}`}>
                              {item._type === 'vendor' ? 'Vendor' : item._type === 'company' ? 'Company' : 'Job'}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {item._type === 'vendor'
                              ? `Vendor for ${item.client_company}${item.city ? ' · ' + [item.city, item.state].filter(Boolean).join(', ') : ''}`
                              : item._type === 'company'
                              ? [item.industry, item.location].filter(Boolean).join(' · ')
                              : [item.company?.name, formatJobLocation(item)].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instant Job Match - right column */}
          <InstantJobMatchBar />
          </div>
        </div>

        {/* Feature 4: Resume Score Teaser - logged-in users only */}
        {user && <ResumeScoreTeaser />}

        {/* Desktop Main Content - Jobs Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            {/* Job Opportunities (10 rows × 4 jobs = 40 jobs per page) */}
            <div id="jobs-section">
              {jobsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse bg-white">
                      <div className="h-12 bg-gray-200 rounded mb-3"></div>
                      <div className="h-4 bg-gray-200 rounded mb-3"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                      <div className="flex gap-2">
                        <div className="h-8 bg-gray-200 rounded flex-1"></div>
                        <div className="h-8 bg-gray-200 rounded flex-1"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : currentJobs.length > 0 ? (
                <>
                  <div key={`jobs-page-${currentJobPage}`} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {currentJobs.map((job: any, index: number) => (
                      <>
                        <Card key={`${job.id}-page-${currentJobPage}`} className="border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] bg-white/80 backdrop-blur-sm">
                          <CardHeader className="pb-3 bg-gradient-to-r from-gray-50 to-blue-50/50 rounded-t-lg">
                            {/* Company Logo and Name */}
                            <div className="flex items-start space-x-3 mb-2">
                              <LogoImage company={job.company} className="w-12 h-12" />
                              
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm text-gray-800">
                                  {job.company?.name || 'Company Name'}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="text-xs text-gray-500">
                                    {formatJobLocation(job) || 'Location not specified'}
                                  </div>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 whitespace-nowrap">
                                    {job.company?.vendorCount || 0} vendors
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Job Title */}
                            <CardTitle className="text-base font-bold text-gray-900 line-clamp-1 hover:text-blue-600 transition-colors duration-300">
                              {job.title}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-4">
                            {/* Job Description */}
                            <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                              {job.description}
                            </p>
                            
                            {/* Job Stats */}
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                              <div className="flex items-center space-x-3">
                                <div className="flex items-center">
                                  <Users className="h-3 w-3 mr-1" />
                                  <span>{job.applicationCount || job.categoryMatchedApplicants || 0} applicants</span>
                                </div>
                                <div className="flex items-center">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  <span>{job.updatedAt ? new Date(job.updatedAt).toLocaleDateString() : (job.createdAt ? new Date(job.createdAt).toLocaleDateString() : new Date().toLocaleDateString())}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {/* Admin Edit Button */}
                              {(user?.email === 'krupas@vedsoft.com' || user?.email === 'krupashankar@gmail.com' || user?.userType === 'admin') && (
                                <Button 
                                  variant="outline" 
                                  className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white transition-all duration-300 shadow-md hover:shadow-lg" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    window.location.href = `/admin/edit-job/${job.id}`;
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                              )}
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
                                  handleApplyNow(job.id);
                                }}
                              >
                                Apply Now
                              </Button>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Desktop ad placement after every 4 jobs (full row in 4-column grid) */}
                        {(index + 1) % 4 === 0 && (
                          <div key={`ad-${index}`} className="col-span-full w-full my-6">
                            {user ? (
                              <GoogleAdsense adSlot="3731759815" />
                            ) : (
                              <GoogleAdManager slotType="responsive_in_feed" className="w-full" />
                            )}
                          </div>
                        )}
                      </>
                    ))}
                  </div>

                  {/* Ad placement before pagination */}
                  <div className="col-span-full w-full my-8">
                    {user ? (
                      <GoogleAdsense adSlot="3731759815" />
                    ) : (
                      <GoogleAdManager slotType="responsive_in_feed" className="w-full" />
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg">
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Briefcase className="h-12 w-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">No Jobs Available</h3>
                  <p className="text-gray-600 mb-8 text-lg">Check back soon for new opportunities</p>
                  <Button className="px-10 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
                    Post a Job
                    <Plus className="h-5 w-5 ml-2" />
                  </Button>
                </div>
              )}
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center mt-12 space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => handleJobPageChange(currentJobPage - 1)}
                    disabled={currentJobPage === 1}
                    className="px-4 py-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 shadow-md hover:shadow-lg"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentJobPage === page ? "default" : "outline"}
                      onClick={() => handleJobPageChange(page)}
                      className={currentJobPage === page 
                        ? "px-4 py-2 min-w-[2.5rem] bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg" 
                        : "px-4 py-2 min-w-[2.5rem] border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 shadow-md hover:shadow-lg"
                      }
                    >
                      {page}
                    </Button>
                  ))}
                  
                  <Button
                    variant="outline"
                    onClick={() => handleJobPageChange(currentJobPage + 1)}
                    disabled={currentJobPage === totalPages}
                    className="px-4 py-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 shadow-md hover:shadow-lg"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
              
            </div>
        </div>
      </main>

      {/* Mobile Main Content - Now matches web UI with responsive grid */}
      <main className="mobile-only px-4 py-6" style={{ marginTop: showMainSearchResults ? '0' : '20px' }}>
        {/* Mobile AI Agent Search Box */}
        <Card className="border-0 shadow-xl bg-gradient-to-r from-indigo-50 via-blue-50 to-purple-50 overflow-hidden mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-2 rounded-lg shadow-lg">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">AI Job Assistant</h3>
                <p className="text-xs text-gray-500">Ask about jobs, companies, or skills</p>
              </div>
            </div>
            <form onSubmit={handleAiSearch} className="flex gap-2 mb-3">
              <Input
                type="text"
                placeholder='Try "React jobs in Texas"...'
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                className="flex-1 bg-white border-gray-200 shadow-sm text-sm"
              />
              <Button
                type="submit"
                disabled={aiLoading || aiQuery.trim().length < 2}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 shadow-md"
                size="sm"
              >
                {aiLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </form>

            {aiLoading && (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg p-3 animate-pulse">
                    <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            )}

            {!aiLoading && aiSearched && aiSummary && (
              <div className="bg-white rounded-lg px-3 py-2 mb-2 border border-blue-100">
                <p className="text-xs text-blue-700 font-medium">{aiSummary}</p>
              </div>
            )}

            {!aiLoading && aiSearched && aiResults.length === 0 && (
              <div className="text-center py-4 bg-white rounded-lg">
                <p className="text-gray-500 text-xs">No results found. Try a different query.</p>
              </div>
            )}

            {!aiLoading && aiResults.length > 0 && (
              <div className="space-y-2">
                {aiResults.map((item: any, idx: number) => (
                  <Link
                    key={`ai-m-${idx}-${item.id}`}
                    href={item._type === 'vendor' ? `/companies/${item.client_company_id}` : item._type === 'company' ? `/companies/${item.id}` : `/jobs/${item.id}`}
                  >
                    <div className="bg-white rounded-lg p-3 hover:shadow-md transition-all duration-200 border border-gray-100 cursor-pointer flex items-center gap-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${item._type === 'vendor' ? 'bg-purple-100' : item._type === 'company' ? 'bg-green-100' : 'bg-blue-100'}`}>
                        {item._type === 'vendor' ? (
                          <Users className="h-4 w-4 text-purple-600" />
                        ) : item._type === 'company' ? (
                          <Building2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <Briefcase className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-semibold text-xs text-gray-900 truncate">
                            {item._type === 'vendor' ? item.name : item._type === 'company' ? item.name : item.title}
                          </h4>
                          <Badge variant="secondary" className={`text-[10px] flex-shrink-0 px-1.5 py-0 ${item._type === 'vendor' ? 'bg-purple-100 text-purple-700' : ''}`}>
                            {item._type === 'vendor' ? 'Vendor' : item._type === 'company' ? 'Company' : 'Job'}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-gray-500 truncate mt-0.5">
                          {item._type === 'vendor'
                            ? `Vendor for ${item.client_company}${item.city ? ' · ' + [item.city, item.state].filter(Boolean).join(', ') : ''}`
                            : item._type === 'company'
                            ? [item.industry, item.location].filter(Boolean).join(' · ')
                            : [item.company?.name, formatJobLocation(item)].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mobile Hero Stats - Matching desktop style */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl p-6 mb-6 shadow-xl">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <div className="text-3xl font-bold mb-1">{jobStats.totalJobs}</div>
              <div className="text-sm opacity-90">Active Jobs</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-1">{jobStats.activeCompanies}</div>
              <div className="text-sm opacity-90">Companies</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
              <CheckCircle className="h-5 w-5 mx-auto mb-1" />
              <span className="text-xs font-medium">100% Client Jobs</span>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
              <Bot className="h-5 w-5 mx-auto mb-1" />
              <span className="text-xs font-medium">AI Matching</span>
            </div>
          </div>
        </div>

        {/* Job Grid - Matching desktop layout with responsive columns */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-xl font-bold mb-4 text-gray-900">Latest Job Opportunities</h2>
          
          {jobsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-3"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentJobs.map((job: any, index: number) => (
                  <>
                    <Card 
                      key={job.id} 
                      className="hover:shadow-lg transition-all duration-300 cursor-pointer border-gray-200"
                      onClick={() => navigate(`/jobs/${job.id}`)}
                    >
                      <CardContent className="p-4">
                        {/* Company Logo and Name with Vendors Badge */}
                        <div className="flex items-start space-x-3 mb-2">
                          <LogoImage company={job.company} className="w-12 h-12" />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-xs text-gray-800">
                              {job.company?.name || 'Company Name'}
                            </h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <div className="text-xs text-gray-500">
                                {formatJobLocation(job) || 'Location not specified'}
                              </div>
                              {(job.company?.vendorCount || 0) > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 whitespace-nowrap">
                                  {job.company?.vendorCount} vendors
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Job Title */}
                        <h4 className="font-semibold text-sm text-gray-900 line-clamp-2 mb-2 mt-2">
                          {job.title}
                        </h4>
                        
                        {/* Job Stats Footer */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center">
                              <Users className="h-3 w-3 mr-1" />
                              {job.applicationCount || job.categoryMatchedApplicants || 0} applicants
                            </span>
                            <span className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {job.updatedAt ? new Date(job.updatedAt).toLocaleDateString() : (job.createdAt ? new Date(job.createdAt).toLocaleDateString() : new Date().toLocaleDateString())}
                            </span>
                          </div>
                          <Button 
                            size="sm" 
                            className="text-xs px-3 py-1 h-7 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApplyNow(job.id);
                            }}
                          >
                            Apply Now
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Mobile ad placement after every 2 jobs */}
                    {(index + 1) % 2 === 0 && (
                      <div className="col-span-full w-full my-4">
                        {user ? (
                          <GoogleAdsense adSlot="3731759815" />
                        ) : (
                          <GoogleAdManager slotType="responsive_in_feed" className="w-full" />
                        )}
                      </div>
                    )}
                  </>
                ))}
              </div>

              {/* Ad placement before mobile pagination */}
              <div className="w-full my-6">
                {user ? (
                  <GoogleAdsense adSlot="3731759815" />
                ) : (
                  <GoogleAdManager slotType="responsive_in_feed" className="w-full" />
                )}
              </div>
            </>
          )}
          
          {/* Mobile pagination - matching desktop style */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-6 gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleJobPageChange(currentJobPage - 1)}
                disabled={currentJobPage === 1}
                className="px-3"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              {[...Array(totalPages)].map((_, i) => i + 1).slice(
                Math.max(0, currentJobPage - 2),
                Math.min(totalPages, currentJobPage + 1)
              ).map((page) => (
                <Button
                  key={page}
                  variant={currentJobPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleJobPageChange(page)}
                  className={currentJobPage === page 
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white" 
                    : ""
                  }
                >
                  {page}
                </Button>
              ))}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleJobPageChange(currentJobPage + 1)}
                disabled={currentJobPage === totalPages}
                className="px-3"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Ad placement before footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-hidden">
        {user ? (
          <GoogleAdsense adSlot="3731759815" />
        ) : (
          <GoogleAdManager slotType="responsive_in_feed" className="w-full" />
        )}
      </div>

      {/* Footer */}
      <Footer 
        categories={categories}
        selectedCategory={selectedCategory}
        jobStats={jobStats}
        topCompanies={topCompanies}
      />

      {/* Back to Top Button */}
      <BackToTopButton />
      </div>
    </>
  );
}