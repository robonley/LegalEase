import { useState, useEffect } from 'react';
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { CreditCard, CheckCircle, XCircle, DollarSign, Calendar, Users } from "lucide-react";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Subscription plans configuration
const SUBSCRIPTION_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    priceId: 'price_starter_monthly',
    description: 'Perfect for solo practitioners and small legal teams',
    features: [
      'Up to 5 legal entities',
      '10 document templates',
      'Basic cap table management',
      'Email support'
    ],
    maxEntities: 5,
    maxDocuments: 50
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 149,
    priceId: 'price_professional_monthly',
    description: 'Ideal for growing law firms with multiple clients',
    features: [
      'Up to 25 legal entities',
      '50 document templates',
      'Advanced cap table features',
      'Minute book generation',
      'Priority support'
    ],
    maxEntities: 25,
    maxDocuments: 200,
    popular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 349,
    priceId: 'price_enterprise_monthly',
    description: 'For large firms requiring unlimited capacity',
    features: [
      'Unlimited legal entities',
      'Custom document templates',
      'Advanced reporting & analytics',
      'API access',
      'Dedicated account manager'
    ],
    maxEntities: 'unlimited',
    maxDocuments: 'unlimited'
  }
];

function SubscriptionCard({ plan, currentTier, onSubscribe, loading }: any) {
  const isCurrentPlan = currentTier === plan.id;
  const isDowngrade = currentTier === 'enterprise' && plan.id !== 'enterprise';
  
  return (
    <Card className={`relative ${plan.popular ? 'ring-2 ring-blue-500' : ''}`}>
      {plan.popular && (
        <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-blue-500">
          Most Popular
        </Badge>
      )}
      <CardHeader className="text-center">
        <CardTitle className="text-xl">{plan.name}</CardTitle>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-3xl font-bold">${plan.price}</span>
          <span className="text-muted-foreground">/month</span>
        </div>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 mb-6">
          {plan.features.map((feature: string, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">{feature}</span>
            </div>
          ))}
        </div>
        
        <div className="space-y-2 mb-6 p-3 bg-muted rounded-lg">
          <div className="flex justify-between text-sm">
            <span>Legal Entities:</span>
            <span className="font-medium">{plan.maxEntities}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Documents:</span>
            <span className="font-medium">{plan.maxDocuments}</span>
          </div>
        </div>

        <Button
          data-testid={`button-subscribe-${plan.id}`}
          className="w-full"
          variant={isCurrentPlan ? "secondary" : "default"}
          disabled={isCurrentPlan || loading}
          onClick={() => onSubscribe(plan.priceId, plan.id)}
        >
          {isCurrentPlan ? 'Current Plan' : 
           isDowngrade ? 'Downgrade' : 
           'Upgrade'}
        </Button>
      </CardContent>
    </Card>
  );
}

function PaymentForm({ clientSecret, onSuccess }: { clientSecret: string; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      setIsProcessing(false);
      return;
    }

    const { error } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
      },
    });

    setIsProcessing(false);

    if (error) {
      toast({
        title: "Payment failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payment successful",
        description: "Your subscription has been activated!",
      });
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border rounded-lg">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
            },
          }}
        />
      </div>
      <Button
        data-testid="button-complete-payment"
        type="submit"
        className="w-full"
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? 'Processing...' : 'Complete Payment'}
      </Button>
    </form>
  );
}

export default function BillingSettings() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [paymentClientSecret, setPaymentClientSecret] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  // Fetch current subscription status
  const { data: subscriptionData, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['/api/subscription-status'],
  });

  // Create subscription mutation
  const createSubscriptionMutation = useMutation({
    mutationFn: async ({ priceId }: { priceId: string }) => {
      return apiRequest(`/api/create-subscription`, 'POST', { priceId });
    },
    onSuccess: (data: any) => {
      if (data.clientSecret) {
        setPaymentClientSecret(data.clientSecret);
        setShowPaymentForm(true);
      } else {
        toast({
          title: "Subscription updated",
          description: "Your subscription has been updated successfully!",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/subscription-status'] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Subscription failed",
        description: error.message || "Failed to create subscription",
        variant: "destructive",
      });
    },
  });

  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/cancel-subscription`, 'DELETE');
    },
    onSuccess: () => {
      toast({
        title: "Subscription canceled",
        description: "Your subscription will cancel at the end of the billing period.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/subscription-status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation failed",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    },
  });

  const handleSubscribe = (priceId: string, planId: string) => {
    setSelectedPlan(planId);
    createSubscriptionMutation.mutate({ priceId });
  };

  const handlePaymentSuccess = () => {
    setShowPaymentForm(false);
    setPaymentClientSecret(null);
    setSelectedPlan(null);
    queryClient.invalidateQueries({ queryKey: ['/api/subscription-status'] });
  };

  const currentTier = (subscriptionData as any)?.subscription?.status === 'active' 
    ? SUBSCRIPTION_PLANS.find(plan => plan.priceId === (subscriptionData as any)?.subscription?.items?.data?.[0]?.price?.id)?.id || 'starter'
    : 'none';

  return (
    <div className="space-y-6 p-6">
      {/* Current Subscription Status */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Billing & Subscription</h1>
        <p className="text-muted-foreground">Manage your subscription and billing preferences</p>
      </div>

      {(subscriptionData as any)?.subscription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Badge variant={(subscriptionData as any).subscription.status === 'active' ? 'default' : 'secondary'}>
                  {(subscriptionData as any).subscription.status}
                </Badge>
                <span className="text-sm text-muted-foreground">Status</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Renews {new Date((subscriptionData as any).subscription.current_period_end * 1000).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {(subscriptionData as any).subscription.cancel_at_period_end ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                <span className="text-sm">
                  {(subscriptionData as any).subscription.cancel_at_period_end ? 'Canceling' : 'Active'}
                </span>
              </div>
            </div>
            
            {!(subscriptionData as any).subscription.cancel_at_period_end && (
              <Button
                data-testid="button-cancel-subscription"
                variant="outline"
                onClick={() => cancelSubscriptionMutation.mutate()}
                disabled={cancelSubscriptionMutation.isPending}
              >
                Cancel Subscription
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Form Modal */}
      {showPaymentForm && paymentClientSecret && (
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Subscription</CardTitle>
            <CardDescription>
              Enter your payment details to activate your subscription
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Elements stripe={stripePromise}>
              <PaymentForm
                clientSecret={paymentClientSecret}
                onSuccess={handlePaymentSuccess}
              />
            </Elements>
            <Button
              data-testid="button-cancel-payment"
              variant="outline"
              className="w-full mt-2"
              onClick={() => {
                setShowPaymentForm(false);
                setPaymentClientSecret(null);
                setSelectedPlan(null);
              }}
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Subscription Plans */}
      {!showPaymentForm && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Choose Your Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <SubscriptionCard
                key={plan.id}
                plan={plan}
                currentTier={currentTier}
                onSubscribe={handleSubscribe}
                loading={createSubscriptionMutation.isPending && selectedPlan === plan.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Usage Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Current Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Legal Entities</span>
                <span className="text-sm font-medium">0 / {currentTier !== 'none' ? 
                  SUBSCRIPTION_PLANS.find(p => p.id === currentTier)?.maxEntities || '5' : '0'}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '0%' }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Generated Documents</span>
                <span className="text-sm font-medium">0 / {currentTier !== 'none' ? 
                  SUBSCRIPTION_PLANS.find(p => p.id === currentTier)?.maxDocuments || '50' : '0'}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '0%' }}></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}