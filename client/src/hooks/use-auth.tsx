import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User as SelectUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<any>;
  logout: () => void;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, RegisterData>;
};

type LoginData = {
  email: string;
  password: string;
};

type RegisterData = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  userType: "job_seeker" | "recruiter" | "client" | "admin";
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  const {
    data: user,
    error,
    isLoading,
    refetch: refetchUser,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false, // Don't retry failed auth requests
    staleTime: 0, // Always refetch - data is immediately stale
    gcTime: 0, // Don't cache - clear immediately after query completes
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnReconnect: true, // Refetch when connection restored
    initialData: undefined, // Force undefined initial state to prevent stale cache hydration
    refetchIntervalInBackground: false,
  });

  // Force refetch on component mount to ensure session validity on page load
  useEffect(() => {
    refetchUser();
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      if (!res.ok) {
        const errorData = await res.json();
        // If 402 payment required, throw error with special handling
        if (res.status === 402) {
          const error = new Error(errorData.message || "Payment required");
          (error as any).status = 402;
          (error as any).requiresPayment = errorData.requiresPayment;
          throw error;
        }
        throw new Error(errorData.message || "Login failed");
      }
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      if (import.meta.env.DEV) console.log('🔐 Login success callback executing, user:', user);
      
      // Update auth state
      queryClient.setQueryData(["/api/user"], user);
      
      // Check for redirect IMMEDIATELY
      const redirectPath = localStorage.getItem('postAuthRedirect');
      if (import.meta.env.DEV) console.log('🔐 Checking for redirect:', redirectPath);
      
      if (redirectPath) {
        if (import.meta.env.DEV) console.log('🔐 REDIRECT FOUND! Going to:', redirectPath);
        localStorage.removeItem('postAuthRedirect');
        window.location.href = redirectPath;
        return;
      }
      
      // No redirect, show success message and go to dashboard
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      
      if (import.meta.env.DEV) console.log('🔐 No redirect, going to dashboard');
      window.location.href = '/dashboard';
    },
    onError: (error: Error) => {
      // Handle payment required error
      if ((error as any).status === 402 && (error as any).requiresPayment) {
        console.log('🔐 Payment required - redirecting to checkout');
        toast({
          title: "Payment Required",
          description: "Please complete payment to access your account.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = '/checkout';
        }, 1000);
        return;
      }
      
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData) => {
      console.log('🔐 REGISTRATION STARTED for:', credentials.email, credentials.userType);
      if (credentials.userType === 'recruiter' || credentials.userType === 'client') {
        console.log('🔐 PREMIUM ACCOUNT DETECTED - expecting 402 response');
      }
      
      // Use direct apiRequest to handle 402 responses properly in mobile
      const res = await apiRequest("POST", "/api/register", credentials);
      
      if (import.meta.env.DEV) console.log('🔐 Registration response status:', res.status);
      
      const responseData = await res.json();
      if (import.meta.env.DEV) console.log('🔐 Registration response data:', responseData);
      
      if (!res.ok) {
        throw new Error(responseData.message || "Registration failed");
      }
      
      if (import.meta.env.DEV) console.log('🔐 Registration successful:', responseData);
      return responseData;
    },
    onSuccess: (response: any) => {
      // Handle payment redirect response
      if (response?.redirect) {
        if (import.meta.env.DEV) console.log('🔐 Payment redirect successful:', response.message);
        // Don't show toast or redirect - user is already being redirected to checkout
        return;
      }
      
      // Normal registration success
      const user = response as SelectUser;
      if (import.meta.env.DEV) console.log('🔐 Registration success, setting user data:', user);
      
      // CHECK EMAIL VERIFICATION REQUIREMENT BEFORE LOGGING IN
      if (!user.emailVerified) {
        if (import.meta.env.DEV) console.log('🔐 Email verification required - redirecting to verify page');
        
        // Store user type for post-verification redirect decision
        localStorage.setItem('pendingUserData', JSON.stringify(user));
        localStorage.setItem('pendingUserType', user.userType);
        
        toast({
          title: "Account created!",
          description: "Please verify your email address. Check your inbox for verification instructions.",
        });
        
        // Redirect to verification page (WITHOUT token - user enters OTP manually)
        setTimeout(() => {
          window.location.href = `/verify-email`;
        }, 500);
        return;
      }
      
      // Only set query cache if email is verified
      if (user.emailVerified === true) {
        if (import.meta.env.DEV) console.log('🔐 Email already verified, setting user data and logging in');
        
        // Update the query cache
        queryClient.setQueryData(["/api/user"], user);
        
        // Invalidate and refetch the user query to ensure state is synced
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      }
      
      // Check for intended job redirect
      const intendedJobId = localStorage.getItem('intendedJobId');
      if (intendedJobId && user.emailVerified === true) {
        localStorage.removeItem('intendedJobId');
        if (import.meta.env.DEV) console.log('🔐 New user, navigating to intended job:', intendedJobId);
        setTimeout(() => {
          window.location.href = `/jobs/${intendedJobId}`;
        }, 200);
        return;
      }
      
      // Don't show welcome toast if not verified yet (already showed verification required toast)
      if (user.emailVerified === true) {
        toast({
          title: "Welcome!",
          description: "Your account has been created successfully.",
        });
      }
      
      // Default redirect to dashboard only if verified, otherwise go to verify page
      if (user.emailVerified === true) {
        setTimeout(() => {
          if (import.meta.env.DEV) console.log('🔐 Redirecting to dashboard after registration');
          window.location.href = '/dashboard';
        }, 200);
      }
    },
    onError: (error: Error) => {
      if (import.meta.env.DEV) console.log('🔐 Registration mutation error:', error);
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/logout");
      if (!res.ok) {
        throw new Error("Logout failed");
      }
      // Don't parse JSON if response is empty
      try {
        return await res.json();
      } catch {
        return {}; // Return empty object if no JSON content
      }
    },
    onSuccess: async () => {
      // STEP 1: Clear auth query data FIRST to prevent cached dashboard from showing
      queryClient.setQueryData(["/api/user"], null);
      
      // STEP 2: Then invalidate all queries to force refetch on next page load
      queryClient.invalidateQueries();
      
      // STEP 3: Clear all cached data
      queryClient.removeQueries();
      
      // STEP 4: Clear IndexedDB (React Query cache might persist here)
      if (window.indexedDB) {
        try {
          const dbs = await window.indexedDB.databases();
          dbs.forEach(db => {
            if (db.name) {
              window.indexedDB.deleteDatabase(db.name);
            }
          });
          console.log('✓ IndexedDB cleared');
        } catch (err) {
          console.warn('Could not clear IndexedDB:', err);
        }
      }
      
      // STEP 5: Unregister service workers that might be caching responses
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (let registration of registrations) {
            await registration.unregister();
          }
          console.log('✓ Service workers unregistered');
        } catch (err) {
          console.warn('Could not unregister service workers:', err);
        }
      }
      
      // STEP 6: Clear browser storage but preserve some essential items
      const keysToKeep = ['theme', 'theme-preference'];
      const currentStorage: { [key: string]: string } = {};
      keysToKeep.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) currentStorage[key] = value;
      });
      
      localStorage.clear();
      sessionStorage.clear();
      
      // Restore kept keys
      Object.entries(currentStorage).forEach(([key, value]) => {
        localStorage.setItem(key, value);
      });
      
      // STEP 7: Show notification
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
      
      // STEP 8: Redirect to homepage (backend headers handle cache busting)
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logout = () => {
    logoutMutation.mutate();
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        refetch: refetchUser,
        logout,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}