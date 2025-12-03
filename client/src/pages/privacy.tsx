import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Menu, X, Shield, Lock, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
const logo = 'https://cdn.pingjob.com/logo.png';
import { useAuth } from "@/hooks/use-auth";
import { setMetaTags } from "@/lib/meta-tags";
import SimpleFooter from "@/components/simple-footer";

export default function Privacy() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMetaTags({
      title: 'Privacy Policy | PingJob - Data Protection & Security',
      description: 'PingJob privacy policy. Learn how we collect, use, secure, and protect your personal information. Your privacy matters to us.',
      keywords: 'privacy, privacy policy, data protection, user data, GDPR, security',
      ogTitle: 'Privacy Policy',
      ogDescription: 'How PingJob protects your privacy and personal data',
      canonicalUrl: 'https://www.pingjob.com/privacy'
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
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-700">
                <strong>Last Updated:</strong> November 2025 | This policy explains how PingJob collects, uses, and protects your personal information.
              </p>
            </div>
          </div>

          {/* Introduction */}
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <div className="flex gap-4 mb-6">
              <Shield className="h-8 w-8 text-blue-600 flex-shrink-0" />
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">Your Privacy Matters</h2>
                <p className="text-gray-700 leading-relaxed">
                  At PingJob, we take your privacy seriously. We collect only the minimal personal information necessary to provide our services, and we're committed to protecting your data with industry-leading security practices. This Privacy Policy explains what information we collect, how we use it, and your rights regarding your data.
                </p>
              </div>
            </div>
          </div>

          {/* Information We Collect */}
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <div className="flex gap-4 mb-6">
              <Eye className="h-8 w-8 text-blue-600 flex-shrink-0" />
              <h2 className="text-2xl font-semibold text-gray-900">Information We Collect</h2>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Account Information</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li>Full name, email address, and password</li>
                  <li>Phone number (optional)</li>
                  <li>Professional title and current company</li>
                  <li>Location and work preferences</li>
                  <li>Date of account creation</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Professional Information</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li>Resume and work samples you choose to upload</li>
                  <li>Education history and certifications</li>
                  <li>Work experience and skills</li>
                  <li>Portfolio links and professional profiles</li>
                  <li>Job preferences, salary expectations, and availability</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Activity and Usage Data</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li>Job search history and saved jobs</li>
                  <li>Job applications and application status</li>
                  <li>Profile views and engagement metrics</li>
                  <li>Messages and communications on the platform</li>
                  <li>Pages visited and features used</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Technical Information</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                  <li>IP address and device information</li>
                  <li>Browser type and version</li>
                  <li>Operating system</li>
                  <li>Referring URL and pages visited</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>
              </div>
            </div>
          </div>

          {/* How We Use Information */}
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">How We Use Your Information</h2>
            <div className="space-y-4">
              <div className="border-l-4 border-blue-600 pl-4">
                <h3 className="font-semibold text-gray-900 mb-2">To Provide Our Services</h3>
                <p className="text-gray-700">Create and maintain your account, process job applications, facilitate employer-candidate matching, and provide customer support.</p>
              </div>
              <div className="border-l-4 border-blue-600 pl-4">
                <h3 className="font-semibold text-gray-900 mb-2">To Improve Our Platform</h3>
                <p className="text-gray-700">Analyze usage patterns, troubleshoot technical issues, develop new features, and optimize user experience based on your feedback.</p>
              </div>
              <div className="border-l-4 border-blue-600 pl-4">
                <h3 className="font-semibold text-gray-900 mb-2">To Communicate With You</h3>
                <p className="text-gray-700">Send service notifications, respond to inquiries, provide job recommendations, and send marketing communications (with your consent).</p>
              </div>
              <div className="border-l-4 border-blue-600 pl-4">
                <h3 className="font-semibold text-gray-900 mb-2">For Employer Matching</h3>
                <p className="text-gray-700">Share your profile information with employers when you apply for positions or express interest in opportunities.</p>
              </div>
              <div className="border-l-4 border-blue-600 pl-4">
                <h3 className="font-semibold text-gray-900 mb-2">For Legal Compliance</h3>
                <p className="text-gray-700">Comply with legal obligations, enforce our terms, protect user rights and safety, and respond to legal requests.</p>
              </div>
            </div>
          </div>

          {/* Data Sharing */}
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Data Sharing and Disclosure</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                <strong>We Do NOT Sell Your Data:</strong> We never sell your personal information to third parties for marketing purposes.
              </p>
              <p>
                <strong>Employer Access:</strong> When you apply for a job or express interest in a position, we share your profile and resume with that employer.
              </p>
              <p>
                <strong>Service Providers:</strong> We share information with trusted service providers who help us operate the platform (payment processors, email providers, analytics services) under strict confidentiality agreements.
              </p>
              <p>
                <strong>Legal Requirements:</strong> We may disclose information when required by law, court order, or to protect our legal rights or user safety.
              </p>
              <p>
                <strong>Business Transfers:</strong> In case of merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.
              </p>
            </div>
          </div>

          {/* Security */}
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <div className="flex gap-4 mb-6">
              <Lock className="h-8 w-8 text-blue-600 flex-shrink-0" />
              <h2 className="text-2xl font-semibold text-gray-900">Security & Data Protection</h2>
            </div>
            <div className="space-y-4 text-gray-700">
              <p>
                We implement industry-standard security measures to protect your personal information from unauthorized access, disclosure, and misuse:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>SSL/TLS encryption for data transmission</li>
                <li>Secure password hashing and storage</li>
                <li>Regular security audits and vulnerability assessments</li>
                <li>Access controls and multi-factor authentication options</li>
                <li>Data backup and disaster recovery procedures</li>
                <li>Employee training on data privacy and security</li>
              </ul>
              <p className="mt-4 text-sm bg-orange-50 border border-orange-200 rounded p-4">
                <strong>Note:</strong> While we implement strong security measures, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security of your information.
              </p>
            </div>
          </div>

          {/* Cookies */}
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Cookies and Tracking</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                We use cookies and similar technologies to enhance your experience, remember your preferences, and understand how you use our platform. These include:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li><strong>Session Cookies:</strong> Maintain your login and session information</li>
                <li><strong>Preference Cookies:</strong> Remember your language and display settings</li>
                <li><strong>Analytics Cookies:</strong> Track usage patterns to improve our platform</li>
                <li><strong>Marketing Cookies:</strong> Used to deliver targeted ads (with your consent)</li>
              </ul>
              <p className="mt-4">
                You can control cookie preferences through your browser settings. Disabling cookies may affect some platform functionality.
              </p>
            </div>
          </div>

          {/* User Rights */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Your Privacy Rights</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Right to Access</h3>
                <p className="text-gray-700">You can request a copy of the personal information we hold about you.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Right to Correction</h3>
                <p className="text-gray-700">You can update, correct, or modify your personal information at any time through your account settings.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Right to Deletion</h3>
                <p className="text-gray-700">You can request deletion of your account and associated personal data. We'll delete your information within 30 days unless legally required to retain it.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Right to Opt-Out</h3>
                <p className="text-gray-700">You can opt out of marketing communications and non-essential data processing at any time.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Right to Data Portability</h3>
                <p className="text-gray-700">You can request your data in a machine-readable format to transfer to another service.</p>
              </div>
            </div>
          </div>

          {/* Children's Privacy */}
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Children's Privacy</h2>
            <p className="text-gray-700">
              PingJob is not intended for users under 18 years of age. We do not knowingly collect personal information from minors. If we become aware that we've collected information from someone under 18, we will delete that information and the account. If you believe we've collected information from a minor, please contact us immediately.
            </p>
          </div>

          {/* International Data Transfer */}
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">International Data Transfer</h2>
            <p className="text-gray-700">
              Your information may be stored and processed in countries other than your country of residence. These countries may have different data protection laws. By using PingJob, you consent to the transfer of your information to countries outside your country of residence, including the United States, which may not have equivalent privacy protections.
            </p>
          </div>

          {/* Retention */}
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Retention</h2>
            <p className="text-gray-700 mb-4">
              We retain your personal information for as long as necessary to provide our services and comply with legal obligations:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Account information: Retained while your account is active, then deleted within 30 days of deletion request</li>
              <li>Application records: Retained for 2 years to comply with employment law</li>
              <li>Communications: Retained for 1 year or as long as necessary to resolve disputes</li>
              <li>Analytics data: Aggregated and anonymized after 1 year</li>
            </ul>
          </div>

          {/* Contact */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Questions About This Policy?</h2>
            <p className="text-gray-700 mb-4">
              If you have questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us:
            </p>
            <div className="bg-white rounded p-4">
              <p className="text-gray-700">
                <strong>Email:</strong> <a href="mailto:privacy@pingjob.com" className="text-blue-600 hover:underline">privacy@pingjob.com</a>
              </p>
              <p className="text-gray-700 mt-2">
                <strong>Support:</strong> <a href="mailto:support@pingjob.com" className="text-blue-600 hover:underline">support@pingjob.com</a>
              </p>
            </div>
          </div>

          {/* Policy Updates */}
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Changes to This Policy</h2>
            <p className="text-gray-700">
              We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors. We will notify you of significant changes by updating the "Last Updated" date and, if necessary, by email. Your continued use of PingJob following the posting of revised Privacy Policy means you accept and agree to the changes.
            </p>
          </div>
        </div>
      </main>

      {/* Footer - Only show for non-logged-in users */}
      {!user && <SimpleFooter />}
    </div>
  );
}
