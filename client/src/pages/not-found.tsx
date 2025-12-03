import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Menu, X, Home, Briefcase, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { setMetaTags } from "@/lib/meta-tags";
const logo = 'https://cdn.pingjob.com/logo.png';

export default function NotFound() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMetaTags({
      title: '404 - Page Not Found | PingJob',
      description: 'The page you are looking for does not exist. Explore job opportunities or return to home.',
      keywords: '404, page not found, error',
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col">
      {/* Dynamic Header - Only show for non-logged-in users */}
      {!user && (
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
          <div className="w-full px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14 sm:h-16">
              <div className="flex items-center">
                <Link href="/">
                  <img 
                    src={logo} 
                    alt="PingJob" 
                    className="h-6 sm:h-8 w-auto cursor-pointer hover:opacity-90 transition-opacity" 
                  />
                </Link>
                <nav className="hidden md:flex space-x-6 lg:space-x-8 ml-6 lg:ml-8">
                  <Link 
                    href="/" 
                    className="text-gray-700 hover:text-linkedin-blue px-2 py-2 text-sm font-medium transition-colors"
                  >
                    Home
                  </Link>
                  <Link 
                    href="/jobs" 
                    className="text-gray-700 hover:text-linkedin-blue px-2 py-2 text-sm font-medium transition-colors"
                  >
                    Jobs
                  </Link>
                  <Link 
                    href="/companies" 
                    className="text-gray-700 hover:text-linkedin-blue px-2 py-2 text-sm font-medium transition-colors"
                  >
                    Companies
                  </Link>
                </nav>
              </div>
              
              {/* Desktop Actions */}
              <div className="hidden md:flex items-center gap-2 lg:gap-4">
                <Link href="/auth">
                  <Button variant="ghost" className="text-linkedin-blue hover:text-linkedin-blue text-sm px-3">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth">
                  <Button className="bg-linkedin-blue hover:bg-blue-700 text-sm px-4 py-2">
                    Get Started
                  </Button>
                </Link>
              </div>

              {/* Mobile Menu Button */}
              <button
                data-testid="button-mobile-menu-404"
                className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>

            {/* Mobile Navigation */}
            {mobileMenuOpen && (
              <nav className="md:hidden py-3 border-t border-gray-200 pb-4">
                <div className="flex flex-col space-y-2 pb-3">
                  <Link 
                    href="/" 
                    className="text-gray-700 hover:text-linkedin-blue px-3 py-2 text-sm font-medium rounded hover:bg-gray-50 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Home
                  </Link>
                  <Link 
                    href="/jobs" 
                    className="text-gray-700 hover:text-linkedin-blue px-3 py-2 text-sm font-medium rounded hover:bg-gray-50 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Jobs
                  </Link>
                  <Link 
                    href="/companies" 
                    className="text-gray-700 hover:text-linkedin-blue px-3 py-2 text-sm font-medium rounded hover:bg-gray-50 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Companies
                  </Link>
                </div>
                <div className="border-t border-gray-200 pt-3 flex flex-col gap-2">
                  <Link href="/auth" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start text-linkedin-blue text-sm px-3">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/auth" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full bg-linkedin-blue hover:bg-blue-700 text-sm">
                      Get Started
                    </Button>
                  </Link>
                </div>
              </nav>
            )}
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center px-4 py-8 sm:py-12 md:py-16 w-full">
        <div className="w-full max-w-md">
          {/* 404 Illustration */}
          <div className="mb-6 sm:mb-8 text-center">
            <div className="relative inline-flex items-center justify-center mb-4 sm:mb-6 w-full">
              <div className="absolute inset-0 bg-blue-100 rounded-full opacity-20 scale-150"></div>
              <div className="relative flex items-center justify-center">
                <span className="text-6xl sm:text-7xl md:text-8xl font-black text-linkedin-blue drop-shadow-sm">
                  404
                </span>
              </div>
            </div>
            
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2 sm:mb-3 px-2">
              Page Not Found
            </h1>
            
            <p className="text-gray-600 text-sm sm:text-base md:text-lg mb-6 sm:mb-8 px-2 leading-relaxed">
              Oops! The page you're looking for doesn't exist. It might have been moved or deleted.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 sm:space-y-3 px-2 sm:px-0">
            <Link href="/">
              <Button 
                className="w-full h-11 sm:h-12 bg-linkedin-blue hover:bg-blue-700 text-white text-sm sm:text-base font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 active:scale-95"
                data-testid="button-404-home"
              >
                <Home className="h-4 sm:h-5 w-4 sm:w-5" />
                <span>Back to Home</span>
              </Button>
            </Link>

            <Link href="/jobs">
              <Button 
                variant="outline"
                className="w-full h-11 sm:h-12 border-2 border-linkedin-blue text-linkedin-blue hover:bg-blue-50 text-sm sm:text-base font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 active:scale-95"
                data-testid="button-404-jobs"
              >
                <Briefcase className="h-4 sm:h-5 w-4 sm:w-5" />
                <span>Browse Jobs</span>
              </Button>
            </Link>

            <Link href="/companies">
              <Button 
                variant="outline"
                className="w-full h-11 sm:h-12 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 text-sm sm:text-base font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2 active:scale-95"
                data-testid="button-404-companies"
              >
                <Building2 className="h-4 sm:h-5 w-4 sm:w-5" />
                <span>Explore Companies</span>
              </Button>
            </Link>
          </div>

          {/* Additional Help */}
          <div className="mt-6 sm:mt-8 md:mt-10 p-4 sm:p-5 bg-blue-50 rounded-lg border border-blue-100 mx-2 sm:mx-0">
            <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <span className="text-lg">💡</span>
              <span>Having trouble?</span>
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              If you believe this is an error, please try:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 ml-6">
              <li>• Checking the URL in your browser</li>
              <li>• Clearing your browser cache</li>
              <li>• Returning to the home page and navigating again</li>
            </ul>
          </div>

          {/* Footer Links */}
          <div className="mt-6 sm:mt-8 md:mt-10 text-center px-2 sm:px-0">
            <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
              Need help? Contact our support team
            </p>
            <div className="flex flex-wrap justify-center gap-2 sm:gap-4 text-xs sm:text-sm">
              <Link 
                href="/"
                className="text-linkedin-blue hover:underline font-medium"
              >
                Home
              </Link>
              <span className="text-gray-300">•</span>
              <Link 
                href="/contact"
                className="text-linkedin-blue hover:underline font-medium"
              >
                Contact Us
              </Link>
              <span className="text-gray-300">•</span>
              <Link 
                href="/privacy"
                className="text-linkedin-blue hover:underline font-medium"
              >
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Background Decoration */}
      <div className="fixed top-0 right-0 -z-10 w-64 sm:w-96 h-64 sm:h-96 bg-blue-100 rounded-full opacity-10 blur-3xl"></div>
      <div className="fixed bottom-0 left-0 -z-10 w-64 sm:w-96 h-64 sm:h-96 bg-blue-100 rounded-full opacity-10 blur-3xl"></div>
    </div>
  );
}
