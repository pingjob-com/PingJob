import { useEffect, useState } from 'react';
import { useLocation, useRoute, Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, CheckCircle, XCircle, Users, Eye, EyeOff } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
const logo = 'https://cdn.pingjob.com/logo.png';

interface InvitationData {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  message: string | null;
  inviterUserId: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export default function InvitationAccept() {
  const [, params] = useRoute('/invite/:token');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [registrationData, setRegistrationData] = useState({
    firstName: '',
    lastName: '',
    userType: 'job_seeker',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (params?.token) {
      fetchInvitation(params.token);
    }
  }, [params?.token]);

  const fetchInvitation = async (token: string) => {
    try {
      const response = await fetch(`/api/external-invitations/${token}/details`);
      if (response.ok) {
        const data = await response.json();
        setInvitation(data);
        setRegistrationData(prev => ({
          ...prev,
          firstName: data.firstName || '',
          lastName: data.lastName || ''
        }));
      } else {
        setError('Invitation not found or expired');
      }
    } catch (err) {
      setError('Failed to load invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!params?.token) return;
    
    if (registrationData.password !== registrationData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }

    if (registrationData.password.length < 6) {
      toast({
        title: "Error", 
        description: "Password must be at least 6 characters",
        variant: "destructive"
      });
      return;
    }

    setAccepting(true);

    // For premium accounts (recruiter/client), redirect to checkout BEFORE calling API
    if (registrationData.userType === 'recruiter' || registrationData.userType === 'client') {
      console.log('🔐 PREMIUM ACCOUNT FROM INVITATION - redirecting to checkout');
      localStorage.setItem('pendingUserData', JSON.stringify({
        email: invitation?.email,
        firstName: registrationData.firstName,
        lastName: registrationData.lastName,
        password: registrationData.password,
        invitationToken: params.token
      }));
      localStorage.setItem('pendingUserType', registrationData.userType);
      window.location.href = '/checkout';
      return;
    }

    // For job seekers, create account and auto-login
    try {
      // Accept invitation and create account
      const response = await apiRequest('POST', `/api/external-invitations/${params.token}/accept`, {
        firstName: registrationData.firstName,
        lastName: registrationData.lastName,
        userType: registrationData.userType,
        password: registrationData.password
      });

      if (response.ok) {
        setSuccess(true);
        toast({
          title: "Welcome to PingJob!",
          description: "Your account has been created successfully"
        });
        
        // Redirect to home page after 2 seconds for job seekers (auto-logged in)
        setTimeout(() => {
          setLocation('/');
        }, 2000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to accept invitation');
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to accept invitation",
        variant: "destructive"
      });
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-600">Invalid Invitation</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setLocation('/')} 
              className="w-full"
              variant="outline"
            >
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-green-600">Welcome to PingJob!</CardTitle>
            <CardDescription>
              Your account has been created successfully. You'll be redirected to login shortly.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Header with Logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/">
          <div className="flex justify-center items-center space-x-2 cursor-pointer mb-6">
            <img src={logo} alt="Logo" className="h-8 w-auto" />
          </div>
        </Link>
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
          Join PingJob
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          You've been invited to join our professional networking platform
        </p>
        <p className="mt-2 text-center text-sm font-semibold text-gray-900">
          {invitation?.email}
        </p>
      </div>

      {/* Form Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardContent className="space-y-4 p-6">
            {/* Personal Message */}
            {invitation?.message && (
              <div className="bg-blue-50 border-l-4 border-blue-500 rounded p-4 mb-6">
                <p className="text-xs font-semibold text-blue-600 uppercase mb-2">Message from Inviter</p>
                <p className="text-sm text-blue-800 italic">"{invitation.message}"</p>
              </div>
            )}

            {/* Form */}
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleAcceptInvitation(); }}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={registrationData.firstName}
                    onChange={(e) => setRegistrationData(prev => ({
                      ...prev,
                      firstName: e.target.value
                    }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={registrationData.lastName}
                    onChange={(e) => setRegistrationData(prev => ({
                      ...prev,
                      lastName: e.target.value
                    }))}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="userType">Account Type</Label>
                <Select 
                  value={registrationData.userType} 
                  onValueChange={(value) => setRegistrationData(prev => ({
                    ...prev,
                    userType: value
                  }))}
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
                    value={registrationData.password}
                    onChange={(e) => setRegistrationData(prev => ({
                      ...prev,
                      password: e.target.value
                    }))}
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
                    value={registrationData.confirmPassword}
                    onChange={(e) => setRegistrationData(prev => ({
                      ...prev,
                      confirmPassword: e.target.value
                    }))}
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
                disabled={accepting || !registrationData.firstName || !registrationData.lastName || !registrationData.password}
              >
                {accepting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>

              <p className="text-xs text-center text-gray-500">
                By signing up, you agree to our{" "}
                <Link href="/terms" className="text-blue-600 hover:underline">
                  Terms of Service
                </Link>
                {" "}and{" "}
                <Link href="/privacy" className="text-blue-600 hover:underline">
                  Privacy Policy
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}