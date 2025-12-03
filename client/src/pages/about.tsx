import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Menu, X, Briefcase, Users, Zap, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
const logo = 'https://cdn.pingjob.com/logo.png';
import { useAuth } from "@/hooks/use-auth";
import { setMetaTags } from "@/lib/meta-tags";
import SimpleFooter from "@/components/simple-footer";
import BackToTopButton from "@/components/back-to-top-button";

export default function About() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMetaTags({
      title: 'About PingJob | Direct Job Board & Professional Networking',
      description: 'Learn about PingJob - the direct job board connecting job seekers with verified employers. No recruiters, no middlemen. Transparent job search made simple.',
      keywords: 'about PingJob, job board, employment platform, professional networking, direct hiring',
      ogTitle: 'About PingJob',
      ogDescription: 'Discover how PingJob connects job seekers directly with employers',
      canonicalUrl: 'https://www.pingjob.com/about'
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Only show for non-logged-in users, logged-in users use Navigation component */}
      {!user && (
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Link href="/">
                  <img src={logo} alt="PingJob" className="h-8 w-auto mr-4 cursor-pointer" />
                </Link>
                <nav className="hidden md:flex space-x-8">
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
              <div className="hidden md:flex items-center">
                <Link href="/auth">
                  <Button className="ml-4">
                    Sign In
                  </Button>
                </Link>
              </div>

              {/* Mobile Hamburger Button */}
              <button
                data-testid="button-mobile-menu"
                className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>

            {/* Mobile Navigation Menu */}
            {mobileMenuOpen && (
              <nav className="md:hidden py-4 border-t">
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-12">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">About PingJob</h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              PingJob is a modern job board platform that revolutionizes how job seekers and employers connect. We eliminate the middlemen and create direct, transparent relationships between candidates and verified employers.
            </p>
          </div>

          {/* Mission Section */}
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              We believe job searching should be straightforward, transparent, and fair for everyone. Traditional job boards are cluttered with middlemen, recruiters, and outdated processes that waste your time. At PingJob, our mission is to simplify the hiring process by connecting job seekers directly with verified employers who are actively hiring.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              We're committed to creating a platform where talent meets opportunity with complete transparency, honest job listings, and a streamlined application process.
            </p>
          </div>

          {/* What Makes Us Different */}
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">What Makes Us Different</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="flex gap-4">
                <Zap className="h-8 w-8 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Direct Connections</h3>
                  <p className="text-gray-700">No recruiters, no agencies, no middlemen. Connect directly with hiring managers and employers who are actively recruiting.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Lock className="h-8 w-8 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Verified Employers</h3>
                  <p className="text-gray-700">All employers on our platform are verified. We ensure job listings are authentic and from legitimate companies.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Briefcase className="h-8 w-8 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Real Opportunities</h3>
                  <p className="text-gray-700">Every job posting is real and current. We prioritize quality over quantity to ensure you're seeing genuine opportunities.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Users className="h-8 w-8 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Professional Networking</h3>
                  <p className="text-gray-700">Build meaningful professional connections, expand your network, and discover opportunities through peer recommendations.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Platform Features</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">For Job Seekers</h3>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-3 font-bold">•</span>
                    <span>Browse curated job listings from verified companies</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-3 font-bold">•</span>
                    <span>Build and showcase your professional profile</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-3 font-bold">•</span>
                    <span>Upload and manage your resume and work samples</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-3 font-bold">•</span>
                    <span>Track your job applications in real-time</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-3 font-bold">•</span>
                    <span>Connect with other professionals and build your network</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-3 font-bold">•</span>
                    <span>Get job recommendations tailored to your skills</span>
                  </li>
                </ul>
              </div>
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">For Employers</h3>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-3 font-bold">•</span>
                    <span>Post unlimited job openings and reach qualified candidates</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-3 font-bold">•</span>
                    <span>Access advanced candidate search and filtering tools</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-3 font-bold">•</span>
                    <span>Review detailed candidate profiles and resumes</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-3 font-bold">•</span>
                    <span>Manage applications and communicate with candidates</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-3 font-bold">•</span>
                    <span>Build and showcase your company brand and culture</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-3 font-bold">•</span>
                    <span>Track hiring metrics and analytics</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Core Values */}
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Core Values</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Transparency</h3>
                <p className="text-gray-700">We believe in open, honest communication. All job listings are verified, and we're upfront about how our platform works.</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Integrity</h3>
                <p className="text-gray-700">We maintain the highest standards of ethical conduct. Every employer is verified, and every listing is genuine.</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Community</h3>
                <p className="text-gray-700">We foster a supportive community where professionals help each other grow and succeed in their careers.</p>
              </div>
            </div>
          </div>

          {/* Why Choose PingJob */}
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Why Choose PingJob?</h2>
            <div className="space-y-4">
              <p className="text-lg text-gray-700">
                <strong>Save Time:</strong> Skip the recruiters and go straight to decision-makers. Apply directly to positions with faster response times from actual hiring teams.
              </p>
              <p className="text-lg text-gray-700">
                <strong>Authentic Opportunities:</strong> Every job listing is from a verified employer and actively hiring. No ghost postings or outdated positions.
              </p>
              <p className="text-lg text-gray-700">
                <strong>Professional Growth:</strong> Build your professional network, discover career insights, and connect with industry peers who can support your growth.
              </p>
              <p className="text-lg text-gray-700">
                <strong>Better Fit:</strong> Our smart matching algorithm helps you find roles that align with your skills, experience, and career goals.
              </p>
              <p className="text-lg text-gray-700">
                <strong>Complete Control:</strong> Manage your profile, applications, and career journey entirely on your terms. You own your data and your professional identity.
              </p>
            </div>
          </div>

          {/* Call to Action */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-8 text-white text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Job Search?</h2>
            <p className="text-lg mb-6 opacity-90">Join thousands of professionals and employers using PingJob to find their perfect match.</p>
            <Link href="/auth">
              <Button size="lg" variant="secondary" className="text-blue-600 font-semibold hover:bg-gray-100">
                Get Started Now
              </Button>
            </Link>
          </div>

          {/* Contact Section */}
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Have Questions?</h2>
            <p className="text-gray-700 mb-4">
              We'd love to hear from you. Whether you have feedback, questions, or just want to say hello, feel free to reach out.
            </p>
            <p className="text-gray-700">
              Email: <a href="mailto:support@pingjob.com" className="text-blue-600 hover:underline">support@pingjob.com</a>
            </p>
          </div>
        </div>
      </main>

      {/* Footer - Only show for non-logged-in users */}
      {!user && <SimpleFooter />}

      {/* Back to Top Button */}
      <BackToTopButton />
    </div>
  );
}
