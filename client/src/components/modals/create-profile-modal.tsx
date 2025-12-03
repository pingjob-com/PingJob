import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Check } from "lucide-react";

const profileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  headline: z.string().optional(),
  summary: z.string().optional(),
  location: z.string().optional(),
  industry: z.string().optional(),
  categoryId: z.number().nullable().optional()
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface CreateProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function CreateProfileModal({ 
  isOpen, 
  onClose, 
  onComplete 
}: CreateProfileModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchCategory, setSearchCategory] = useState('');
  const [showCreateCategory, setShowCreateCategory] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      categoryId: null
    }
  });

  const categoryId = watch('categoryId');

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories']
  });

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchCategory.trim()) return categories;
    return categories.filter((cat: any) =>
      cat.name.toLowerCase().includes(searchCategory.toLowerCase())
    );
  }, [categories, searchCategory]);

  const hasExactMatch = filteredCategories.some((cat: any) =>
    cat.name.toLowerCase() === searchCategory.toLowerCase()
  );

  const createProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to update profile');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile updated successfully",
        description: "Your professional profile has been updated"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.removeQueries({ queryKey: ['/api/profile'], exact: false });
      queryClient.refetchQueries({ queryKey: ['/api/profile'], exact: false });
      setSearchCategory('');
      setShowCreateCategory(false);
      onComplete();
      setTimeout(() => onClose(), 500);
    },
    onError: (error: any) => {
      console.error('Profile update error:', error);
      toast({
        title: "Error updating profile",
        description: error?.message || "Please try again",
        variant: "destructive"
      });
    }
  });

  const onSubmit = (data: ProfileFormData) => {
    createProfileMutation.mutate(data);
  };

  const industries = [
    "Technology",
    "Healthcare",
    "Finance",
    "Education",
    "Manufacturing",
    "Retail",
    "Marketing",
    "Consulting",
    "Real Estate",
    "Media",
    "Non-profit",
    "Government",
    "Other"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-hidden flex flex-col sm:w-full sm:max-w-[600px]">
        <DialogHeader className="flex-shrink-0 pb-2 border-b">
          <DialogTitle className="text-lg sm:text-xl">Complete Your Profile</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Let's set up your professional profile to get the most out of PingJob.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6 overflow-y-auto flex-1 px-2 sm:px-0">
          {/* Name Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm sm:text-base">First Name</Label>
              <Input
                id="firstName"
                placeholder="First name"
                className="text-sm sm:text-base"
                {...register('firstName')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm sm:text-base">Last Name</Label>
              <Input
                id="lastName"
                placeholder="Last name"
                className="text-sm sm:text-base"
                {...register('lastName')}
              />
            </div>
          </div>

          {/* Professional Headline */}
          <div className="space-y-2">
            <Label htmlFor="headline" className="text-sm sm:text-base">Professional Headline</Label>
            <Input
              id="headline"
              placeholder="e.g., Senior Software Engineer"
              className="text-sm sm:text-base"
              {...register('headline')}
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="text-sm sm:text-base">Location</Label>
            <Input
              id="location"
              placeholder="e.g., San Francisco, CA"
              className="text-sm sm:text-base"
              {...register('location')}
            />
          </div>

          {/* Industry */}
          <div className="space-y-2">
            <Label htmlFor="industry" className="text-sm sm:text-base">Industry</Label>
            <Select onValueChange={(value) => setValue('industry', value)}>
              <SelectTrigger className="text-sm sm:text-base">
                <SelectValue placeholder="Select your industry" />
              </SelectTrigger>
              <SelectContent>
                {industries.map((industry) => (
                  <SelectItem key={industry} value={industry}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Professional Category - Collapsible */}
          <div className="border rounded-lg p-3 sm:p-4">
            <button
              type="button"
              onClick={() => setShowCreateCategory(!showCreateCategory)}
              className="w-full text-left font-medium text-sm sm:text-base hover:text-blue-600 transition-colors flex items-center justify-between"
            >
              <span>
                Professional Category (Optional)
                {categoryId && <span className="text-xs text-blue-600 ml-2">✓ Selected</span>}
              </span>
              <span className={`text-lg transition-transform ${showCreateCategory ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>

            {showCreateCategory && (
              <div className="space-y-3 mt-3 pt-3 border-t">
                <Input
                  placeholder="Search categories..."
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value)}
                  className="w-full text-sm"
                />
                
                {filteredCategories.length > 0 || searchCategory.trim() ? (
                  <div className="border rounded-md max-h-40 overflow-y-auto">
                    {filteredCategories.map((cat: any) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setValue('categoryId', cat.id);
                          setSearchCategory('');
                          setShowCreateCategory(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between transition-colors ${
                          categoryId === cat.id ? 'bg-blue-100' : ''
                        }`}
                      >
                        <span>{cat.name}</span>
                        {categoryId === cat.id && <Check className="h-4 w-4 text-blue-600" />}
                      </button>
                    ))}
                    
                    {searchCategory.trim() && !hasExactMatch && (
                      <button
                        type="button"
                        onClick={() => setShowCreateCategory(true)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 flex items-center gap-2 text-green-600 font-medium border-t transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        Create "{searchCategory}"
                      </button>
                    )}
                  </div>
                ) : null}
                
                {categoryId && !searchCategory && (
                  <div className="text-xs sm:text-sm text-gray-600 bg-blue-50 p-2 rounded">
                    Selected: <span className="font-medium">{categories.find((c: any) => c.id === categoryId)?.name}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="space-y-2">
            <Label htmlFor="summary" className="text-sm sm:text-base">About You (Optional)</Label>
            <Textarea
              id="summary"
              placeholder="Tell us about your professional background, skills, and career goals..."
              rows={3}
              className="text-sm sm:text-base"
              {...register('summary')}
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 justify-end pt-2 sm:pt-4 flex-shrink-0 border-t mt-2 sm:mt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="text-sm sm:text-base w-full sm:w-auto"
            >
              Skip for Now
            </Button>
            <Button 
              type="submit" 
              disabled={createProfileMutation.isPending}
              className="bg-linkedin-blue hover:bg-linkedin-dark text-sm sm:text-base w-full sm:w-auto"
            >
              {createProfileMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Complete Profile
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
