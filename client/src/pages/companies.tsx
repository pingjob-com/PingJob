import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import JobCard from "@/components/job-card";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { setMetaTags } from "@/lib/meta-tags";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { insertCompanySchema, insertJobSchema } from "@shared/schema";
import { z } from "zod";
import { Link, useLocation, useSearch } from "wouter";
const logoPath = 'https://cdn.pingjob.com/logo.png';
import SimpleFooter from "@/components/simple-footer";
import GoogleAdsense from "@/components/ads/GoogleAdsense";
import GoogleAdManager from "@/components/ads/GoogleAdManager";
import { resolveLogoUrl } from "@/lib/apiConfig";
import BackToTopButton from "@/components/back-to-top-button";
import { generateCompanyUrl } from "../../../shared/slug-utils";
import {
  Building,
  Search,
  Users,
  MapPin,
  Globe,
  Briefcase,
  TrendingUp,
  Heart,
  Eye,
  Share,
  Plus,
  Filter,
  Phone,
  Mail,
  Star,
  Check,
  X,
  Edit,
  ChevronLeft,
  ChevronRight,
  Menu,
  MessageSquare,
  UserPlus,
  Contact
} from "lucide-react";

// VendorManagement Component - Restored from working dashboard implementation
function VendorManagement({ companyId }: { companyId: number }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedVendorCompany, setSelectedVendorCompany] = useState<any>(null);
  const [vendorComboOpen, setVendorComboOpen] = useState(false);
  const [companySearchQuery, setCompanySearchQuery] = useState("");
  const [showCompanyResults, setShowCompanyResults] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Search companies for vendor selection (all 76,806 companies)
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['/api/companies/search', companySearchQuery],
    queryFn: async () => {
      if (!companySearchQuery.trim() || companySearchQuery.length < 2) return [];
      const response = await fetch(`/api/companies/search?query=${encodeURIComponent(companySearchQuery)}&limit=20`);
      if (!response.ok) throw new Error('Failed to search companies');
      return response.json();
    },
    enabled: companySearchQuery.length >= 2
  });

  // Add vendor mutation
  const addVendorMutation = useMutation({
    mutationFn: async (vendorData: any) => {
      return await apiRequest('POST', '/api/vendors', vendorData);
    },
    onSuccess: () => {
      setShowAddForm(false);
      setSelectedVendorCompany(null);
      queryClient.invalidateQueries({ queryKey: [`/api/companies/${companyId}/details`] });
      toast({
        title: "Vendor added",
        description: "Vendor has been successfully added to the company.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add vendor.",
        variant: "destructive",
      });
    },
  });

  const handleAddVendor = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (!selectedVendorCompany) {
      toast({
        title: "Error",
        description: "Please search and select a vendor company.",
        variant: "destructive",
      });
      return;
    }
    
    addVendorMutation.mutate({
      companyId: companyId,
      name: selectedVendorCompany.name,
      email: formData.get('email'),
      phone: formData.get('phone'),
      services: formData.get('services'),
      description: formData.get('description'),
      // Remove status field to let backend default to 'pending'
    });
  };

  const handleCancelForm = () => {
    setShowAddForm(false);
    setSelectedVendorCompany(null);
    setCompanySearchQuery("");
    setShowCompanyResults(false);
  };



  if (!showAddForm) {
    return (
      <div className="flex justify-end mb-4">
        <Button 
          onClick={() => setShowAddForm(true)}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Vendor
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-green-900">Add Vendor to Company</h4>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleCancelForm}
        >
          Cancel
        </Button>
      </div>

      <form onSubmit={handleAddVendor} className="space-y-4">
        {/* Vendor Company Search and Selection */}
        <div className="space-y-2">
          <Label htmlFor="vendor-company">Search Vendor Company</Label>
          <div className="relative">
            <Input
              type="text"
              placeholder="Type to search companies (e.g., IBM, Microsoft, Google)..."
              value={companySearchQuery}
              onChange={(e) => {
                setCompanySearchQuery(e.target.value);
                setShowCompanyResults(e.target.value.length >= 2);
              }}
              className="w-full"
            />
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            
            {/* Search Results Dropdown */}
            {showCompanyResults && searchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                {searchResults.map((company: any) => (
                  <div
                    key={company.id}
                    onClick={() => {
                      setSelectedVendorCompany(company);
                      setCompanySearchQuery(company.name);
                      setShowCompanyResults(false);
                    }}
                    className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded bg-blue-500 text-white flex items-center justify-center text-sm font-bold">
                        {company.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{company.name}</div>
                        <div className="text-xs text-gray-500">
                          {company.city && company.state ? `${company.city}, ${company.state}` : company.location}
                        </div>
                        {company.website && (
                          <div className="text-xs text-gray-400">{company.website}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* No Results Message */}
            {showCompanyResults && searchResults && searchResults.length === 0 && !searchLoading && companySearchQuery.length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
                <div className="text-sm text-gray-500 text-center">No companies found for "{companySearchQuery}"</div>
              </div>
            )}
            
            {/* Loading State */}
            {searchLoading && showCompanyResults && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
                <div className="text-sm text-gray-500 text-center">Searching...</div>
              </div>
            )}
          </div>
        </div>

        {/* Selected Company Preview */}
        {selectedVendorCompany && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h5 className="font-medium text-blue-900 mb-2">Selected Vendor Company</h5>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded bg-blue-500 text-white flex items-center justify-center font-bold">
                {selectedVendorCompany.name.charAt(0)}
              </div>
              <div>
                <p className="font-medium">{selectedVendorCompany.name}</p>
                {selectedVendorCompany.location && (
                  <p className="text-sm text-gray-600">{selectedVendorCompany.location}</p>
                )}
                {selectedVendorCompany.website && (
                  <p className="text-xs text-gray-500">{selectedVendorCompany.website}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={selectedVendorCompany?.website ? `info@${selectedVendorCompany.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}` : ""}
              placeholder="Enter vendor email (optional)"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={selectedVendorCompany?.phone || ""}
              placeholder="Enter phone number"
            />
          </div>
        </div>

        {/* Services */}
        <div className="space-y-2">
          <Label htmlFor="services">Services</Label>
          <Input
            id="services"
            name="services"
            placeholder="e.g., Staffing, Consulting, Development"
            required
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            name="description"
            placeholder="Brief description of vendor services"
            rows={3}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancelForm}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={addVendorMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {addVendorMutation.isPending ? "Adding..." : "Add Vendor"}
          </Button>
        </div>
      </form>
    </div>
  );
}

// Company Card Component
function CompanyCard({ company, onSelectCompany, onFollowCompany, onEditCompany }: {
  company: any;
  onSelectCompany: (company: any) => void;
  onFollowCompany: (companyId: number) => void;
  onEditCompany?: (company: any) => void;
}) {
  const { user } = useAuth();
  const isAdmin = user?.email === 'krupas@vedsoft.com' || user?.email === 'krupashankar@gmail.com';
  const handleClick = () => {
    if (import.meta.env.DEV) console.log("View clicked for company:", company.name);
    onSelectCompany(company);
  };

  return (
    <Card 
      className="hover:shadow-lg transition-shadow duration-300 cursor-pointer group"
      onClick={handleClick}
    >
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Company Logo */}
          <div className="w-20 h-16 border border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0">
            {company.logoUrl && company.logoUrl !== "NULL" && company.logoUrl !== "logos/NULL" ? (
              <img 
                src={resolveLogoUrl(company.logoUrl)} 
                alt={company.name}
                className="w-full h-full object-contain p-2"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-linkedin-blue text-white font-bold text-lg">
                {company.name.charAt(0)}
              </div>
            )}
          </div>
          
          {/* Company Name */}
          <h3 className="font-semibold text-base text-gray-900 line-clamp-3 min-h-[60px] flex items-center text-center leading-tight">
            {company.name}
          </h3>
          
          {/* Industry */}
          {company.industry && (
            <p className="text-xs text-gray-600 line-clamp-1">
              {company.industry}
            </p>
          )}
          
          {/* Location with Zip Code - Two Lines */}
          {(company.city || company.state || company.zipCode || company.zip_code || company.country) && (
            <div className="flex flex-col items-center justify-center text-sm text-gray-500 space-y-1">
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                <span className="text-center">
                  {[company.city, company.state].filter(Boolean).join(', ')}
                </span>
              </div>
              {(company.zipCode || company.zip_code || company.country) && (
                <div className="text-xs text-center">
                  {[company.zipCode || company.zip_code, company.country].filter(Boolean).join(', ')}
                </div>
              )}
            </div>
          )}
          
          {/* Stats */}
          <div className="flex flex-col items-center space-y-2 w-full">
            {(company.job_count || 0) > 0 && (
              <div className="flex items-center text-green-600 font-medium bg-green-50 px-3 py-1 rounded-full">
                <Briefcase className="h-4 w-4 mr-2" />
                <span className="text-sm">{company.job_count} Open Job{company.job_count !== 1 ? 's' : ''}</span>
              </div>
            )}
            {(company.vendor_count || 0) > 0 && (
              <div className="flex items-center text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                <Users className="h-4 w-4 mr-2" />
                <span className="text-sm">{company.vendor_count} Vendor{company.vendor_count !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
          
          {/* Quick Action Links */}
          <div className="flex flex-wrap justify-center gap-1 mt-1">
            <Link href={`${generateCompanyUrl(company.id, company.name)}?tab=vendors`} onClick={(e: any) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="text-[10px] gap-0.5 h-6 text-purple-600 hover:text-purple-800 hover:bg-purple-50 px-1.5">
                <UserPlus className="h-2.5 w-2.5" />
                Vendor
              </Button>
            </Link>
            <Link href={`${generateCompanyUrl(company.id, company.name)}?tab=vendors`} onClick={(e: any) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="text-[10px] gap-0.5 h-6 text-green-600 hover:text-green-800 hover:bg-green-50 px-1.5">
                <Contact className="h-2.5 w-2.5" />
                Contact
              </Button>
            </Link>
            <Link href={`${generateCompanyUrl(company.id, company.name)}?tab=reviews`} onClick={(e: any) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="text-[10px] gap-0.5 h-6 text-orange-600 hover:text-orange-800 hover:bg-orange-50 px-1.5">
                <MessageSquare className="h-2.5 w-2.5" />
                Comment
              </Button>
            </Link>
          </div>
          
          {/* Admin & Follow Buttons */}
          <div className="w-full mt-auto space-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {isAdmin && onEditCompany && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditCompany(company);
                }}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Company
              </Button>
            )}
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onFollowCompany(company.id);
              }}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Heart className="h-4 w-4 mr-2" />
              Follow Company
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Search Results Component
function SearchResults({ companies, onSelectCompany, onFollowCompany, onEditCompany }: {
  companies: any[];
  onSelectCompany: (company: any) => void;
  onFollowCompany: (companyId: number) => void;
  onEditCompany?: (company: any) => void;
}) {
  if (companies.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Building className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>No companies found</p>
        <p className="text-sm mt-2">Try adjusting your search terms</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {companies.map((company: any) => (
        <CompanyCard
          key={company.id}
          company={company}
          onSelectCompany={onSelectCompany}
          onFollowCompany={onFollowCompany}
          onEditCompany={onEditCompany}
        />
      ))}
    </div>
  );
}

// Company Details Modal Component
function CompanyDetailsModal({ company, isOpen, onClose }: {
  company: any;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const { data: companyDetails } = useQuery({
    queryKey: [`/api/companies/${company?.id}/details`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/companies/${company.id}/details`);
      return response.json();
    },
    enabled: !!company
  });

  // Check if user is admin
  const isAdmin = user?.email === 'krupas@vedsoft.com' || user?.email === 'krupashankar@gmail.com';

  if (!company) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-12 h-10 border border-gray-200 rounded overflow-hidden bg-gray-50">
              {company.logoUrl && company.logoUrl !== "NULL" && company.logoUrl !== "logos/NULL" ? (
                <img 
                  src={resolveLogoUrl(company.logoUrl) || ''} 
                  alt={company.name}
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-linkedin-blue text-white font-bold">
                  {company.name.charAt(0)}
                </div>
              )}
            </div>
            {company.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Company Statistics */}
          {(companyDetails?.openJobs?.length > 0 || companyDetails?.vendors?.length > 0) && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold mb-3">Company Activity</h4>
              <div className="flex items-center space-x-6">
                {companyDetails?.openJobs?.length > 0 && (
                  <div className="flex items-center text-green-600">
                    <Briefcase className="h-5 w-5 mr-2" />
                    <span className="font-medium">
                      {companyDetails.openJobs.length} Open Job{companyDetails.openJobs.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
                {(companyDetails?.totalVendorCount || companyDetails?.vendors?.length) > 0 && (
                  <div className="flex items-center text-blue-600">
                    <Users className="h-5 w-5 mr-2" />
                    <span className="font-medium">
                      {companyDetails?.totalVendorCount || companyDetails?.vendors?.length} Vendor{(companyDetails?.totalVendorCount || companyDetails?.vendors?.length) !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Company Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Industry</h4>
              <p className="text-gray-600">{company.industry || 'Not specified'}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Location</h4>
              <p className="text-gray-600">
                {[companyDetails?.city, companyDetails?.state, companyDetails?.zipCode, companyDetails?.country].filter(Boolean).join(', ') || companyDetails?.location || company.location || 'Not specified'}
              </p>
            </div>
            {(companyDetails?.website && companyDetails.website !== 'NULL') && (
              <div>
                <h4 className="font-semibold mb-2">Website</h4>
                <a 
                  href={companyDetails.website.startsWith('http') ? companyDetails.website : `https://${companyDetails.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-linkedin-blue hover:underline"
                >
                  {companyDetails.website}
                </a>
              </div>
            )}
            {(companyDetails?.phone && companyDetails.phone !== 'NULL') && (
              <div>
                <h4 className="font-semibold mb-2">Phone</h4>
                <a href={`tel:${companyDetails.phone}`} className="text-linkedin-blue hover:underline">
                  {companyDetails.phone}
                </a>
              </div>
            )}
          </div>

          {/* Description */}
          {company.description && (
            <div>
              <h4 className="font-semibold mb-2">About</h4>
              <p className="text-gray-700 leading-relaxed">{company.description}</p>
            </div>
          )}

          {/* Quick Action Links */}
          <div className="flex flex-wrap gap-2 py-2 border-t border-b border-gray-100">
            <Link href={`${generateCompanyUrl(company.id, company.name)}?tab=vendors`}>
              <Button variant="ghost" size="sm" className="text-xs gap-1.5 h-8 text-purple-600 hover:text-purple-800 hover:bg-purple-50">
                <UserPlus className="h-3.5 w-3.5" />
                Add Vendor
              </Button>
            </Link>
            <Link href={`${generateCompanyUrl(company.id, company.name)}?tab=vendors`}>
              <Button variant="ghost" size="sm" className="text-xs gap-1.5 h-8 text-green-600 hover:text-green-800 hover:bg-green-50">
                <Contact className="h-3.5 w-3.5" />
                Add Contact
              </Button>
            </Link>
            <Link href={`${generateCompanyUrl(company.id, company.name)}?tab=reviews`}>
              <Button variant="ghost" size="sm" className="text-xs gap-1.5 h-8 text-orange-600 hover:text-orange-800 hover:bg-orange-50">
                <MessageSquare className="h-3.5 w-3.5" />
                Add Comment
              </Button>
            </Link>
          </div>

          {/* Tabs for Jobs and Vendors */}
          <Tabs defaultValue="jobs" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="jobs">
                Jobs ({companyDetails?.totalJobCount || companyDetails?.openJobs?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="vendors">
                Vendors{(companyDetails?.totalVendorCount || companyDetails?.vendors?.length) > 0 ? ` (${companyDetails?.totalVendorCount || companyDetails?.vendors?.length})` : ''}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="jobs" className="space-y-4">
              {/* Admin Actions */}
              {isAdmin && (
                <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div>
                    <h4 className="font-semibold text-blue-900">Admin Actions</h4>
                    <p className="text-sm text-blue-700">Post jobs for this company</p>
                  </div>
                  <Link href={`/job-create?companyId=${company.id}&companyName=${encodeURIComponent(company.name)}`}>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Post a Job
                    </Button>
                  </Link>
                </div>
              )}
              
              {companyDetails?.openJobs && companyDetails.openJobs.length > 0 ? (
                <div className="space-y-4">
                  {companyDetails.openJobs.map((job: any) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No open positions</p>
                  {isAdmin && (
                    <p className="text-sm mt-2 text-blue-600">Use "Post a Job" above to create the first job for this company</p>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="vendors" className="space-y-4">
              {/* Add Vendor Interface for Admin Users */}
              {isAdmin && <VendorManagement companyId={company.id} />}
              
              {companyDetails?.vendors && companyDetails.vendors.length > 0 ? (
                <div className="space-y-4">
                  {companyDetails.vendors.map((vendor: any) => (
                    <Card key={vendor.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{vendor.vendor_name}</h4>
                            {vendor.vendor_address && (
                              <p className="text-sm text-gray-600 mb-1">{vendor.vendor_address}</p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                              {/* Display vendor company location */}
                              {(vendor.vendor_city || vendor.vendor_state || vendor.vendor_zip_code) && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {[vendor.vendor_city, vendor.vendor_state, vendor.vendor_zip_code].filter(Boolean).join(', ')}
                                </div>
                              )}
                              {/* Email will be hidden by server for unauthenticated users */}
                              {vendor.vendor_email && (
                                <div className="flex items-center gap-1">
                                  <Mail className="h-4 w-4" />
                                  <a 
                                    href={`mailto:${vendor.vendor_email}`}
                                    className="text-linkedin-blue hover:underline"
                                  >
                                    {vendor.vendor_email}
                                  </a>
                                </div>
                              )}
                              {vendor.vendor_phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-4 w-4" />
                                  <a 
                                    href={`tel:${vendor.vendor_phone}`}
                                    className="text-linkedin-blue hover:underline"
                                  >
                                    {vendor.vendor_phone}
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant={vendor.status === 'approved' ? 'default' : 'secondary'}>
                              {vendor.status}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {/* Show "Login to see more" message for non-authenticated users when there are more vendors than displayed */}
                  {!user && (companyDetails?.totalVendorCount || 0) > (companyDetails?.vendors?.length || 0) && (
                    <Card className="border-dashed">
                      <CardContent className="p-4 text-center">
                        <div className="text-gray-500">
                          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm font-medium">
                            {(companyDetails?.totalVendorCount || 0) - (companyDetails?.vendors?.length || 0)} more vendor{((companyDetails?.totalVendorCount || 0) - (companyDetails?.vendors?.length || 0)) !== 1 ? 's' : ''} available
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            <Link href="/auth" className="text-linkedin-blue hover:underline">
                              Login
                            </Link> to view all vendors and contact information
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Building className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No vendors registered</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Main Companies Page Component
export default function CompaniesPage() {
  // Set meta tags for SEO
  useEffect(() => {
    setMetaTags({
      title: 'Browse Companies | PingJob Job Board',
      description: 'Explore verified companies hiring on PingJob. View company profiles, job openings, employee reviews, and career opportunities. Connect with top employers directly.',
      keywords: 'companies, employers, company profiles, job openings, hiring companies, employer directory, career',
      ogTitle: 'Discover Companies Hiring on PingJob',
      ogDescription: 'Browse verified companies and their job opportunities',
      canonicalUrl: 'https://www.pingjob.com/companies'
    });
  }, []);

  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const searchParams = useSearch();
  const urlSearchQuery = new URLSearchParams(searchParams).get('search') || '';
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [companyEditOpen, setCompanyEditOpen] = useState(false);
  const logoFileRef = useRef<File | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCountryId, setSelectedCountryId] = useState<string>('');
  const [selectedStateId, setSelectedStateId] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [companySearchInput, setCompanySearchInput] = useState("");
  
  // Check if user is admin
  const isAdmin = user?.email === 'krupas@vedsoft.com' || user?.email === 'krupashankar@gmail.com';

  const companiesPerPage = 20;

  // Search ALL companies when user types in search (for non-logged-in users only)
  const { data: searchedCompanies = [], isLoading: isSearching } = useQuery({
    queryKey: ['/api/companies/search', companySearchInput],
    queryFn: async () => {
      if (!companySearchInput.trim() || companySearchInput.length < 2) return [];
      const response = await fetch(`/api/companies/search?query=${encodeURIComponent(companySearchInput.trim())}&limit=1000`);
      if (!response.ok) throw new Error('Failed to search companies');
      return response.json();
    },
    enabled: !user && companySearchInput.trim().length >= 2
  });

  // Search ALL companies from URL parameter (for logged-in users using header search)
  const { data: urlSearchedCompanies = [], isLoading: isUrlSearching } = useQuery({
    queryKey: ['/api/companies/search', 'url', urlSearchQuery],
    queryFn: async () => {
      if (!urlSearchQuery.trim() || urlSearchQuery.length < 2) return [];
      const response = await fetch(`/api/companies/search?query=${encodeURIComponent(urlSearchQuery.trim())}&limit=1000`);
      if (!response.ok) throw new Error('Failed to search companies');
      return response.json();
    },
    enabled: urlSearchQuery.trim().length >= 2
  });

  // Load top 100 companies prioritized by vendor and job count
  const { data: topCompanies = [], isLoading } = useQuery({
    queryKey: ['/api/companies/top'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/companies/top');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000 // Keep in cache for 10 minutes
  });

  // Fetch platform stats for total company count
  const { data: platformStats } = useQuery({
    queryKey: ['/api/platform/stats'],
    queryFn: async () => {
      const response = await fetch('/api/platform/stats');
      if (!response.ok) throw new Error('Failed to fetch platform stats');
      return response.json();
    }
  });

  // Fetch countries for dropdown
  const { data: countries = [] } = useQuery({
    queryKey: ['/api/countries'],
    queryFn: async () => {
      const response = await fetch('/api/countries');
      if (!response.ok) throw new Error('Failed to fetch countries');
      return response.json();
    }
  });

  // Fetch states for selected country
  const { data: states = [] } = useQuery({
    queryKey: ['/api/states', selectedCountryId],
    queryFn: async () => {
      const response = await fetch(`/api/states/${selectedCountryId}`);
      if (!response.ok) throw new Error('Failed to fetch states');
      return response.json();
    },
    enabled: !!selectedCountryId
  });

  // Fetch cities for selected state
  const { data: cities = [] } = useQuery({
    queryKey: ['/api/cities', selectedStateId],
    queryFn: async () => {
      const response = await fetch(`/api/cities/${selectedStateId}`);
      if (!response.ok) throw new Error('Failed to fetch cities');
      return response.json();
    },
    enabled: !!selectedStateId
  });

  // Set meta tags for companies page
  useEffect(() => {
    const searchQuery = urlSearchQuery || companySearchInput;
    if (searchQuery) {
      setMetaTags({
        title: `Companies Hiring - Search Results for "${searchQuery}" | PingJob`,
        description: `Search and browse companies hiring. Find your next employer and explore company profiles on PingJob's job board.`,
        keywords: `companies, hiring, job board, search, ${searchQuery}`,
        ogTitle: `Companies Hiring - ${searchQuery}`,
        ogDescription: `Find companies and job opportunities matching your search on PingJob`,
        canonicalUrl: `https://www.pingjob.com/companies?search=${encodeURIComponent(searchQuery)}`
      });
    } else {
      setMetaTags({
        title: `Browse Companies | PingJob - Job Board & Careers`,
        description: `Discover top hiring companies on PingJob. Browse company profiles, open positions, and find your next career opportunity.`,
        keywords: `companies, hiring, jobs, careers, employment, job board`,
        ogTitle: `Browse Top Companies Hiring on PingJob`,
        ogDescription: `Find your next employer. Explore company profiles and open job positions on PingJob`,
        canonicalUrl: `https://www.pingjob.com/companies`
      });
    }
  }, [urlSearchQuery, companySearchInput]);

  // For non-logged-in users: use server-side search results when searching, otherwise show top companies
  // For logged-in users: use URL search parameter results from header search, otherwise show top companies
  const filteredCompanies = 
    (!user && companySearchInput.trim().length >= 2) ? searchedCompanies :
    (user && urlSearchQuery.trim().length >= 2) ? urlSearchedCompanies :
    topCompanies;

  // Company edit mutation
  const companyEditMutation = useMutation({
    mutationFn: async (companyData: any) => {
      console.log('Company edit mutation received data:', companyData);
      
      // Check if we have a file in the ref (from file input)
      const logoFile = logoFileRef.current;
      const hasNewLogoFile = logoFile && logoFile instanceof File && logoFile.size > 0;
      
      console.log('File check details:', {
        hasLogoFileInRef: !!logoFile,
        hasNewLogoFlag: !!companyData.hasNewLogo,
        isInstanceOfFile: logoFile instanceof File,
        fileSize: logoFile?.size,
        fileName: logoFile?.name,
        fileType: logoFile?.type,
        finalDecision: hasNewLogoFile
      });
      
      if (hasNewLogoFile) {
        console.log('Using FormData for file upload');
        const formData = new FormData();
        formData.append('logo', logoFile);
        
        // Add all other company data  
        Object.keys(companyData).forEach(key => {
          if (key !== 'logoFile' && key !== 'hasNewLogo' && companyData[key] !== undefined && companyData[key] !== null && companyData[key] !== '') {
            console.log(`Adding to FormData: ${key} = ${companyData[key]}`);
            formData.append(key, String(companyData[key]));
          }
        });
        
        // Log FormData contents
        console.log('FormData contents:');
        Array.from(formData.entries()).forEach(([key, value]) => {
          console.log(key + ': ' + value);
        });
        
        const response = await fetch(`/api/companies/${companyData.id}`, {
          method: 'PATCH',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('Failed to update company');
        }
        
        return response.json();
      } else {
        console.log('Using JSON for regular update');
        // Create a clean copy without undefined values, but keep empty strings
        const cleanData = Object.fromEntries(
          Object.entries(companyData).filter(([key, value]) => 
            key !== 'logoFile' && 
            key !== 'hasNewLogo' &&
            key !== 'createdAt' && 
            key !== 'approvedBy' && 
            value !== undefined && 
            value !== null &&
            !(typeof value === 'object' && Object.keys(value).length === 0) // Filter out empty objects but keep empty strings
          )
        );
        console.log('Clean data to send:', cleanData);
        
        // Ensure we have at least some data to send
        if (Object.keys(cleanData).length <= 1) { // Allow if we have at least the ID
          throw new Error('No data to update');
        }
        
        // Regular JSON update without file upload
        const response = await apiRequest('PATCH', `/api/companies/${companyData.id}`, cleanData);
        return response.json();
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Company updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/companies/top'] });
      queryClient.invalidateQueries({ queryKey: ['/api/search'] });
      // Force invalidate all company-related queries
      queryClient.invalidateQueries({ queryKey: [`/api/companies/${editingCompany?.id}/details`] });
      queryClient.removeQueries({ queryKey: [`/api/companies/${editingCompany?.id}/details`] });
      
      setCompanyEditOpen(false);
      
      // Clear the logo file ref after successful save
      logoFileRef.current = null;
      
      // Force refresh the company details if currently viewing
      if (selectedCompany && editingCompany && selectedCompany.id === editingCompany.id) {
        // Force refetch fresh data from the server instead of using cached data
        queryClient.removeQueries({ queryKey: [`/api/companies/${editingCompany.id}/details`] });
        queryClient.refetchQueries({ queryKey: [`/api/companies/${editingCompany.id}/details`] });
        // Also clear and refresh the selected company immediately
        setTimeout(() => {
          queryClient.refetchQueries({ queryKey: [`/api/companies/${editingCompany.id}/details`] });
        }, 100);
      }
      
      setEditingCompany(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update company",
        variant: "destructive",
      });
    },
  });

  // Follow company mutation
  const followMutation = useMutation({
    mutationFn: async (companyId: number) => {
      const response = await apiRequest('POST', `/api/companies/${companyId}/follow`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Company followed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/companies/top'] });
    },
    onError: (error: any) => {
      // Check if it's an authentication error (401)
      if (error.message?.includes('Authentication required') || error.message?.includes('401')) {
        // Session expired while user appeared logged in - redirect to login
        const redirectPath = `/companies${window.location.search}`;
        localStorage.setItem('postAuthRedirect', redirectPath);
        navigate('/auth');
        return;
      }
      
      toast({
        title: "Error",
        description: error.message || "Failed to follow company",
        variant: "destructive",
      });
    },
  });



  // Calculate pagination based on filtered companies
  const totalPages = Math.ceil(filteredCompanies.length / companiesPerPage);
  
  // Get current page companies from filtered results
  const currentCompanies = filteredCompanies.slice(
    (currentPage - 1) * companiesPerPage,
    currentPage * companiesPerPage
  );
  
  // Reset to page 1 when search input or URL search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [companySearchInput, urlSearchQuery]);

  const handleSelectCompany = (company: any) => {
    setSelectedCompany(company);
  };

  const handleEditCompany = (company: any) => {
    // If we're viewing company details, use the detailed data instead of basic company list data
    const editCompany = (selectedCompany && selectedCompany.id === company.id) 
      ? selectedCompany 
      : company;
    
    console.log('Setting editing company:', editCompany);
    // Create a clean copy without problematic fields - completely remove logoFile
    const cleanCompany = { ...editCompany };
    delete cleanCompany.logoFile; // Completely remove logoFile property
    setEditingCompany(cleanCompany);
    
    // Set selected IDs if they exist (use the detailed data)
    if (editCompany.countryId) {
      setSelectedCountryId(editCompany.countryId.toString());
    } else {
      setSelectedCountryId('');
    }
    
    if (editCompany.stateId) {
      setSelectedStateId(editCompany.stateId.toString());
    } else {
      setSelectedStateId('');
    }
    
    setCompanyEditOpen(true);
  };

  const handleFollowCompany = (companyId: number) => {
    // Check if user is authenticated first
    if (!user) {
      // Store the current page as redirect destination and go to login
      const redirectPath = '/companies';
      localStorage.setItem('postAuthRedirect', redirectPath);
      navigate('/auth');
      return;
    }
    
    followMutation.mutate(companyId);
  };

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Different for logged in vs non-logged in users */}
      {!user ? (
        /* Non-logged-in header - Jobs Page Style */
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Link href="/">
                  <img src={logoPath} alt="PingJob" className="h-8 w-auto mr-4 cursor-pointer" />
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
      ) : (
        /* Removed duplicate header for logged-in users - main navigation handles this */
        null
      )}

      <div className="container mx-auto px-4 py-8 max-w-7xl">

      {/* Company Search Bar - ONLY for non-logged-in users */}
      {!user && (
        <Card className="mb-6">
          <CardContent className="p-4 sm:p-6">
            <h2 className="text-xl font-semibold mb-4">Search Companies</h2>
            <div className="flex gap-4">
              <Input
                placeholder="Company name, industry, or location..."
                value={companySearchInput}
                onChange={(e) => setCompanySearchInput(e.target.value)}
                className="flex-1"
                data-testid="input-company-search"
              />
            </div>
            {companySearchInput && (
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCompanySearchInput("")}
                  data-testid="button-clear-search"
                >
                  Clear Search
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Company Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {(!user && companySearchInput.trim().length >= 2) || (user && urlSearchQuery.trim().length >= 2)
                ? `Search Results (${filteredCompanies.length} ${filteredCompanies.length === 1 ? 'company' : 'companies'} found)`
                : 'Top Companies (76,806 total)'}
            </CardTitle>
              <div className="flex items-center gap-4">
                {user?.userType === 'recruiter' && (
                  <Link href="/company/create">
                    <Button className="bg-green-600 hover:bg-green-700 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Company
                    </Button>
                  </Link>
                )}
                <div className="text-sm text-gray-500">
                  Page {currentPage} of {totalPages}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {(isLoading || (!user && isSearching) || (user && isUrlSearching)) ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                {[...Array(20)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="w-16 h-12 bg-gray-200 rounded mx-auto"></div>
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4 mx-auto"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : currentCompanies.length > 0 ? (
              <>
                <div className="space-y-6 md:space-y-8">
                  {/* Desktop view: Group companies into rows */}
                  <div className="hidden md:block">
                    {(() => {
                      const rows = [];
                      const itemsPerRow = 5;
                      for (let i = 0; i < currentCompanies.length; i += itemsPerRow) {
                        rows.push(currentCompanies.slice(i, i + itemsPerRow));
                      }
                      
                      return rows.map((row: any, rowIndex: number) => (
                        <div key={rowIndex} className="space-y-6">
                          {/* Company Grid Row */}
                          <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                            {row.map((company: any) => (
                              <CompanyCard
                                key={company.id}
                                company={company}
                                onSelectCompany={handleSelectCompany}
                                onFollowCompany={handleFollowCompany}
                                onEditCompany={isAdmin ? handleEditCompany : undefined}
                              />
                            ))}
                          </div>
                          
                          {/* Ad placement after each row - non-logged-in users only on desktop */}
                          {!user && rowIndex < rows.length - 1 && (
                            <div key={`desktop-ad-${rowIndex}`} className="my-4 w-full">
                              <GoogleAdManager slotType="responsive_in_feed" className="w-full" />
                            </div>
                          )}
                        </div>
                      ));
                    })()}
                  </div>

                  {/* Mobile view: Show all companies with ads after every 2 */}
                  <div className="md:hidden space-y-6">
                    {currentCompanies.map((company: any, index: number) => (
                      <div key={company.id}>
                        <CompanyCard
                          company={company}
                          onSelectCompany={handleSelectCompany}
                          onFollowCompany={handleFollowCompany}
                          onEditCompany={isAdmin ? handleEditCompany : undefined}
                        />
                        
                        {/* Ad placement after every 2 companies - non-logged-in users only on mobile */}
                        {!user && (index + 1) % 2 === 0 && index < currentCompanies.length - 1 && (
                          <div key={`mobile-ad-${index}`} className="my-6 w-full">
                            <GoogleAdManager slotType="responsive_in_feed" className="w-full" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
                  <Button
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
                    {[...Array(totalPages)].map((_, i) => (
                      <Button
                        key={i + 1}
                        onClick={() => setCurrentPage(i + 1)}
                        variant={currentPage === i + 1 ? "default" : "outline"}
                        size="sm"
                        className="flex-shrink-0"
                      >
                        {i + 1}
                      </Button>
                    ))}
                  </div>
                  
                  <Button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages || totalPages === 0}
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>

              </>
            ) : (
              <div className="text-center py-12">
                <Building className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {((!user && companySearchInput.trim().length >= 2) || (user && urlSearchQuery.trim().length >= 2)) 
                    ? 'No matches found' 
                    : 'No companies available'}
                </h3>
                <p className="text-gray-600">
                  {((!user && companySearchInput.trim().length >= 2) || (user && urlSearchQuery.trim().length >= 2))
                    ? 'Try adjusting your search terms or visit /companies to see all companies'
                    : 'Companies will appear here once they are approved'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

      {/* Company Details Modal */}
      <CompanyDetailsModal
        company={selectedCompany}
        isOpen={!!selectedCompany}
        onClose={() => setSelectedCompany(null)}
      />

      {/* Company Edit Modal */}
      <Dialog open={companyEditOpen} onOpenChange={setCompanyEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Company: {editingCompany?.name}</DialogTitle>
            <DialogDescription>
              Update company information and details
            </DialogDescription>
          </DialogHeader>
          
          {editingCompany && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Company Name</label>
                  <input
                    type="text"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingCompany.name || ''}
                    onChange={(e) => setEditingCompany({...editingCompany, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Industry</label>
                  <input
                    type="text"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingCompany.industry || ''}
                    onChange={(e) => setEditingCompany({...editingCompany, industry: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  value={editingCompany.description || ''}
                  onChange={(e) => setEditingCompany({...editingCompany, description: e.target.value})}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Company Logo</label>
                <div className="mt-1 space-y-2">
                  {editingCompany.logoUrl && editingCompany.logoUrl !== 'logos/NULL' && editingCompany.logoUrl !== 'NULL' && (
                    <div className="flex items-center space-x-2">
                      <img 
                        src={resolveLogoUrl(editingCompany.logoUrl)} 
                        alt={`${editingCompany.name} logo`}
                        className="w-12 h-12 object-contain rounded border"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <span className="text-sm text-gray-600">Current logo</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => {
                      e.preventDefault();
                      const file = e.target.files?.[0];
                      console.log('Raw file from input:', file);
                      console.log('File properties:', file ? {
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        instanceof: file instanceof File
                      } : 'No file');
                      
                      if (file && file instanceof File && file.size > 0) {
                        console.log('Valid file detected, storing in ref');
                        logoFileRef.current = file;
                        // Set a flag in the company data to indicate file selected
                        setEditingCompany((prev: any) => ({...prev, hasNewLogo: true}));
                      } else {
                        console.log('Invalid or no file, clearing ref');
                        logoFileRef.current = null;
                        setEditingCompany((prev: any) => {
                          const updated = {...prev};
                          delete updated.hasNewLogo;
                          return updated;
                        });
                      }
                    }}
                  />
                  <p className="text-xs text-gray-500">Upload a new logo (JPG, PNG, GIF)</p>
                  {editingCompany?.hasNewLogo && (
                    <p className="text-xs text-green-600 font-medium">✓ New logo selected</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Website</label>
                  <input
                    type="url"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingCompany.website || ''}
                    onChange={(e) => setEditingCompany({...editingCompany, website: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <input
                    type="tel"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingCompany.phone || ''}
                    onChange={(e) => setEditingCompany({...editingCompany, phone: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <input
                    type="email"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingCompany.email || ''}
                    onChange={(e) => setEditingCompany({...editingCompany, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Location</label>
                  <input
                    type="text"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingCompany.location || ''}
                    onChange={(e) => setEditingCompany({...editingCompany, location: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Country</label>
                  <Select 
                    value={selectedCountryId || ''} 
                    onValueChange={(value) => {
                      const selectedCountry = countries.find((c: any) => c.id.toString() === value);
                      setSelectedCountryId(value);
                      setSelectedStateId(''); // Reset state when country changes
                      setEditingCompany({
                        ...editingCompany, 
                        countryId: value,
                        country: selectedCountry?.name || '',
                        stateId: '',
                        state: '',
                        cityId: '',
                        city: '',
                        zipCode: ''
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country: any) => (
                        <SelectItem key={country.id} value={country.id.toString()}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">State/Province</label>
                  <Select 
                    value={selectedStateId || ''} 
                    onValueChange={(value) => {
                      const selectedState = states.find((s: any) => s.id.toString() === value);
                      setSelectedStateId(value);
                      setEditingCompany({
                        ...editingCompany, 
                        stateId: value,
                        state: selectedState?.name || '',
                        cityId: '',
                        city: '',
                        zipCode: ''
                      });
                    }}
                    disabled={!selectedCountryId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={selectedCountryId ? "Select state/province" : "Select country first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map((state: any) => (
                        <SelectItem key={state.id} value={state.id.toString()}>
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">City</label>
                  <Select 
                    value={editingCompany.cityId || ''} 
                    onValueChange={(value) => {
                      const selectedCity = cities.find((c: any) => c.id.toString() === value);
                      setEditingCompany({
                        ...editingCompany, 
                        cityId: value,
                        city: selectedCity?.name || ''
                      });
                    }}
                    disabled={!selectedStateId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={selectedStateId ? "Select city" : "Select state first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((city: any) => (
                        <SelectItem key={city.id} value={city.id.toString()}>
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Zip/Postal Code</label>
                  <input
                    type="text"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingCompany.zipCode || editingCompany.zip_code || ''}
                    onChange={(e) => setEditingCompany({...editingCompany, zipCode: e.target.value})}
                    placeholder="Enter zip/postal code"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Employee Count</label>
                  <input
                    type="number"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingCompany.employeeCount || ''}
                    onChange={(e) => setEditingCompany({...editingCompany, employeeCount: parseInt(e.target.value) || null})}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Founded Year</label>
                  <input
                    type="number"
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingCompany.foundedYear || ''}
                    onChange={(e) => setEditingCompany({...editingCompany, foundedYear: parseInt(e.target.value) || null})}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCompanyEditOpen(false);
                    setEditingCompany(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    console.log('Attempting to save company with data:', editingCompany);
                    if (editingCompany && Object.keys(editingCompany).length > 0) {
                      // Clean the data before sending - remove invalid logoFile
                      const cleanData = {...editingCompany};
                      if (cleanData.logoFile && !(cleanData.logoFile instanceof File)) {
                        delete cleanData.logoFile;
                        console.log('Removed invalid logoFile object, sending clean data:', cleanData);
                      }
                      companyEditMutation.mutate(cleanData);
                    } else {
                      console.error('No editing company data to save');
                    }
                  }}
                  disabled={companyEditMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {companyEditMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      </div>
      
      {/* Footer - Only show for non-logged-in users */}
      {!user && <SimpleFooter />}

      {/* Back to Top Button */}
      <BackToTopButton />
    </div>
  );
}