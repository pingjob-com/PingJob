import { useState, useEffect } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { Browser } from "@capacitor/browser";
import { CapacitorService } from "../capacitor";
import { getApiBaseUrl } from "@/lib/apiConfig";
import GoogleAdManager from "@/components/ads/GoogleAdManager";
const logo = 'https://cdn.pingjob.com/logo.png';

interface AuthFormData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  userType?: string;
  confirmPassword?: string;
}

export default function Auth() {
  const [location, setLocation] = useLocation();
  const [, params] = useRoute("/auth");
  const [activeTab, setActiveTab] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();

  // Handle mobile OAuth
  const handleGoogleAuth = async (plan?: string) => {
    if (CapacitorService.isNative()) {
      // Mobile OAuth flow using Browser plugin with custom callback
      const baseUrl = getApiBaseUrl(); // Use production server URL
      const params = new URLSearchParams({
        mobile: 'true',
        redirect_uri: 'pingjob://auth-callback'
      });
      if (plan) params.append('plan', plan);
      
      const url = `${baseUrl}/api/auth/google?${params}`;
      
      try {
        await Browser.open({
          url,
          windowName: '_system',
          presentationStyle: 'fullscreen'
        });
        
        toast({
          title: "Opening Google Login",
          description: "Please complete login in your browser.",
        });
      } catch (error) {
        console.error('Mobile OAuth error:', error);
        toast({
          title: "Login Error",
          description: "Unable to open Google login. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      // Web OAuth flow - check for redirect in localStorage and pass it along
      const redirectPath = localStorage.getItem('postAuthRedirect');
      console.log('🔐 handleGoogleAuth - redirect from localStorage:', redirectPath);
      
      const params = new URLSearchParams();
      if (plan) params.append('plan', plan);
      if (redirectPath) {
        params.append('redirect', redirectPath);
        console.log('🔐 Passing redirect to OAuth:', redirectPath);
      }
      
      const url = params.toString() ? `/api/auth/google?${params}` : '/api/auth/google';
      window.location.href = url;
    }
  };

  // Get query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get("mode") || "login";
  const plan = urlParams.get("plan") || "free";

  const [formData, setFormData] = useState<AuthFormData>({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    userType: plan === "recruiter" ? "recruiter" : plan === "client" ? "client" : "job_seeker",
    confirmPassword: ""
  });

  useEffect(() => {
    setActiveTab(mode);
  }, [mode]);

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      console.log('🔐 Attempting login for:', data.email);
      try {
        const res = await apiRequest("POST", "/api/login", data);
        console.log('🔐 Login response status:', res.status);
        
        if (!res.ok) {
          const errorData = await res.json();
          console.log('🔐 Login failed with error:', errorData);
          throw new Error(errorData.message || "Login failed");
        }
        
        const userData = await res.json();
        console.log('🔐 Login successful, user data:', userData);
        return userData;
      } catch (error) {
        console.error('🔐 Login mutation error:', error);
        throw error;
      }
    },
    onSuccess: (user) => {
      console.log('🔐 Auth page login success callback, user:', user);
      // Update the query cache immediately
      queryClient.setQueryData(["/api/user"], user);
      
      // Check for redirect FIRST
      const redirectPath = localStorage.getItem('postAuthRedirect');
      console.log('🔐 Auth page checking for redirect:', redirectPath);
      
      if (redirectPath) {
        console.log('🔐 Auth page found redirect, going to:', redirectPath);
        localStorage.removeItem('postAuthRedirect');
        // Set timestamp to trigger auto-open of Apply Now modal
        sessionStorage.setItem('authCompleted', Date.now().toString());
        setLocation(redirectPath);
        return;
      }
      
      toast({
        title: "Welcome back!",
        description: "You have been successfully logged in.",
      });
      
      // Navigate to dashboard after ensuring state updates
      console.log('🔐 Auth page no redirect, going to dashboard');
      setLocation('/dashboard');
    },
    onError: (error: Error, variables: any, context: any) => {
      console.error('🔐 Login error callback:', error.message);
      
      // Check if error is about unverified email
      if (error.message.includes("verify your email") || error.message.includes("email_verified")) {
        toast({
          title: "Email verification required",
          description: "Please verify your email before logging in. Check your inbox for verification instructions.",
          variant: "destructive",
        });
        // Redirect to verify email page
        setTimeout(() => {
          setLocation('/verify-email');
        }, 2000);
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
    mutationFn: async (data: AuthFormData) => {
      const res = await apiRequest("POST", "/api/register", {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        userType: data.userType,
        subscriptionPlan: plan
      });
      return await res.json();
    },
    onSuccess: (user) => {
      console.log('🔐 Registration success callback, user:', user);
      
      // Check if email verification is required (ALWAYS required for all user types)
      if (user.requiresEmailVerification) {
        console.log('🔐 Email verification required for user type:', user.userType);
        
        // Store user type in localStorage for post-verification redirect decision
        localStorage.setItem('pendingUserType', user.userType);
        localStorage.setItem('pendingUserData', JSON.stringify(user));
        
        toast({
          title: "Account created!",
          description: "Please verify your email address. Check your inbox for verification instructions.",
        });
        // Redirect to verify-email (not to checkout yet!)
        // After email verification, will redirect to checkout for recruiters/enterprise
        setLocation('/verify-email');
        return;
      }
      
      // If somehow email is already verified, redirect based on user type
      queryClient.setQueryData(["/api/user"], user);
      
      toast({
        title: "Account created!",
        description: "Welcome! Your account is ready.",
      });
      
      console.log('🔐 Registration success, email already verified for:', user.userType);
      setLocation("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent, type: "login" | "register") => {
    e.preventDefault();
    console.log('🔐 Form submitted, type:', type, 'email:', formData.email);
    
    if (type === "register") {
      if (formData.password !== formData.confirmPassword) {
        toast({
          title: "Passwords don't match",
          description: "Please make sure your passwords match.",
          variant: "destructive",
        });
        return;
      }
      if (formData.password.length < 6) {
        toast({
          title: "Password too short",
          description: "Password must be at least 6 characters long.",
          variant: "destructive",
        });
        return;
      }
      console.log('🔐 Calling register mutation');
      registerMutation.mutate(formData);
    } else {
      console.log('🔐 Calling login mutation for:', formData.email);
      if (!formData.email || !formData.password) {
        console.error('🔐 Missing email or password');
        toast({
          title: "Missing information",
          description: "Please enter both email and password.",
          variant: "destructive",
        });
        return;
      }
      
      loginMutation.mutate({
        email: formData.email,
        password: formData.password
      });
    }
  };

  const handleInputChange = (field: keyof AuthFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getPlanDescription = () => {
    switch (plan) {
      case "recruiter":
        return "You'll start with a 14-day free trial of Recruiter Pro ($49/month)";
      case "client":
        return "Enterprise plan - Custom pricing based on your needs";
      default:
        return "Free plan - Get started at no cost";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Link href="/">
          <div className="flex justify-center items-center space-x-2 cursor-pointer">
            <img src={logo} alt="Logo" className="h-8 w-auto" />
          </div>
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {activeTab === "login" ? "Sign in to your account" : "Create your account"}
        </h2>
        {plan !== "free" && (
          <p className="mt-2 text-center text-sm text-gray-600">
            {getPlanDescription()}
          </p>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <Card className="mb-6">
          <CardHeader className="space-y-3">
            {/* Custom tab switcher — uses flex so active button stays perfectly centered */}
            <div className="flex w-full rounded-md bg-muted p-1">
              <button
                type="button"
                onClick={() => setActiveTab("login")}
                className={`flex-1 rounded-sm py-1.5 text-sm font-medium transition-all focus:outline-none ${
                  activeTab === "login"
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("register")}
                className={`flex-1 rounded-sm py-1.5 text-sm font-medium transition-all focus:outline-none ${
                  activeTab === "register"
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign Up
              </button>
            </div>

            {activeTab === "login" ? (
              <>
                <CardTitle>Welcome back</CardTitle>
                <CardDescription>Enter your credentials to access your account</CardDescription>
              </>
            ) : (
              <>
                <CardTitle>Create account</CardTitle>
                <CardDescription>Join thousands of professionals</CardDescription>
              </>
            )}
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsContent value="login">
                {/* Google Sign In */}
                <div className="space-y-4 mb-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleGoogleAuth()}
                  >
                    <FcGoogle className="mr-2 h-4 w-4" />
                    Continue with Google
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-muted-foreground">
                        Or continue with email
                      </span>
                    </div>
                  </div>
                </div>

                <form onSubmit={(e) => handleSubmit(e, "login")} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => handleInputChange("password", e.target.value)}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>

                  <div className="text-center mt-4">
                    <Link href="/forgot-password">
                      <Button variant="link" className="text-sm text-blue-600 hover:text-blue-800">
                        Forgot your password?
                      </Button>
                    </Link>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="register">
                {/* Google Sign Up */}
                <div className="space-y-4 mb-6">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => handleGoogleAuth(plan)}
                  >
                    <FcGoogle className="mr-2 h-4 w-4" />
                    Continue with Google
                  </Button>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-muted-foreground">
                        Or continue with email
                      </span>
                    </div>
                  </div>
                </div>

                <form onSubmit={(e) => handleSubmit(e, "register")} className="space-y-4">
                  {plan !== "free" && (
                    <Alert>
                      <AlertDescription>
                        {getPlanDescription()}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange("firstName", e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => handleInputChange("lastName", e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="userType">Account Type</Label>
                    <Select 
                      value={formData.userType} 
                      onValueChange={(value) => handleInputChange("userType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="job_seeker">Job Seeker</SelectItem>
                        <SelectItem value="recruiter">Recruiter</SelectItem>
                        <SelectItem value="client">Client/Employer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => handleInputChange("password", e.target.value)}
                        required
                        minLength={6}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                        required
                        minLength={6}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      plan === "recruiter" ? "Start Free Trial" : "Create Account"
                    )}
                  </Button>

                  <p className="text-xs text-center text-gray-500">
                    By signing up, you agree to our{" "}
                    <Link href="/terms" className="text-blue-600 hover:underline">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-blue-600 hover:underline">
                      Privacy Policy
                    </Link>
                  </p>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or</span>
                </div>
              </div>

              <div className="mt-6 text-center">
                {activeTab === "login" ? (
                  <p className="text-sm text-gray-600">
                    Don't have an account?{" "}
                    <button
                      onClick={() => setActiveTab("register")}
                      className="font-medium text-blue-600 hover:text-blue-500"
                    >
                      Sign up
                    </button>
                  </p>
                ) : (
                  <p className="text-sm text-gray-600">
                    Already have an account?{" "}
                    <button
                      onClick={() => setActiveTab("login")}
                      className="font-medium text-blue-600 hover:text-blue-500"
                    >
                      Sign in
                    </button>
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-4">
          <GoogleAdManager slotType="responsive_in_feed" className="w-full" />
        </div>

        <div className="mt-8 text-center">
          <Link href="/">
            <Button variant="ghost">← Back to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}