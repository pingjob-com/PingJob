import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState, useRef } from 'react';
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Check, Loader2, CreditCard, Shield, Clock, LogOut, AlertCircle } from "lucide-react";
const logo = 'https://cdn.pingjob.com/logo.png';

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = ({ plan, billingPeriod }: { plan: string; billingPeriod: 'monthly' | 'yearly' }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    if (!stripe || !elements) {
      return;
    }

    try {
      console.log('💳 Submitting payment...');
      
      // Confirm payment with Stripe
      const result = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: {
          return_url: `${window.location.origin}/checkout`,
        },
      });

      // If we get here without error, payment was successful (no redirect needed)
      if (result.error) {
        console.error('❌ Payment error:', result.error);
        toast({
          title: "Payment Failed",
          description: result.error.message,
          variant: "destructive",
        });
        setIsProcessing(false);
      } else if (result.paymentIntent?.status === 'succeeded') {
        // Payment succeeded without additional auth required
        console.log('✅ Payment confirmed successfully!', result.paymentIntent);
        
        // Now call the backend to complete the checkout and update the database
        try {
          console.log('📝 Finalizing subscription in database...');
          const completeRes = await apiRequest('POST', '/api/checkout-complete', { 
            billingPeriod: billingPeriod 
          });
          const completeData = await completeRes.json();
          
          if (completeData.success) {
            console.log('✅ Subscription activated in database!', completeData);
            setIsSuccess(true);
            toast({
              title: "Payment Successful!",
              description: "Your subscription has been activated. Redirecting to dashboard...",
            });
            
            // Redirect to dashboard with success
            setTimeout(() => {
              setLocation('/dashboard');
            }, 2000);
          } else {
            throw new Error(completeData.message || 'Failed to activate subscription');
          }
        } catch (completeError) {
          console.error('❌ Error finalizing subscription:', completeError);
          toast({
            title: "Payment Completed",
            description: "Payment was successful but there was an issue activating your subscription. Our support team will resolve this shortly.",
            variant: "destructive",
          });
          // Still redirect after a delay
          setTimeout(() => {
            setLocation('/dashboard');
          }, 3000);
        }
      } else {
        // Payment is still processing or requires additional confirmation
        console.log('⏳ Payment processing:', result.paymentIntent?.status);
        toast({
          title: "Processing Payment",
          description: "Your payment is being processed. Please wait...",
        });
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('❌ Checkout error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-green-100 p-6">
            <Check className="h-12 w-12 text-green-600" />
          </div>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Payment Successful!</h3>
          <p className="text-gray-600">Your subscription has been activated. Redirecting to your dashboard...</p>
        </div>
        <div className="flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 bg-gray-50 rounded-lg">
        <PaymentElement />
      </div>
      
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <Shield className="h-4 w-4" />
        <span>Your payment information is secured with 256-bit SSL encryption</span>
      </div>

      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || isProcessing}
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Start Subscription
          </>
        )}
      </Button>

      <p className="text-xs text-center text-gray-500">
        By confirming your subscription, you allow PingJob to charge your card for this payment and future payments in accordance with their terms.
      </p>
    </form>
  );
};

