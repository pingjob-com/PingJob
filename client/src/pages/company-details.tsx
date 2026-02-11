import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { MapPin, Briefcase, Users, Globe, Calendar, Heart, ArrowLeft, ExternalLink, Star, MessageSquare, Send, Reply } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Link } from 'wouter';
import { resolveLogoUrl } from "@/lib/apiConfig";
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { setMetaTags, resetMetaTags } from '@/lib/meta-tags';
import { generateCompanyUrl, generateJobUrl, parseSlugUrl } from "../../../shared/slug-utils";
// Format job location helper function
const formatJobLocation = (job: any) => {
  const parts = [];
  if (job.city) parts.push(job.city);
  if (job.state) parts.push(job.state);
  if (job.zipCode) parts.push(job.zipCode);
  return parts.length > 0 ? parts.join(', ') : job.location || 'Location not specified';
};

export default function CompanyDetails() {
  const { id, idSlug } = useParams();
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  
  // Extract ID from either the old format (:id) or new format (:idSlug)
  const getCompanyId = () => {
    if (idSlug) {
      // New format: /companies/123-acme-corporation
      const parsed = parseSlugUrl(location);
      return parsed ? parsed.id : parseInt(idSlug.split('-')[0]);
    }
    // Legacy format: /companies/123
    return parseInt(id || '');
  };
  
  const companyId = getCompanyId();

  const handleApplyNow = (jobId: number, jobTitle?: string) => {
    console.log('Company page Apply Now clicked, user:', user, 'jobId:', jobId);
    if (!user) {
      // Store the job application intent and redirect to login using canonical URL
      const redirectPath = jobTitle ? generateJobUrl(jobId, jobTitle) : `/jobs/${jobId}`;
      localStorage.setItem('postAuthRedirect', redirectPath);
      console.log('Company page stored postAuthRedirect:', redirectPath);
      console.log('Company page current localStorage postAuthRedirect:', localStorage.getItem('postAuthRedirect'));
      navigate('/auth');
      return;
    }
    
    // Navigate to job details page where they can apply using canonical URL
    const jobPath = jobTitle ? generateJobUrl(jobId, jobTitle) : `/jobs/${jobId}`;
    navigate(jobPath);
  };

  const handleFollow = async () => {
    // Check if user is authenticated first
    if (!user) {
      // Store the current page as redirect destination and go to login
      localStorage.setItem('postAuthRedirect', location);
      navigate('/auth');
      return;
    }

    try {
      const response = await apiRequest('POST', `/api/companies/${companyId}/follow`);

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Success!",
          description: data.message || "You are now following this company.",
        });
      } else if (response.status === 401) {
        // Handle session expiry - redirect to login
        localStorage.setItem('postAuthRedirect', location);
        navigate('/auth');
      } else {
        toast({
          title: "Error",
          description: "Failed to follow company. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to follow company. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const { data: companyDetails, isLoading } = useQuery({
    queryKey: [`/api/companies/${companyId}/details`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/companies/${companyId}/details`);
      return response.json();
    },
    enabled: !!companyId && !isNaN(companyId)
  });

  const { data: reviewsData } = useQuery({
    queryKey: ['/api/companies', companyId, 'reviews'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/companies/${companyId}/reviews`);
      return response.json();
    },
    enabled: !!companyId && !isNaN(companyId)
  });

  const [reviewBody, setReviewBody] = useState('');
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewRating, setReviewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyBody, setReplyBody] = useState('');

  const submitReviewMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', `/api/companies/${companyId}/reviews`, data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: 'Submitted!', description: data.message || 'Your comment is pending approval.' });
      setReviewBody('');
      setReviewTitle('');
      setReviewRating(0);
      setGuestName('');
      setGuestEmail('');
      setReplyingTo(null);
      setReplyBody('');
      queryClient.invalidateQueries({ queryKey: ['/api/companies', companyId, 'reviews'] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to submit. Please try again.', variant: 'destructive' });
    }
  });

  const handleSubmitReview = () => {
    if (!reviewBody.trim()) return;
    submitReviewMutation.mutate({
      body: reviewBody,
      title: reviewTitle || undefined,
      rating: reviewRating > 0 ? reviewRating : undefined,
      authorName: !user ? guestName || undefined : undefined,
      authorEmail: !user ? guestEmail || undefined : undefined,
    });
  };

  const handleSubmitReply = (parentId: number) => {
    if (!replyBody.trim()) return;
    submitReviewMutation.mutate({
      body: replyBody,
      parentId,
      authorName: !user ? guestName || undefined : undefined,
      authorEmail: !user ? guestEmail || undefined : undefined,
    });
  };

  // Set meta tags for SEO when company loads
  useEffect(() => {
    if (companyDetails) {
      const description = companyDetails.description 
        ? companyDetails.description.substring(0, 155)
        : `${companyDetails.name} company profile on PingJob. View open jobs, company info, and career opportunities.`;
      
      setMetaTags({
        title: `${companyDetails.name} | Careers & Jobs | PingJob`,
        description,
        keywords: `${companyDetails.name}, jobs, careers, company, ${companyDetails.industry}`,
        ogTitle: `${companyDetails.name} - Careers on PingJob`,
        ogDescription: description,
        canonicalUrl: `https://www.pingjob.com/companies/${companyId}`
      });
    } else if (!isLoading) {
      resetMetaTags();
    }
  }, [companyDetails, isLoading, companyId]);

  // Redirect to canonical URL if needed
  useEffect(() => {
    if (companyDetails && companyDetails.name && companyId) {
      const canonicalPath = generateCompanyUrl(companyId, companyDetails.name);
      if (location !== canonicalPath && !isLoading) {
        console.log('Redirecting to canonical URL:', canonicalPath);
        // Use replace to avoid creating history entries for redirects
        navigate(canonicalPath, { replace: true });
      }
    }
  }, [companyDetails, companyId, location, navigate, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <div className="flex items-center space-x-6">
                <div className="w-24 h-24 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-8 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!companyDetails) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Company Not Found</h1>
          <p className="text-gray-600 mb-6">The company you're looking for doesn't exist or has been removed.</p>
          <Button asChild>
            <Link href="/">Return Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const company = companyDetails || {};
  const openJobs = companyDetails?.openJobs || [];
  const vendors = companyDetails?.vendors || [];
  const totalVendorCount = companyDetails?.totalVendorCount || vendors.length;
  
  
  const getDisplayAddress = (company: any) => {
    const parts = [];
    if (company.city) parts.push(company.city);
    if (company.state) parts.push(company.state);
    if (company.zipCode) parts.push(company.zipCode);
    if (company.country && company.country !== 'United States') parts.push(company.country);
    return parts.length > 0 ? parts.join(', ') : 'Location not specified';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Back Button */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>

        {/* Company Header */}
        <Card className="mb-6">
          <CardContent className="p-8">
            <div className="flex items-start space-x-6">
              {/* Company Logo */}
              <div className="w-24 h-24 border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm flex-shrink-0">
                {company.logoUrl && company.logoUrl !== "NULL" ? (
                  <img 
                    src={resolveLogoUrl(company.logoUrl)} 
                    alt={company.name}
                    className="w-full h-full object-contain p-2"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-2xl"
                  style={{display: company.logoUrl && company.logoUrl !== "NULL" ? 'none' : 'flex'}}
                >
                  {(company.name || 'C').charAt(0).toUpperCase()}
                </div>
              </div>
              
              {/* Company Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{company.name}</h1>
                
                {company.industry && (
                  <p className="text-lg text-gray-600 mb-3">{company.industry}</p>
                )}
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>{getDisplayAddress(company)}</span>
                  </div>
                  
                  {company.website && (
                    <div className="flex items-center">
                      <Globe className="h-4 w-4 mr-1" />
                      <a 
                        href={company.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        Website
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Company Stats */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {openJobs.length > 0 && (
                      <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                        <Briefcase className="h-4 w-4 mr-1" />
                        {openJobs.length} Open Job{openJobs.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                    
                    {totalVendorCount > 0 && (
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                        <Users className="h-4 w-4 mr-1" />
                        {totalVendorCount} Vendor{totalVendorCount !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>

                  {/* Follow Button */}
                  <Button 
                    onClick={handleFollow}
                    variant="outline"
                    size="sm"
                    className="ml-4"
                    data-testid="button-follow-company"
                  >
                    <Heart className="h-4 w-4 mr-2" />
                    Follow
                  </Button>
                </div>
              </div>
            </div>

            {/* Company Description */}
            {company.description && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-gray-700 leading-relaxed">{company.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs Content */}
        <Tabs defaultValue="jobs" className="space-y-6">
          <TabsList>
            <TabsTrigger value="jobs">Open Jobs ({companyDetails?.totalJobCount || openJobs.length})</TabsTrigger>
            {totalVendorCount > 0 && (
              <TabsTrigger value="vendors">Vendors ({totalVendorCount})</TabsTrigger>
            )}
            <TabsTrigger value="reviews">
              <MessageSquare className="h-4 w-4 mr-1" />
              Reviews ({reviewsData?.ratingSummary?.totalReviews || 0})
            </TabsTrigger>
          </TabsList>

          {/* Jobs Tab */}
          <TabsContent value="jobs" className="space-y-4">
            {openJobs.length > 0 ? (
              <div className="grid gap-4">
                {openJobs.map((job: any) => (
                  <Card key={job.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            <Link href={`/jobs/${job.id}`} className="hover:text-blue-600 transition-colors">
                              {job.title}
                            </Link>
                          </h3>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                            {job.location && (
                              <div className="flex items-center">
                                <MapPin className="h-4 w-4 mr-1" />
                                <span>{job.location}</span>
                              </div>
                            )}
                            
                            {job.employmentType && (
                              <Badge variant="outline" className="text-xs">
                                {job.employmentType.replace('_', ' ').toUpperCase()}
                              </Badge>
                            )}
                            
                            {job.salary && (
                              <span className="font-medium text-green-600">{job.salary}</span>
                            )}
                          </div>
                          
                          <p className="text-gray-600 line-clamp-2 mb-4">
                            {job.description}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-500">
                              Posted: {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Recently'}
                            </div>
                            
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/jobs/${job.id}`}>View Details</Link>
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleApplyNow(job.id);
                                }}
                              >
                                Apply Now
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Briefcase className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Open Positions</h3>
                  <p className="text-gray-600">This company doesn't have any open positions at the moment.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Vendors Tab */}
          {totalVendorCount > 0 && (
            <TabsContent value="vendors" className="space-y-4">
              <div className="grid gap-4">
                {vendors.map((vendor: any, index: number) => (
                  <Card key={vendor.vendor_id || index}>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                          {vendor.vendor_name ? vendor.vendor_name.charAt(0) : '?'}
                        </div>
                        <div>
                          <h4 className="font-semibold">{vendor.vendor_name}</h4>
                          {vendor.vendor_address && (
                            <p className="text-sm text-gray-600 mb-1">{vendor.vendor_address}</p>
                          )}
                          {/* Display location details */}
                          <div className="text-sm text-gray-500">
                            {/* Display vendor company location */}
                            {(vendor.vendor_city || vendor.vendor_state || vendor.vendor_zip_code) ? (
                              <div className="flex items-center mb-1">
                                <MapPin className="h-3 w-3 mr-1" />
                                <span>
                                  {[vendor.vendor_city, vendor.vendor_state, vendor.vendor_zip_code].filter(Boolean).join(', ')}
                                </span>
                              </div>
                            ) : null}
                            {vendor.vendor_email && (
                              <p className="text-gray-600">{vendor.vendor_email}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          )}
          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-6">
            {/* Rating Summary */}
            {reviewsData?.ratingSummary && reviewsData.ratingSummary.ratingCount > 0 && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl font-bold text-gray-900">
                      {reviewsData.ratingSummary.avgRating}
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star
                            key={s}
                            className={`h-5 w-5 ${s <= Math.round(reviewsData.ratingSummary.avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Based on {reviewsData.ratingSummary.ratingCount} rating{reviewsData.ratingSummary.ratingCount !== 1 ? 's' : ''} ({reviewsData.ratingSummary.totalReviews} review{reviewsData.ratingSummary.totalReviews !== 1 ? 's' : ''})
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Write Review Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Write a Review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!user && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      placeholder="Your name (optional)"
                      value={guestName}
                      onChange={e => setGuestName(e.target.value)}
                    />
                    <Input
                      placeholder="Your email (optional)"
                      value={guestEmail}
                      onChange={e => setGuestEmail(e.target.value)}
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Rating:</span>
                  {[1, 2, 3, 4, 5].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setReviewRating(s)}
                      onMouseEnter={() => setHoverRating(s)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`h-6 w-6 transition-colors ${
                          s <= (hoverRating || reviewRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                  {reviewRating > 0 && (
                    <button
                      type="button"
                      onClick={() => setReviewRating(0)}
                      className="text-xs text-gray-400 hover:text-gray-600 ml-2"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <Input
                  placeholder="Review title (optional)"
                  value={reviewTitle}
                  onChange={e => setReviewTitle(e.target.value)}
                />
                <Textarea
                  placeholder="Share your experience with this company..."
                  value={reviewBody}
                  onChange={e => setReviewBody(e.target.value)}
                  rows={4}
                />
                <div className="flex justify-between items-center">
                  <p className="text-xs text-gray-400">All reviews are moderated before being published.</p>
                  <Button
                    onClick={handleSubmitReview}
                    disabled={!reviewBody.trim() || submitReviewMutation.isPending}
                    className="bg-linkedin-blue hover:bg-linkedin-dark"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {submitReviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Reviews List */}
            {reviewsData?.reviews && reviewsData.reviews.length > 0 ? (
              <div className="space-y-4">
                {reviewsData.reviews.map((review: any) => (
                  <Card key={review.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-3">
                        {review.authorAvatar ? (
                          <img src={review.authorAvatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {(review.author || 'A').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900">{review.author}</span>
                            <span className="text-xs text-gray-400">
                              {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ''}
                            </span>
                          </div>
                          {review.rating && (
                            <div className="flex items-center gap-0.5 mt-1">
                              {[1, 2, 3, 4, 5].map(s => (
                                <Star key={s} className={`h-4 w-4 ${s <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                              ))}
                            </div>
                          )}
                          {review.title && (
                            <h4 className="font-medium text-gray-900 mt-2">{review.title}</h4>
                          )}
                          <p className="text-gray-700 mt-1 whitespace-pre-wrap">{review.body}</p>

                          <button
                            type="button"
                            onClick={() => { setReplyingTo(replyingTo === review.id ? null : review.id); setReplyBody(''); }}
                            className="text-sm text-blue-600 hover:text-blue-800 mt-2 flex items-center gap-1"
                          >
                            <Reply className="h-3.5 w-3.5" />
                            Reply
                          </button>

                          {/* Reply Form */}
                          {replyingTo === review.id && (
                            <div className="mt-3 pl-4 border-l-2 border-gray-200 space-y-2">
                              {!user && (
                                <Input
                                  placeholder="Your name (optional)"
                                  value={guestName}
                                  onChange={e => setGuestName(e.target.value)}
                                  className="text-sm"
                                />
                              )}
                              <Textarea
                                placeholder="Write a reply..."
                                value={replyBody}
                                onChange={e => setReplyBody(e.target.value)}
                                rows={2}
                                className="text-sm"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleSubmitReply(review.id)}
                                  disabled={!replyBody.trim() || submitReviewMutation.isPending}
                                  className="bg-linkedin-blue hover:bg-linkedin-dark"
                                >
                                  {submitReviewMutation.isPending ? 'Sending...' : 'Reply'}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setReplyingTo(null)}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Threaded Replies */}
                          {review.replies && review.replies.length > 0 && (
                            <div className="mt-4 pl-4 border-l-2 border-gray-100 space-y-3">
                              {review.replies.map((reply: any) => (
                                <div key={reply.id} className="flex items-start gap-2">
                                  {reply.authorAvatar ? (
                                    <img src={reply.authorAvatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-gray-400 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                                      {(reply.author || 'A').charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-sm text-gray-900">{reply.author}</span>
                                      <span className="text-xs text-gray-400">
                                        {reply.createdAt ? new Date(reply.createdAt).toLocaleDateString() : ''}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{reply.body}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Reviews Yet</h3>
                  <p className="text-gray-600">Be the first to share your experience with this company.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}