import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { CreditCard, Check, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

// Initialize Stripe
const stripePromise = loadStripe('your_publishable_key'); // Replace with your Stripe publishable key

const plans = [
  {
    id: 'basic',
    name: 'Basic',
    price: 29,
    features: [
      'Up to 100,000 rows',
      'Basic transformations',
      'CSV and Excel support',
      'Email support'
    ]
  },
  {
    id: 'pro',
    name: 'Professional',
    price: 99,
    features: [
      'Unlimited rows',
      'Advanced transformations',
      'All file formats',
      'Priority support',
      'Custom functions',
      'API access'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 299,
    features: [
      'Everything in Pro',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee',
      'Team collaboration',
      'Advanced security'
    ]
  }
];

export const Subscription = () => {
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (planId) => {
    if (!user) {
      toast.error('Please login to subscribe');
      return;
    }

    setLoading(true);
    try {
      // Create checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          userId: user.uid,
        }),
      });

      const { sessionId } = await response.json();
      
      // Redirect to checkout
      const stripe = await stripePromise;
      const { error } = await stripe.redirectToCheckout({
        sessionId,
      });

      if (error) {
        toast.error(error.message);
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error('Failed to process subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
          Choose Your Plan
        </h2>
        <p className="mt-4 text-lg text-gray-600">
          Select the perfect plan for your ETL needs
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-2xl shadow-xl overflow-hidden transition-transform hover:scale-105 ${
              plan.id === 'pro' ? 'border-2 border-indigo-500' : 'border border-gray-200'
            }`}
          >
            {plan.id === 'pro' && (
              <div className="absolute top-0 inset-x-0 bg-indigo-500 text-white text-center py-2 text-sm font-medium">
                Most Popular
              </div>
            )}

            <div className="p-6 bg-white h-full flex flex-col">
              <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
              <div className="mt-4 flex items-baseline text-gray-900">
                <span className="text-5xl font-extrabold tracking-tight">${plan.price}</span>
                <span className="ml-1 text-xl font-semibold">/month</span>
              </div>

              <ul className="mt-6 space-y-4 flex-1">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 shrink-0" />
                    <span className="ml-3 text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading}
                className={`mt-8 w-full px-6 py-3 rounded-lg text-white font-medium flex items-center justify-center gap-2 ${
                  plan.id === 'pro'
                    ? 'bg-indigo-600 hover:bg-indigo-700'
                    : 'bg-gray-800 hover:bg-gray-900'
                } transition-colors disabled:opacity-50`}
              >
                {loading ? (
                  'Processing...'
                ) : (
                  <>
                    <CreditCard className="h-5 w-5" />
                    Subscribe Now
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 bg-gray-50 rounded-xl p-8">
        <div className="flex items-center gap-4 mb-6">
          <Zap className="h-6 w-6 text-indigo-600" />
          <h3 className="text-xl font-semibold">Enterprise Features</h3>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h4 className="font-semibold mb-2">Dedicated Support</h4>
            <p className="text-gray-600">Get priority access to our technical team</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h4 className="font-semibold mb-2">Custom Integration</h4>
            <p className="text-gray-600">We'll help you set up custom data pipelines</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h4 className="font-semibold mb-2">Advanced Security</h4>
            <p className="text-gray-600">Enterprise-grade security and compliance</p>
          </div>
        </div>
      </div>
    </div>
  );
};