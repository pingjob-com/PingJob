import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Menu, X, AlertCircle, Book, Users, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
const logo = 'https://cdn.pingjob.com/logo.png';
import { useAuth } from "@/hooks/use-auth";
import { setMetaTags } from "@/lib/meta-tags";
import SimpleFooter from "@/components/simple-footer";

export default function Terms() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMetaTags({
      title: 'Terms of Service | PingJob - User Agreement',
      description: 'PingJob Terms of Service. Read our comprehensive terms and conditions for using our job board and professional networking platform.',
      keywords: 'terms, terms of service, conditions, user agreement, legal',
      ogTitle: 'Terms of Service',
      ogDescription: 'PingJob Terms of Service and User Agreement',
      canonicalUrl: 'https://www.pingjob.com/terms'
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
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700">
                <strong>Last Updated:</strong> November 2025 | Please read these terms carefully before using PingJob.
              </p>
            </div>
          </div>

          {/* Agreement to Terms */}
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Agreement to Terms</h2>
            <p className="text-gray-700 leading-relaxed">
              By accessing and using PingJob (the "Platform"), you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any part of these terms, you may not use the Platform. These terms constitute a binding legal agreement between you and PingJob ("Company," "we," "us," or "our").
            </p>
          </div>

          {/* User Eligibility */}
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">User Eligibility</h2>
            <p className="text-gray-700 mb-4">To use PingJob, you must:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Be at least 18 years old</li>
              <li>Have the legal authority to enter into this agreement</li>
              <li>Not be prohibited from accessing the Platform under applicable laws</li>
              <li>Provide accurate and truthful information</li>
              <li>Not use the Platform for illegal purposes</li>
              <li>Not violate any third-party rights</li>
            </ul>
          </div>

          {/* Account Responsibility */}
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <div className="flex gap-4 mb-6">
              <Users className="h-8 w-8 text-blue-600 flex-shrink-0" />
              <h2 className="text-2xl font-semibold text-gray-900">Account Responsibility</h2>
            </div>
            <div className="space-y-4 text-gray-700">
              <p>
                You are responsible for maintaining the confidentiality of your account login information and password. You agree to:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Keep your password secure and change it regularly</li>
                <li>Not share your account with others</li>
                <li>Immediately notify us of unauthorized access</li>
                <li>Accept responsibility for all activities under your account</li>
              </ul>
              <p className="mt-4">
                PingJob is not responsible for any loss or damage resulting from unauthorized access to your account.
              </p>
            </div>
          </div>

          {/* Acceptable Use */}
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Acceptable Use Policy</h2>
            <p className="text-gray-700 mb-4">You agree not to use the Platform to:</p>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Prohibited Content</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li>Post false or misleading information</li>
                  <li>Impersonate others or steal identity</li>
                  <li>Upload malware or harmful content</li>
                  <li>Share confidential information</li>
                  <li>Post discriminatory or harassing content</li>
                  <li>Spam or send unsolicited messages</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Prohibited Activities</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li>Unauthorized access or hacking</li>
                  <li>Scraping or automated data collection</li>
                  <li>Interfere with platform operations</li>
                  <li>Circumvent security measures</li>
                  <li>Create duplicate accounts</li>
                  <li>Commercial use without permission</li>
                </ul>
              </div>
            </div>
          </div>

          {/* User Content */}
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <div className="flex gap-4 mb-6">
              <Book className="h-8 w-8 text-blue-600 flex-shrink-0" />
              <h2 className="text-2xl font-semibold text-gray-900">User Content and Intellectual Property</h2>
            </div>
            <div className="space-y-4 text-gray-700">
              <p>
                <strong>Your Content:</strong> You retain all rights to content you upload (resume, portfolio, profile information). By uploading content, you grant PingJob a non-exclusive, royalty-free license to use it for platform operations and user matching.
              </p>
              <p>
                <strong>Our Content:</strong> All content created by PingJob (platform design, features, documentation) is protected by copyright. You may not reproduce, modify, or distribute our content without permission.
              </p>
              <p>
                <strong>Third-Party Content:</strong> The Platform includes content from third parties (employers, job listings). We are not responsible for third-party content and do not endorse it.
              </p>
            </div>
          </div>

          {/* Job Listings and Applications */}
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Job Listings and Applications</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                <strong>Accuracy:</strong> While we verify employers, we do not guarantee the accuracy of job postings. Employers are responsible for job listing content. Always verify job details before applying.
              </p>
              <p>
                <strong>No Obligation:</strong> Job postings do not guarantee employment or interviews. Employers may modify, remove, or reject applications at their discretion.
              </p>
              <p>
                <strong>Your Responsibility:</strong> You are responsible for providing accurate information in job applications. Submitting false information may result in account termination and legal action.
              </p>
              <p>
                <strong>No Employment Relationship:</strong> Using PingJob does not create an employment relationship with the Company or employers on the platform.
              </p>
            </div>
          </div>

          {/* Fees and Payment */}
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <div className="flex gap-4 mb-6">
              <CreditCard className="h-8 w-8 text-blue-600 flex-shrink-0" />
              <h2 className="text-2xl font-semibold text-gray-900">Fees and Payment</h2>
            </div>
            <div className="space-y-4 text-gray-700">
              <p>
                <strong>Paid Features:</strong> Some platform features require payment. You agree to pay all fees according to the terms displayed at checkout.
              </p>
              <p>
                <strong>Billing:</strong> You authorize us to charge your payment method for subscriptions and purchases. You are responsible for maintaining accurate billing information.
              </p>
              <p>
                <strong>Refunds:</strong> Subscription charges are non-refundable. We may offer refunds at our discretion for service failures.
              </p>
              <p>
                <strong>Taxes:</strong> You are responsible for all applicable taxes. We will collect and remit taxes where required by law.
              </p>
            </div>
          </div>

          {/* Disclaimer of Warranties */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-8">
            <div className="flex gap-4 mb-4">
              <AlertCircle className="h-8 w-8 text-orange-600 flex-shrink-0" />
              <h2 className="text-2xl font-semibold text-gray-900">Disclaimer of Warranties</h2>
            </div>
            <div className="space-y-4 text-gray-700">
              <p>
                THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DISCLAIM ALL WARRANTIES INCLUDING:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Merchantability and fitness for a particular purpose</li>
                <li>Non-infringement of third-party rights</li>
                <li>Accuracy, reliability, or completeness of content</li>
                <li>Uninterrupted or error-free operation</li>
              </ul>
              <p className="mt-4">
                We do not guarantee employment opportunities, job matches, or hiring outcomes. Success depends on your qualifications, job market conditions, and employer decisions.
              </p>
            </div>
          </div>

          {/* Limitation of Liability */}
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Limitation of Liability</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, PINGJOB AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>Indirect, incidental, special, or consequential damages</li>
                <li>Loss of profits, revenue, data, or goodwill</li>
                <li>Third-party actions or employer decisions</li>
                <li>Any damages exceeding the fees paid in the past 12 months</li>
              </ul>
              <p className="mt-4">
                Some jurisdictions do not allow liability limitations, so this may not apply to you. In such cases, our liability is limited to the maximum amount permitted by law.
              </p>
            </div>
          </div>

          {/* Indemnification */}
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Indemnification</h2>
            <p className="text-gray-700">
              You agree to defend, indemnify, and hold harmless PingJob and its officers, directors, employees, and agents from any claims, damages, losses, or expenses (including legal fees) arising from:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 mt-3">
              <li>Your use of the Platform</li>
              <li>Violation of these terms</li>
              <li>Violation of applicable laws</li>
              <li>Infringement of third-party rights</li>
              <li>User content you submit</li>
            </ul>
          </div>

          {/* Termination */}
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Termination</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                <strong>Your Rights:</strong> You may terminate your account at any time by contacting customer support. Your data will be deleted within 30 days unless required by law.
              </p>
              <p>
                <strong>Our Rights:</strong> We may suspend or terminate your account if you violate these terms, engage in harmful conduct, or for any reason with 30 days notice (or immediately for serious violations).
              </p>
              <p>
                <strong>Consequences:</strong> Termination does not relieve you of payment obligations or liability for past violations.
              </p>
            </div>
          </div>

          {/* Modifications to Terms */}
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Modifications to These Terms</h2>
            <p className="text-gray-700">
              We may modify these terms at any time. Significant changes will be communicated via email or platform notice. Your continued use of PingJob after changes constitutes acceptance of the modified terms. We recommend reviewing this page periodically for updates.
            </p>
          </div>

          {/* Governing Law */}
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Governing Law and Jurisdiction</h2>
            <p className="text-gray-700 mb-4">
              These terms are governed by and construed in accordance with the laws of the United States, without regard to its conflict of law principles. You agree to submit to the exclusive jurisdiction of the courts located within the United States for resolution of any disputes.
            </p>
          </div>

          {/* Dispute Resolution */}
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Dispute Resolution</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                <strong>Informal Resolution:</strong> Before pursuing legal action, you agree to contact us to attempt informal resolution of disputes.
              </p>
              <p>
                <strong>Binding Arbitration:</strong> Any legal action or proceeding shall be resolved through binding arbitration, not court litigation, except for claims involving intellectual property or account security.
              </p>
              <p>
                <strong>Class Waiver:</strong> You agree not to participate in class action lawsuits against PingJob.
              </p>
            </div>
          </div>

          {/* Contact and Support */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Questions or Concerns?</h2>
            <p className="text-gray-700 mb-4">
              If you have questions about these terms or need support, please contact us:
            </p>
            <div className="bg-white rounded p-4 space-y-2">
              <p className="text-gray-700">
                <strong>Email:</strong> <a href="mailto:support@pingjob.com" className="text-blue-600 hover:underline">support@pingjob.com</a>
              </p>
              <p className="text-gray-700">
                <strong>Legal:</strong> <a href="mailto:legal@pingjob.com" className="text-blue-600 hover:underline">legal@pingjob.com</a>
              </p>
            </div>
          </div>

          {/* Entire Agreement */}
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Entire Agreement</h2>
            <p className="text-gray-700">
              These Terms of Service, along with our Privacy Policy, constitute the entire agreement between you and PingJob regarding your use of the Platform. These terms supersede all prior agreements and understandings. If any provision is found invalid, the remaining provisions shall remain in effect.
            </p>
          </div>
        </div>
      </main>

      {/* Footer - Only show for non-logged-in users */}
      {!user && <SimpleFooter />}
    </div>
  );
}
