import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react";
const logo = 'https://cdn.pingjob.com/logo.png';

export default function VerifyEmail() {
  const [location] = useLocation();
  const [otp, setOtp] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [verificationError, setVerificationError] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { toast } = useToast();

  // Get token from URL (for reference only, user will manually enter OTP)
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");
  
  // Get the user's email from localStorage (stored during signup)
  const getStoredEmail = () => {
    try {
      const pendingData = localStorage.getItem('pendingUserData');
      if (pendingData) {
        const userData = JSON.parse(pendingData);
        return userData.email;
      }
    } catch (error) {
      console.error('Error retrieving stored email:', error);
    }
    return "";
  };
  
  const storedEmail = getStoredEmail();

  // Cooldown timer effect
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Auto-verify if user clicks the verification link from email (token in URL)
  useEffect(() => {
    if (token && !isVerified && !verificationError) {
      verifyWithLinkMutation.mutate({ token });
    }
  }, [token]);

  const verifyOTPMutation = useMutation({
    mutationFn: async (data: { otp: string; token?: string }) => {
      const response = await apiRequest("POST", "/api/verify-email-otp", data);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to verify OTP");
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      setIsVerified(true);
      toast({
        title: "Email verified successfully!",
        description: "Your email has been verified. You are now logged in.",
      });
      
      // User is now logged in (auto-logged by backend)
      // Check user type from response to determine redirect
      const userType = data?.user?.userType || localStorage.getItem('pendingUserType');
      
      console.log("✅ Email verified - user type:", userType);
      
      if (userType && (userType === "recruiter" || userType === "client" || userType === "enterprise")) {
        console.log("✅ Recruiter/enterprise user verified - redirecting to checkout");
        // Clear localStorage and redirect to checkout
        localStorage.removeItem('pendingUserData');
        localStorage.removeItem('pendingUserType');
        setTimeout(() => {
          window.location.href = "/checkout";
        }, 1500);
      } else {
        // Job seeker - redirect to dashboard
        console.log("✅ Job seeker verified - redirecting to dashboard");
        localStorage.removeItem('pendingUserData');
        localStorage.removeItem('pendingUserType');
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1500);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const verifyWithLinkMutation = useMutation({
    mutationFn: async (data: { token: string }) => {
      const response = await apiRequest("GET", `/api/verify-email-link?token=${data.token}`);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to verify email");
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      setIsVerified(true);
      toast({
        title: "Email verified successfully!",
        description: "Your email has been verified. You are now logged in.",
      });
      
      // User is now logged in (auto-logged by backend)
      // Check user type from response to determine redirect
      const userType = data?.user?.userType || localStorage.getItem('pendingUserType');
      
      console.log("✅ Email verified (via link) - user type:", userType);
      
      if (userType && (userType === "recruiter" || userType === "client" || userType === "enterprise")) {
        console.log("✅ Recruiter/enterprise user verified - redirecting to checkout");
        // Clear localStorage and redirect to checkout
        localStorage.removeItem('pendingUserData');
        localStorage.removeItem('pendingUserType');
        setTimeout(() => {
          window.location.href = "/checkout";
        }, 1500);
      } else {
        // Job seeker - redirect to dashboard
        console.log("✅ Job seeker verified - redirecting to dashboard");
        localStorage.removeItem('pendingUserData');
        localStorage.removeItem('pendingUserType');
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1500);
      }
    },
    onError: (error: Error) => {
      setVerificationError(true);
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resendOTPMutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      const response = await apiRequest("POST", "/api/resend-verification-otp", data);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to resend OTP");
      }
      return response.json();
    },
    onSuccess: () => {
      setResendCooldown(60); // Start 1-minute cooldown
      toast({
        title: "OTP Resent!",
        description: "A new verification code has been sent to your email.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Resend Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp && !verifyOTPMutation.isPending && !isVerified) {
      verifyOTPMutation.mutate({ otp, token: token || undefined });
    }
  };

  const handleResend = () => {
    if (!storedEmail) {
      toast({
        title: "Email Not Found",
        description: "Unable to retrieve your email. Please try signing up again.",
        variant: "destructive",
      });
      return;
    }
    console.log('📧 Resending OTP to email:', storedEmail);
    resendOTPMutation.mutate({ email: storedEmail });
  };

  if (verifyWithLinkMutation.isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Link href="/">
            <div className="flex justify-center items-center space-x-2 cursor-pointer mb-6">
              <img src={logo} alt="Logo" className="h-8 w-auto" />
            </div>
          </Link>
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
            <p className="text-center text-gray-600">Verifying your email...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/">
          <div className="flex justify-center items-center space-x-2 cursor-pointer mb-6">
            <img src={logo} alt="Logo" className="h-8 w-auto" />
          </div>
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Verify your email
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter the OTP code sent to your email or use the verification link
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
            <CardTitle>Email Verification</CardTitle>
            <CardDescription className="text-blue-100">
              Complete the verification process to access your account
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            {isVerified ? (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <CheckCircle className="h-12 w-12 text-green-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">Email verified!</h3>
                <p className="text-sm text-gray-600">
                  Your email has been successfully verified. Redirecting to sign in...
                </p>
              </div>
            ) : verificationError ? (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This verification link is invalid or has expired. Please request a new one.
                  </AlertDescription>
                </Alert>
                <Link href="/auth">
                  <Button className="w-full">
                    Back to sign in
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Display - Show which email will receive verification code */}
                {storedEmail && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs font-medium text-blue-800 mb-1">Verification code will be sent to:</p>
                    <p className="text-sm font-semibold text-blue-900 break-all">{storedEmail}</p>
                  </div>
                )}

                {/* OTP Input */}
                <div>
                  <Label htmlFor="otp" className="text-sm font-medium">
                    Enter OTP Code
                  </Label>
                  <Input
                    id="otp"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.toUpperCase())}
                    placeholder="000000"
                    maxLength={6}
                    className="mt-1 text-center text-lg font-mono tracking-widest"
                    disabled={verifyOTPMutation.isPending}
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Check your email for the 6-digit code
                  </p>
                </div>

                {/* Verify Button */}
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                  disabled={!otp || verifyOTPMutation.isPending}
                >
                  {verifyOTPMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify Email"
                  )}
                </Button>

                {/* Resend OTP Button with Timer */}
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || resendOTPMutation.isPending}
                  >
                    {resendOTPMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : resendCooldown > 0 ? (
                      <>
                        Resend OTP in {resendCooldown}s
                      </>
                    ) : (
                      "Resend OTP"
                    )}
                  </Button>
                  {resendCooldown > 0 && (
                    <p className="mt-2 text-xs text-center text-gray-500">
                      You can resend after {resendCooldown} second{resendCooldown !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                {verifyOTPMutation.isError && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {(verifyOTPMutation.error as Error).message}
                    </AlertDescription>
                  </Alert>
                )}

                {resendOTPMutation.isError && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {(resendOTPMutation.error as Error).message}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="text-center pt-2">
                  <Link href="/auth">
                    <Button variant="ghost" className="text-sm">
                      Back to sign in
                    </Button>
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
