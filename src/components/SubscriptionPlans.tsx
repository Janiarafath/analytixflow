import React from 'react';
import { Check, Loader2 } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import toast from 'react-hot-toast';

const stripePromise = loadStripe('YOUR_PUBLISHABLE_KEY'); // Replace with your Stripe publishable key

interface Plan {
  id: string;
  name: string;
  price: number;
  features: string[];
}

const plans: Plan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: 9.99,
    features: [
      'Up to 1,000 rows per month',
      'Basic transformations',
      'CSV export',
      'Email support'
    ]
  },
  {
    id: 'pro',
    name: 'Professional',
    price: 29.99,
    features: [
      'Up to 100,000 rows per month',
      'Advanced transformations',
      'All export formats',
      'Priority support',
      'API access'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99.99,
    features: [
      'Unlimited rows',
      'Custom transformations',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee',
      'Team collaboration'
    ]
  }
];

export const SubscriptionPlans = () => {
  const [loading, setLoading] = React.useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    setLoading(planId);
    try {
      // In a real application, you would:
      // 1. Call your backend to create a Stripe Checkout Session
      // 2. Redirect to Stripe Checkout
      // For now, we'll just show a success message
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Subscription feature coming soon!');
    } catch (error) {
      toast.error('Failed to process subscription');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Choose Your Plan
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Select the perfect plan for your data transformation needs
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white rounded-2xl shadow-xl overflow-hidden hover:scale-105 transition-transform duration-300"
            >
              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                <p className="mt-4 text-gray-500">Starting from</p>
                <div className="mt-2 flex items-baseline">
                  <span className="text-4xl font-extrabold text-gray-900">
                    ${plan.price}
                  </span>
                  <span className="ml-2 text-gray-500">/month</span>
                </div>

                <ul className="mt-8 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center">
                      <Check className="h-5 w-5 text-green-500 mr-3" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading === plan.id}
                  className="mt-8 w-full bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading === plan.id ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Subscribe Now'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};