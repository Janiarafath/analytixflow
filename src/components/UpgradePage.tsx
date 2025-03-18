import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Zap, Shield, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const RAZORPAY_KEY_ID = 'rzp_test_NM3kAvMtz1t9bc';

export const UpgradePage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.crossOrigin = 'anonymous';
      script.onload = () => resolve(true);
      script.onerror = () => {
        toast.error('Failed to load Razorpay SDK. Please check your internet connection.');
        resolve(false);
      };
      document.body.appendChild(script);
    });
  };

  const handlePaymentSuccess = async () => {
    try {
      // Update user to premium in Firestore
      const userRef = doc(db, 'users', user!.uid);
      await updateDoc(userRef, {
        plan: 'premium',
        lastUpgradeDate: new Date().toISOString()
      });

      // Show success state
      setShowSuccess(true);
      toast.success('Successfully upgraded to premium!');

      // Redirect after 3 seconds
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update premium status. Please contact support.');
    }
  };

  const handlePayment = async () => {
    if (!user) {
      toast.error('Please sign in to upgrade');
      return;
    }

    setLoading(true);

    try {
      const res = await loadRazorpayScript();
      
      if (!res) {
        throw new Error('Razorpay SDK failed to load');
      }

      // Create order options
      const options = {
        key: RAZORPAY_KEY_ID,
        amount: 50000, // ₹500 in paise
        currency: 'INR',
        name: 'AnalytixFlow Premium',
        description: '3 Months Premium Access',
        image: 'https://www.fzno.in/favicon.ico',
        prefill: {
          name: user.displayName || '',
          email: user.email || '',
        },
        theme: {
          color: '#4F46E5'
        },
        handler: function() {
          handlePaymentSuccess();
        },
        modal: {
          ondismiss: function() {
            toast.error('Payment cancelled');
            setLoading(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to initialize payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Success overlay component
  const SuccessOverlay = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h3>
        <p className="text-gray-600 mb-4">
          Your account has been upgraded to premium. You'll be redirected to the dashboard in a few seconds.
        </p>
        <div className="animate-pulse">
          <Loader2 className="h-6 w-6 text-indigo-600 mx-auto" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 py-12 px-4 sm:px-6 lg:px-8">
      {showSuccess && <SuccessOverlay />}
      <div className="max-w-4xl mx-auto">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Home
        </a>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-white sm:text-4xl">
            Upgrade to Premium
          </h1>
          <p className="mt-3 text-xl text-white/80">
            Unlock unlimited uploads and advanced features
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden border border-white/20">
          <div className="md:flex">
            {/* Benefits Section */}
            <div className="bg-indigo-900/40 p-8 md:w-2/5">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center">
                <Zap className="h-5 w-5 mr-2" />
                Premium Benefits
              </h2>
              
              <ul className="space-y-4">
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-white">Unlimited file uploads</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-white">Advanced data transformations</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-white">AI-powered data insights</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-white">Priority customer support</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-white">Export in multiple formats</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" />
                  <span className="text-white">API access for automation</span>
                </li>
              </ul>

              <div className="mt-8 p-4 bg-white/10 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Shield className="h-5 w-5 text-white" />
                  <h3 className="font-medium text-white">Premium Plan</h3>
                </div>
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold text-white">₹500</span>
                  <span className="ml-1 text-white/70">/3 months</span>
                </div>
                <p className="mt-2 text-sm text-white/70">
                  One-time payment for 3 months of premium access
                </p>
              </div>
            </div>

            {/* Payment Section */}
            <div className="p-8 md:w-3/5">
              <h2 className="text-xl font-bold text-white mb-6">
                Get Premium Access
              </h2>

              <div className="bg-white/10 p-6 rounded-lg border border-white/20 mb-8">
                <p className="text-white mb-6">
                  Upgrade to premium instantly with secure payment through Razorpay. 
                  Your account will be upgraded immediately after successful payment.
                </p>
                
                <button
                  onClick={handlePayment}
                  disabled={loading}
                  className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-indigo-700 bg-white hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white transition-colors disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Pay ₹500 and Upgrade
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </button>
              </div>

              <div className="bg-indigo-800/30 p-4 rounded-lg border border-white/10">
                <h3 className="font-medium text-white mb-2">What happens next?</h3>
                <ol className="list-decimal list-inside text-white/80 space-y-2">
                  <li>Click the payment button above</li>
                  <li>Complete the secure payment with Razorpay</li>
                  <li>Your account will be instantly upgraded</li>
                  <li>Start enjoying premium features immediately</li>
                  <li>You'll receive a confirmation email with payment details</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};