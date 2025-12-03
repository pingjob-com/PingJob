import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Briefcase, Users, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface PendingOAuthData {
  email: string;
  firstName: string;
  lastName: string;
}

export default function AccountTypeSelection() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [pendingData, setPendingData] = useState<PendingOAuthData | null>(null);

  useEffect(() => {
    // Get pending OAuth data from session via API
    const checkPendingOAuth = async () => {
      try {
        const response = await fetch('/api/pending-oauth-data', {
          method: 'GET',
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.email) {
            setPendingData(data);
            console.log('✅ Pending OAuth data loaded:', data.email);
          } else {
            // No pending OAuth data - redirect to auth
            console.log('❌ No pending OAuth data found');
            navigate('/auth');
          }
        } else {
          console.error('Failed to fetch pending OAuth data');
          navigate('/auth');
        }
      } catch (error) {
        console.error('Error checking pending OAuth:', error);
        navigate('/auth');
      }
    };

    checkPendingOAuth();
  }, [navigate]);

  const handleAccountTypeSelect = async (accountType: 'job_seeker' | 'recruiter' | 'client') => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/complete-oauth-signup', {
        accountType
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to set account type');
      }

      const userData = await response.json();
      
      // Update React Query cache with the returned user data so frontend knows they're logged in
      queryClient.setQueryData(['/api/user'], userData);
      
      // Invalidate and refetch to ensure consistency
      await queryClient.invalidateQueries({ queryKey: ['/api/user'] });

      toast({
        title: 'Account created!',
        description: 'Your account has been set up successfully.',
      });

      // Redirect based on account type
      if (accountType === 'job_seeker') {
        navigate('/dashboard');
      } else {
        // Redirect to checkout for recruiter/enterprise
        navigate('/checkout');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error).message || 'Failed to set account type',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  if (!pendingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Welcome to PingJob!</CardTitle>
          <CardDescription className="text-lg mt-2">
            Hi {pendingData.firstName}, please choose your account type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Job Seeker */}
            <button
              onClick={() => handleAccountTypeSelect('job_seeker')}
              disabled={isLoading}
              className="group"
              data-testid="button-job-seeker"
            >
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-blue-500">
                <CardContent className="p-6 text-center">
                  <div className="flex justify-center mb-4">
                    <div className="bg-blue-100 p-4 rounded-lg group-hover:bg-blue-200 transition-colors">
                      <Briefcase className="h-8 w-8 text-blue-600" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Job Seeker</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Find and apply for job opportunities
                  </p>
                  <Button 
                    disabled={isLoading}
                    className="w-full"
                  >
                    Continue
                  </Button>
                </CardContent>
              </Card>
            </button>

            {/* Recruiter */}
            <button
              onClick={() => handleAccountTypeSelect('recruiter')}
              disabled={isLoading}
              className="group"
              data-testid="button-recruiter"
            >
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-green-500">
                <CardContent className="p-6 text-center">
                  <div className="flex justify-center mb-4">
                    <div className="bg-green-100 p-4 rounded-lg group-hover:bg-green-200 transition-colors">
                      <Users className="h-8 w-8 text-green-600" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Recruiter</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Post jobs and find candidates
                  </p>
                  <Button 
                    disabled={isLoading}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    Continue
                  </Button>
                </CardContent>
              </Card>
            </button>

            {/* Enterprise */}
            <button
              onClick={() => handleAccountTypeSelect('client')}
              disabled={isLoading}
              className="group"
              data-testid="button-enterprise"
            >
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-purple-500">
                <CardContent className="p-6 text-center">
                  <div className="flex justify-center mb-4">
                    <div className="bg-purple-100 p-4 rounded-lg group-hover:bg-purple-200 transition-colors">
                      <Building2 className="h-8 w-8 text-purple-600" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Enterprise</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Manage large-scale hiring
                  </p>
                  <Button 
                    disabled={isLoading}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    Continue
                  </Button>
                </CardContent>
              </Card>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
