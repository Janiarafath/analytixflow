import React, { useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { CreditCard, Upload, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { sendUpgradeRequestWithProof } from '../lib/emailjs-upgrade';

export const UpgradeRequestForm: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: user?.displayName || '',
    email: user?.email || '',
    phone: '',
    company: '',
    message: ''
  });
  const formRef = useRef<HTMLFormElement>(null);

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setPaymentProof(acceptedFiles[0]);
      toast.success('Payment proof uploaded');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!paymentProof) {
      toast.error('Please upload payment proof');
      return;
    }
    
    setLoading(true);
    
    try {
      // Prepare user data
      const userData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        company: formData.company,
        userId: user?.uid || 'Not logged in',
        message: formData.message
      };
      
      // Send email with payment proof
      const response = await sendUpgradeRequestWithProof(userData, paymentProof);
      
      if (response.status === 200) {
        toast.success('Upgrade request submitted successfully!');
        // Reset form
        setFormData({
          name: user?.displayName || '',
          email: user?.email || '',
          phone: '',
          company: '',
          message: ''
        });
        setPaymentProof(null);
      } else {
        throw new Error('Email sending failed');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Failed to submit upgrade request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Request Premium Upgrade</h2>
      
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Full Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Phone Number (WhatsApp)
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="company" className="block text-sm font-medium text-gray-700">
            Company (Optional)
          </label>
          <input
            type="text"
            id="company"
            name="company"
            value={formData.company}
            onChange={handleChange}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700">
            Additional Information (Optional)
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            rows={3}
            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Payment Information
          </label>
          
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <CreditCard className="h-5 w-5 text-indigo-600" />
              <h3 className="font-medium text-gray-900">Payment QR Code</h3>
            </div>
            <div className="flex flex-col items-center">
              <img 
                src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://example.com/payment" 
                alt="Payment QR Code" 
                className="w-40 h-40 bg-white p-2 rounded-lg mb-2"
              />
              <p className="text-sm text-gray-600 text-center">
                Scan this QR code to make payment via your preferred payment app
              </p>
            </div>
          </div>

          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
              isDragActive 
                ? 'border-indigo-500 bg-indigo-50' 
                : 'border-gray-300 hover:border-indigo-500 hover:bg-gray-50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className={`mx-auto h-10 w-10 ${isDragActive ? 'text-indigo-600' : 'text-gray-400'}`} />
            <p className="mt-2 text-gray-600">
              {paymentProof 
                ? `File selected: ${paymentProof.name}` 
                : 'Drag & drop payment proof, or click to select'}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Supports JPG, PNG, PDF (Max 5MB)
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-70"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
              Processing...
            </>
          ) : (
            <>
              Submit Upgrade Request
              <ArrowRight className="ml-2 h-5 w-5" />
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-sm text-gray-500 text-center">
        After submitting your request, our team will verify your payment and upgrade your account within 24 hours.
      </p>
    </div>
  );
};