const CheckoutHeader = () => {
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/">
            <img src={logo} alt="PingJob" className="h-8 w-auto cursor-pointer" />
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-gray-600 hover:text-gray-900"
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
};

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [hasValidSession, setHasValidSession] = useState<boolean | null>(null);
  const [plan, setPlan] = useState<string>("recruiter");
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [isRenewingSession, setIsRenewingSession] = useState(false);
  const { toast } = useToast();

  // Case 1: Protect route: redirect non-logged-in users to login
  useEffect(() => {
    if (!authLoading && !user) {
      console.log('🔐 Case 1: User not authenticated, redirecting to login');
      setLocation('/auth');
    }
  }, [user, authLoading, setLocation]);

  // Case 3: Check if user already has active subscription
  const isAlreadyPaid = user && (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'completed');

  // Case 2: Handle expired session with "Continue Payment" option
  const handleContinuePayment = async () => {
    setIsRenewingSession(true);
    try {
      const renewRes = await apiRequest('POST', '/api/checkout-session/renew', {});
      const renewData = await renewRes.json();
      
      if (renewData.success) {
        console.log('✅ Checkout session renewed:', renewData.sessionId);
        setSessionExpired(false);
        setIsLoading(false);
        toast({
          title: "Session Renewed",
          description: "Your checkout session has been renewed. Please complete your payment.",
        });
      } else {
        throw new Error(renewData.message || 'Failed to renew session');
      }
    } catch (error) {
      console.error('❌ Error renewing session:', error);
      toast({
        title: "Error",
        description: "Failed to renew checkout session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRenewingSession(false);
    }
  };

  // Get plan from URL parameters, localStorage, or user's actual subscription plan
  useEffect(() => {
    const getPlan = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlPlan = urlParams.get("plan");
        const pendingUserType = localStorage.getItem('pendingUserType');
        
        if (urlPlan) {
          setPlan(urlPlan);
          return;
        }
        
        if (pendingUserType) {
          setPlan(pendingUserType);
          return;
        }
        
        // Fetch user's actual subscription plan from backend
        const userRes = await fetch('/api/user', { credentials: 'include' });
        if (userRes.ok) {
          const user = await userRes.json();
          // Convert userType to subscription plan: recruiter/client -> recruiter/client, enterprise -> client
          const actualPlan = user.subscriptionPlan || "recruiter";
          setPlan(actualPlan);
        }
      } catch (error) {
        console.error('Failed to fetch user plan:', error);
      }
    };
    
    getPlan();
  }, []);

  // Single effect to handle both validation and Stripe redirect - runs ONLY on mount
  useEffect(() => {
    let mounted = true;
    let redirectTimer: NodeJS.Timeout | null = null;
    
    const initializeCheckout = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const redirectStatus = urlParams.get("redirect_status");
        const isStripeRedirect = redirectStatus === 'succeeded';
        
        // HANDLE STRIPE REDIRECT - Complete payment immediately
        if (isStripeRedirect) {
          console.log('✅ Stripe redirect detected - completing payment immediately...');
          if (mounted) setShowSuccessScreen(true);
          
          // Complete the payment right away
          try {
            const completeRes = await apiRequest('POST', '/api/checkout-complete', { billingPeriod });
            const completeData = await completeRes.json();
            console.log('✅ Payment completed from checkout:', {
              success: completeData.success,
              user: completeData.user
            });
          } catch (error) {
            console.error('Error completing payment:', error);
          }
          
          // Redirect to dashboard after showing success - use window.location for reliable redirect
          redirectTimer = setTimeout(() => {
            if (mounted) {
              console.log('🔄 Redirecting to dashboard...');
              window.location.href = '/dashboard';
            }
          }, 1000);
          return;
        }
        
        // Case 2: Validate checkout session - Check if session is still valid or expired
        console.log('🔍 Validating checkout session...');
        try {
          const sessionValidRes = await fetch('/api/checkout-session-valid', { credentials: 'include' });
          const sessionValidData = await sessionValidRes.json();
          
          if (sessionValidRes.ok && sessionValidData.success) {
            console.log('✅ Checkout session is valid:', sessionValidData.message);
            if (mounted) {
              setHasValidSession(true);
              setSessionExpired(false);
            }
          } else {
            // Session validation failed or session expired
            console.log('❌ Checkout session invalid or expired:', sessionValidData.message);
            if (mounted) {
              setSessionExpired(true);
              setHasValidSession(false);
              setIsLoading(false);
            }
          }
        } catch (error) {
          console.error('❌ Session validation error:', error);
          if (mounted) {
            setSessionExpired(true);
            setHasValidSession(false);
          }
        }
      } catch (error) {
        console.error('❌ Initialization error:', error);
        if (mounted) {
          setHasValidSession(false);
        }
      }
    };

    initializeCheckout();
    
    return () => {
      mounted = false;
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [billingPeriod]); // Include billingPeriod to use correct value

  const planDetails = {
    recruiter: {
      name: "Recruiter",
      subtitle: "For recruiting professionals and HR teams",
      price: billingPeriod === 'monthly' ? "$19" : "$190",
      period: billingPeriod === 'monthly' ? "month" : "year",
      features: [
        "Post up to 10 jobs per month",
        "Access to candidate database",
        "Advanced search filters",
        "Resume parsing and ranking",
        "Candidate application management",
        "Interview scheduling tools",
        "Team collaboration features",
        "Analytics and reporting",
        "Priority email support"
      ],
      limitations: [
        "Limited to 10 job postings",
        "Basic analytics only"
      ] as const
    },
    client: {
      name: "Enterprise Client",
      subtitle: "For large organizations with high-volume hiring needs",
      price: billingPeriod === 'monthly' ? "$299" : "$2990",
      period: billingPeriod === 'monthly' ? "month" : "year",
      features: [
        "Unlimited job postings",
        "Full access to candidate database",
        "Advanced analytics and insights",
        "Custom branding options",
        "API access for integrations",
        "Dedicated account manager",
        "Priority phone and email support",
        "Custom reporting dashboard",
        "Vendor management system",
        "Bulk operations and automation",
        "Advanced security features",
        "Onboarding and training"
      ],
      limitations: [] as const
    }
  };

  const currentPlan = planDetails[plan as keyof typeof planDetails];

  useEffect(() => {
    // Skip if this is a Stripe redirect (handled by initialization effect)
    const urlParams = new URLSearchParams(window.location.search);
    const redirectStatus = urlParams.get("redirect_status");
    if (redirectStatus === 'succeeded') {
      return;
    }
    
    // Create PaymentIntent as soon as the page loads
    apiRequest("POST", "/api/create-subscription", { plan, billingPeriod })
      .then((res) => res.json())
      .then((data) => {
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          throw new Error("Failed to initialize payment");
        }
      })
      .catch((error) => {
        toast({
          title: "Payment Setup Failed",
          description: "Unable to initialize payment. Please try again.",
          variant: "destructive",
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [plan, billingPeriod, toast]);

  // Show success screen for Stripe redirect
  if (showSuccessScreen) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CheckoutHeader />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex items-center justify-center">
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 p-6">
                <Check className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Payment Successful!</h3>
              <p className="text-gray-600">Your subscription has been activated. Redirecting to your dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Verifying your session...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect is already triggered, show loading
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Case 3: If user already has active subscription, show "Already Purchased" screen
  if (isAlreadyPaid) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CheckoutHeader />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex items-center justify-center">
          <Card className="max-w-lg w-full">
            <CardContent className="text-center p-8">
              <div className="flex justify-center mb-6">
                <div className="rounded-full bg-blue-100 p-4">
                  <Check className="h-12 w-12 text-blue-600" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Subscription Active</h3>
              <p className="text-gray-600 mb-6">You already have an active subscription. Your payment plan is fully activated.</p>
              <Button 
                onClick={() => setLocation('/dashboard')}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="button-back-to-dashboard-from-checkout"
              >
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Case 2: If checkout session has expired, show "Payment Incomplete" screen
  if (sessionExpired) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CheckoutHeader />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex items-center justify-center">
          <Card className="max-w-lg w-full">
            <CardContent className="text-center p-8">
              <div className="flex justify-center mb-6">
                <div className="rounded-full bg-orange-100 p-4">
                  <AlertCircle className="h-12 w-12 text-orange-600" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Payment Incomplete</h3>
              <p className="text-gray-600 mb-6">Your checkout session has expired. Please continue with your payment to activate your subscription.</p>
              <Button 
                onClick={handleContinuePayment}
                disabled={isRenewingSession}
                className="bg-blue-600 hover:bg-blue-700 w-full"
                data-testid="button-continue-payment"
              >
                {isRenewingSession ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Renewing Session...
                  </>
                ) : (
                  'Continue Payment'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show loading only while actually loading form data (not during validation)
  if (isLoading && !showSuccessScreen) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  // If session is invalid, redirect has already been triggered
  if (hasValidSession === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center p-6">
            <p className="text-red-600 mb-4">Invalid checkout session. Redirecting...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center p-6">
            <p className="text-red-600 mb-4">Unable to initialize payment</p>
            <Link href="/pricing">
              <Button>Back to Pricing</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CheckoutHeader />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Subscription</h1>
          <p className="text-gray-600">Get started with PingJob today</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Plan Summary */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{currentPlan.name}</CardTitle>
                {currentPlan.subtitle && (
                  <p className="text-sm text-gray-600 mt-1">{currentPlan.subtitle}</p>
                )}
                <div className="mt-4 flex items-center space-x-4">
                  <span className={`text-sm font-medium ${billingPeriod === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
                    Monthly
                  </span>
                  <button
                    onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'yearly' : 'monthly')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      billingPeriod === 'yearly' ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                    data-testid="button-billing-period-toggle"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        billingPeriod === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className={`text-sm font-medium ${billingPeriod === 'yearly' ? 'text-gray-900' : 'text-gray-500'}`}>
                    Yearly
                  </span>
                </div>
                <div className="text-2xl font-bold mt-4">
                  {currentPlan.price}
                  <span className="text-sm font-normal text-gray-500">/{currentPlan.period}</span>
                </div>
                {billingPeriod === 'yearly' && (
                  <p className="text-sm text-green-600 mt-2">
                    Save {Math.round((1 - 1/12) * 100)}% with yearly billing
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">What's included:</h4>
                  <ul className="space-y-2">
                    {currentPlan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="h-4 w-4 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {currentPlan.limitations && currentPlan.limitations.length > 0 && (
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <h4 className="font-medium text-orange-800 mb-2">Limitations:</h4>
                    <ul className="space-y-1">
                      {currentPlan.limitations.map((limitation, index) => (
                        <li key={index} className="text-sm text-orange-700">
                          • {limitation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Payment Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Payment Information</CardTitle>
                <p className="text-sm text-gray-600">
                  Complete your payment to activate your subscription immediately.
                </p>
              </CardHeader>
              <CardContent>
                <Elements stripe={stripePromise} options={{ 
                  clientSecret,
                  appearance: {
                    theme: 'stripe',
                    variables: {
                      colorPrimary: '#3b82f6',
                    }
                  }
                }}>
                  <CheckoutForm plan={plan} billingPeriod={billingPeriod} />
                </Elements>
              </CardContent>
            </Card>

            <div className="mt-6 text-center">
              <Link href="/pricing">
                <Button variant="ghost">← Back to Pricing</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
