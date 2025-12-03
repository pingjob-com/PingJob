import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const { user, refetch } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      console.log('🔐 Auth callback page loaded');
      
      // Check URL query parameters for redirect (passed from server)
      const urlParams = new URLSearchParams(window.location.search);
      const urlRedirect = urlParams.get('redirect');
      console.log('🔐 URL redirect parameter:', urlRedirect);
      
      console.log('🔐 Current localStorage state:', {
        postAuthRedirect: localStorage.getItem('postAuthRedirect'),
        allKeys: Object.keys(localStorage),
        localStorage: localStorage
      });
      
      // Wait a moment for the session to be available
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Refetch user data to make sure we have the latest session
      const userResult = await refetch();
      
      if (userResult?.data) {
        console.log('🔐 OAuth callback success, user:', userResult.data);
        
        // Priority 1: Check URL parameter (from server session)
        // Priority 2: Check localStorage (as fallback)
        const redirectPath = urlRedirect || localStorage.getItem('postAuthRedirect');
        console.log('🔐 Checking for redirect:', redirectPath);
        console.log('🔐 All localStorage items:', Object.keys(localStorage).map(key => `${key}: ${localStorage.getItem(key)}`));
        
        if (redirectPath) {
          console.log('🔐 REDIRECT FOUND! Going to:', redirectPath);
          localStorage.removeItem('postAuthRedirect');
          // Set timestamp to trigger auto-open of Apply Now modal
          sessionStorage.setItem('authCompleted', Date.now().toString());
          window.location.href = redirectPath;
          return;
        }
        
        // No redirect, show success message and go to dashboard
        toast({
          title: "Welcome back!",
          description: "You have successfully logged in with Google.",
        });
        
        console.log('🔐 No redirect, going to dashboard');
        window.location.href = '/dashboard';
      } else {
        // Authentication failed
        console.error('🔐 OAuth callback failed - no user data');
        toast({
          title: "Login failed",
          description: "There was an error with Google authentication.",
          variant: "destructive",
        });
        window.location.href = '/auth';
      }
    };

    handleCallback();
  }, [refetch, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Completing Login...</h2>
        <p className="text-gray-600">Please wait while we finish setting up your account.</p>
      </div>
    </div>
  );
}