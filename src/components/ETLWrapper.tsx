import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ETLProcessor } from './ETLProcessor';
import { Lock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const ETLWrapper = () => {
  const { user } = useAuth();
  const [hasUploaded, setHasUploaded] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user has already uploaded on component mount
  useEffect(() => {
    const checkUploadStatus = async () => {
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setHasUploaded(userData.hasUploaded || false);
          }
        } catch (error) {
          console.error('Error checking upload status:', error);
        }
      }
      setLoading(false);
    };

    checkUploadStatus();
  }, [user]);

  const handleUpload = async () => {
    if (!user) {
      toast.error('Please sign in to upload files');
      return;
    }

    try {
      if (user.plan === 'free') {
        // Mark user as having uploaded
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, { hasUploaded: true }, { merge: true });
        setHasUploaded(true);
      }
      toast.success('File processed successfully');
    } catch (error) {
      console.error('Error updating upload status:', error);
      toast.error('Error processing file');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (user?.plan === 'free' && hasUploaded) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center bg-white rounded-xl shadow-lg p-8">
          <Lock className="mx-auto h-12 w-12 text-indigo-600" />
          <h2 className="mt-4 text-2xl font-bold text-gray-900">Upload Limit Reached</h2>
          <p className="mt-2 text-gray-600">
            You have used your free upload. Upgrade to premium for unlimited uploads.
          </p>
          <div className="mt-6">
            <a
              href="/upgrade"
              className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Upgrade to Premium
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <ETLProcessor />;
};