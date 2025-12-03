import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Mail, MapPin, Menu, X, Send, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
const logo = 'https://cdn.pingjob.com/logo.png';
import { useAuth } from "@/hooks/use-auth";
import { setMetaTags } from "@/lib/meta-tags";
import SimpleFooter from "@/components/simple-footer";
import { apiRequest } from "@/lib/queryClient";
import BackToTopButton from "@/components/back-to-top-button";

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export default function Contact() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');

  useEffect(() => {
    setMetaTags({
      title: 'Contact Us | PingJob Support',
      description: 'Get in touch with PingJob support team. Questions about job search, posting jobs, or our platform? Contact us via email or view our FAQs.',
      keywords: 'contact PingJob, customer support, help, job board support',
      ogTitle: 'Contact PingJob',
      ogDescription: 'Reach out to our support team',
      canonicalUrl: 'https://www.pingjob.com/contact'
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim()) {
      setSubmitStatus('error');
      setSubmitMessage('Please fill in all fields');
      return;
    }

    setSubmitStatus('loading');
    
    try {
      const res = await apiRequest('POST', '/api/contact', formData);
      const data = await res.json();
      
      if (res.ok && data.success) {
        setSubmitStatus('success');
        setFormData({ name: '', email: '', subject: '', message: '' });
        // Auto-reset after 5 seconds
        setTimeout(() => {
          setSubmitStatus('idle');
        }, 5000);
      } else {
        setSubmitStatus('error');
        setSubmitMessage(data.message || 'Failed to send message. Please try again.');
      }
    } catch (error) {
      setSubmitStatus('error');
      setSubmitMessage('An error occurred. Please try again later.');
      console.error('Contact form error:', error);
    }
  };

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
      <main className="w-full px-3 sm:px-4 lg:px-8 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Contact Us</h1>
          <p className="text-base sm:text-lg text-gray-600 mb-8 sm:mb-12">We'd love to hear from you. Send us a message and we'll respond as soon as possible.</p>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mb-12">
            {/* Contact Info */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 h-fit sticky top-4">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-6">Get in Touch</h2>
                
                <div className="grid grid-cols-2 sm:grid-cols-1 gap-6">
                  {/* Contact Details */}
                  <div className="space-y-5">
                    <div className="flex items-start space-x-3">
                      <Mail className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-base sm:text-lg">Email</p>
                        <p className="text-gray-600 text-sm sm:text-base break-all">support@pingjob.com</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <MapPin className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-base sm:text-lg">Address</p>
                        <p className="text-gray-600 text-sm sm:text-base">San Francisco, CA</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Business Hours */}
                  <div className="pt-0 sm:mt-6 sm:pt-6 sm:border-t border-l pl-4 sm:pl-0 sm:border-l-0">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 uppercase tracking-wide">Business Hours</h3>
                    <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                      Monday - Friday<br />
                      9:00 AM - 6:00 PM PST
                    </p>
                    <p className="text-gray-500 text-sm sm:text-base mt-2">
                      Closed on weekends
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 md:p-8">
                {submitStatus === 'success' ? (
                  <div className="flex flex-col items-center justify-center py-8 sm:py-12">
                    <CheckCircle className="h-12 sm:h-16 w-12 sm:w-16 text-green-600 mb-3 sm:mb-4" />
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Message Sent!</h3>
                    <p className="text-gray-600 text-center mb-6 text-sm sm:text-base">
                      Thank you for reaching out. We've received your message and will get back to you within 24 hours.
                    </p>
                    <Button 
                      onClick={() => {
                        setSubmitStatus('idle');
                        setFormData({ name: '', email: '', subject: '', message: '' });
                      }}
                      variant="outline"
                      className="text-sm sm:text-base"
                    >
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-5 sm:mb-6">Send us a Message</h2>
                    
                    {submitStatus === 'error' && (
                      <div className="mb-5 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2 sm:space-x-3">
                        <AlertCircle className="h-4 sm:h-5 w-4 sm:w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-sm sm:text-base font-medium text-red-800">Error sending message</p>
                          <p className="text-sm sm:text-base text-red-700 mt-1 break-words">{submitMessage}</p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4 sm:space-y-5">
                      {/* Name */}
                      <div>
                        <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2 sm:mb-3">
                          Full Name *
                        </label>
                        <Input
                          data-testid="input-contact-name"
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Your name"
                          required
                          disabled={submitStatus === 'loading'}
                          className="w-full text-base"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2 sm:mb-3">
                          Email Address *
                        </label>
                        <Input
                          data-testid="input-contact-email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="your@email.com"
                          required
                          disabled={submitStatus === 'loading'}
                          className="w-full text-base"
                        />
                      </div>

                      {/* Subject */}
                      <div>
                        <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2 sm:mb-3">
                          Subject *
                        </label>
                        <Input
                          data-testid="input-contact-subject"
                          type="text"
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          placeholder="How can we help?"
                          required
                          disabled={submitStatus === 'loading'}
                          className="w-full text-base"
                        />
                      </div>

                      {/* Message */}
                      <div>
                        <label className="block text-sm sm:text-base font-medium text-gray-700 mb-2 sm:mb-3">
                          Message *
                        </label>
                        <Textarea
                          data-testid="textarea-contact-message"
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          placeholder="Tell us more about your inquiry..."
                          required
                          disabled={submitStatus === 'loading'}
                          rows={5}
                          className="w-full text-base"
                        />
                      </div>

                      {/* Submit Button */}
                      <div className="pt-1 sm:pt-2">
                        <Button
                          data-testid="button-contact-submit"
                          type="submit"
                          disabled={submitStatus === 'loading'}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-sm sm:text-base"
                        >
                          {submitStatus === 'loading' ? (
                            <span className="flex items-center justify-center space-x-2">
                              <span className="animate-spin text-lg">⏳</span>
                              <span>Sending...</span>
                            </span>
                          ) : (
                            <span className="flex items-center justify-center space-x-2">
                              <Send className="h-4 w-4" />
                              <span>Send Message</span>
                            </span>
                          )}
                        </Button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="bg-gray-50 rounded-lg p-4 sm:p-6 md:p-8">
            <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-6 sm:mb-8">Frequently Asked Questions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
              <div>
                <h4 className="font-medium text-gray-900 text-base sm:text-lg mb-2">How do I post a job?</h4>
                <p className="text-gray-600 text-sm sm:text-base leading-relaxed">Create an employer account, set up your company profile, and submit your job listing for review. Premium plans unlock advanced features.</p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 text-base sm:text-lg mb-2">How do I apply for jobs?</h4>
                <p className="text-gray-600 text-sm sm:text-base leading-relaxed">Create a job seeker profile, upload your resume, and apply directly to employers. You can track all your applications from your dashboard.</p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 text-base sm:text-lg mb-2">Is PingJob free to use?</h4>
                <p className="text-gray-600 text-sm sm:text-base leading-relaxed">Yes, job seekers can use PingJob completely free. Employers can post jobs with our paid plans.</p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 text-base sm:text-lg mb-2">How long does it take to respond?</h4>
                <p className="text-gray-600 text-sm sm:text-base leading-relaxed">We typically respond to all inquiries within 24 hours during business days. Premium support is available for our enterprise customers.</p>
              </div>
            </div>
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