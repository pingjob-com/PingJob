import { Link } from "wouter";
const logo = 'https://cdn.pingjob.com/logo.webp';
import { Facebook, Instagram, Twitter, Target, TrendingUp, Building2, Smartphone, Download } from "lucide-react";
import { JobCategories } from "@/components/job-categories";
import { resolveLogoUrl } from "@/lib/apiConfig";

// Logo component for companies
function LogoImage({ company, className = "w-10 h-10" }: { company: any; className?: string }) {
  const logoUrl = (company.logoUrl || company.logo_url) ? resolveLogoUrl(company.logoUrl || company.logo_url) : null;
  
  if (!logoUrl) {
    return (
      <div className={`${className} bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center`}>
        <span className="text-white font-bold text-sm">
          {company.name?.charAt(0) || '?'}
        </span>
      </div>
    );
  }
  
  return (
    <img
      src={logoUrl}
      alt={company.name}
      className={`${className} object-contain rounded-lg bg-white`}
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
        const fallback = document.createElement('div');
        fallback.className = `${className} bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center`;
        fallback.innerHTML = `<span class="text-white font-bold text-sm">${company.name?.charAt(0) || '?'}</span>`;
        target.parentNode?.insertBefore(fallback, target);
      }}
    />
  );
}

interface FooterProps {
  categories?: any[];
  selectedCategory?: string | null | undefined;
  jobStats?: {
    totalJobs: number;
    activeCompanies: number;
    totalCategories: number;
    todayJobs: number;
  };
  topCompanies?: any[];
}

export default function Footer({ categories = [], selectedCategory = null, jobStats, topCompanies = [] }: FooterProps) {
  return (
    <footer className="bg-gray-900 text-white mt-auto">
      {/* Mobile App Download Section */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-white/30">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start mb-4">
                  <Smartphone className="h-8 w-8 text-green-600 mr-3" />
                  <h2 className="text-2xl font-bold text-gray-900">Get the PingJob Mobile App</h2>
                </div>
                <p className="text-gray-600 text-lg mb-6">
                  Find your dream job on the go. Access thousands of opportunities, apply instantly, and stay connected with employers - all from your mobile device.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                  <a 
                    href="https://play.google.com/store/apps/details?id=com.pingjob" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors duration-300 shadow-lg hover:shadow-xl"
                    data-testid="download-android-app"
                  >
                    <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                    </svg>
                    <div className="text-left">
                      <div className="text-xs font-medium">GET IT ON</div>
                      <div className="text-sm font-bold">Google Play</div>
                    </div>
                  </a>
                  
                  <div className="flex items-center text-gray-500 text-sm">
                    <Download className="h-4 w-4 mr-2" />
                    <span>Available for Android devices</span>
                  </div>
                </div>
              </div>
              
              <div className="flex-shrink-0">
                <div className="w-32 h-32 bg-gradient-to-br from-green-100 to-blue-100 rounded-2xl flex items-center justify-center shadow-lg">
                  <Smartphone className="h-16 w-16 text-green-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {/* Job Categories */}
          {categories.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                <Target className="h-5 w-5 mr-2 text-blue-400" />
                Job Categories
              </h3>
              <div className="bg-gray-800 rounded-lg p-4 space-y-2">
                {categories.slice(0, 10).map((category: any) => (
                  <Link
                    key={category.id}
                    href={`/jobs?categoryId=${category.id}`}
                    className="block group"
                  >
                    <div className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                      selectedCategory === category.id.toString()
                        ? 'bg-blue-900 text-blue-200'
                        : 'hover:bg-gray-700 text-gray-300'
                    }`}>
                      <span className="text-sm font-medium">{category.name}</span>
                      <span className="text-xs text-gray-400">{category.jobCount || 0} jobs</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Platform Stats */}
          {jobStats && (
            <div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-blue-400" />
                Platform Stats
              </h3>
              <div className="bg-gradient-to-br from-blue-900 to-purple-900 rounded-lg p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-300">Total Jobs</span>
                    <span className="font-bold text-blue-400">{jobStats.totalJobs}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-300">Active Companies</span>
                    <span className="font-bold text-green-400">{jobStats.activeCompanies.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-300">Categories</span>
                    <span className="font-bold text-purple-400">{jobStats.totalCategories}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-300">Today's Jobs</span>
                    <span className="font-bold text-orange-400">{jobStats.todayJobs}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Top Companies */}
          {topCompanies.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                <Building2 className="h-5 w-5 mr-2 text-green-400" />
                Top Companies
              </h3>
              <div className="bg-gray-800 rounded-lg p-4 space-y-2">
                {topCompanies.slice(0, 8).map((company: any, index: number) => (
                  <Link 
                    key={company.id} 
                    href={`/companies/${company.id}`}
                    className="block group"
                  >
                    <div className="flex items-start p-2 rounded-lg hover:bg-gray-700 transition-colors duration-300">
                      <div className="flex items-center mr-3">
                        <span className="text-sm font-bold text-blue-400 mr-2">#{index + 1}</span>
                        <LogoImage company={company} className="w-10 h-10 flex-shrink-0" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-200 group-hover:text-blue-400 transition-colors duration-300 break-words">
                          {company.name}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-400">{company.job_count || 0} jobs</span>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-gray-400">{company.vendor_count || 0} vendors</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Original Footer Layout */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mt-12 pt-12 border-t border-gray-800">
          {/* Logo and Description */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/">
              <img 
                src={logo} 
                alt="PingJob" 
                className="h-8 w-auto mb-4 cursor-pointer filter brightness-0 invert"
              />
            </Link>
            <p className="text-gray-400 text-sm max-w-md">
              Connecting job seekers directly with employers. No recruiters, no middlemen. 
              Find authentic job opportunities with transparent application processes.
            </p>
            
            {/* Social Media Links */}
            <div className="flex space-x-4 mt-6">
              <a
                href="https://facebook.com/pingjob"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Follow us on Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://instagram.com/pingjobsearch"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Follow us on Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://twitter.com/pingjob"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Follow us on Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>
          
          {/* Company Links */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Company
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/about" className="text-gray-400 hover:text-white text-sm transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/jobs" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Browse Jobs
                </Link>
              </li>
              <li>
                <Link href="/companies" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Companies
                </Link>
              </li>
              <li>
                <Link href="/companies/create" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Add New Client
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Legal Links */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Legal
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-400 hover:text-white text-sm transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2025 PingJob. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/about" className="text-gray-400 hover:text-white text-sm">About</Link>
              <Link href="/privacy" className="text-gray-400 hover:text-white text-sm">Privacy</Link>
              <Link href="/terms" className="text-gray-400 hover:text-white text-sm">Terms</Link>
              <Link href="/contact" className="text-gray-400 hover:text-white text-sm">Contact</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
