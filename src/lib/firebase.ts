import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFirestore, doc, setDoc, updateDoc, increment, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

export const ADMIN_EMAIL = "admin@fznodataiq.com";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const db = getFirestore(app);

// Initialize user data with proper defaults
export const initializeUserData = async (userId: string, email: string, displayName: string | null) => {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      email,
      displayName,
      plan: email === ADMIN_EMAIL ? 'premium' : 'free',
      uploadCount: 0,
      createdAt: new Date().toISOString(),
      lastUpgradeDate: email === ADMIN_EMAIL ? new Date().toISOString() : null
    }, { merge: true }); // Use merge to prevent overwriting existing data
  } catch (error) {
    console.error('Error initializing user data:', error);
    throw error;
  }
};

// Uploads are enabled for all authenticated users.
export const canUserUpload = async (userId: string): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      // If user document doesn't exist, create it
      const user = auth.currentUser;
      if (user) {
        await initializeUserData(userId, user.email || '', user.displayName);
      }
      return true;
    }
    return true;
  } catch (error) {
    console.error('Error checking upload permission:', error);
    return true;
  }
};

// Increment the upload counter and ensure it's tracked
export const incrementUploadCount = async (userId: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      // Initialize user data if it doesn't exist
      const user = auth.currentUser;
      if (user) {
        await initializeUserData(userId, user.email || '', user.displayName);
      }
    }

    // Update the upload count
    await updateDoc(userRef, {
      uploadCount: increment(1),
      lastUploadDate: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error incrementing upload count:', error);
    throw error;
  }
};

// Get current upload count
export const getUserUploadCount = async (userId: string): Promise<number> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      // Initialize user data if it doesn't exist
      const user = auth.currentUser;
      if (user) {
        await initializeUserData(userId, user.email || '', user.displayName);
      }
      return 0;
    }

    return userDoc.data().uploadCount || 0;
  } catch (error) {
    console.error('Error getting upload count:', error);
    return 0;
  }
};

// Upgrade user to premium
export const upgradeUserToPremium = async (userId: string, paymentId: string, orderId: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    await updateDoc(userRef, {
      plan: 'premium',
      lastUpgradeDate: new Date().toISOString(),
      paymentId,
      orderId,
      upgradeTimestamp: new Date().toISOString(),
      // Set premium expiry date to 3 months from now
      premiumExpiryDate: new Date(Date.now() + (90 * 24 * 60 * 60 * 1000)).toISOString()
    });
  } catch (error) {
    console.error('Error upgrading user:', error);
    throw error;
  }
};

// Downgrade user to free
export const downgradeUserToFree = async (userId: string): Promise<void> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      plan: 'free',
      lastUpgradeDate: null,
      premiumExpiryDate: null
    });
  } catch (error) {
    console.error('Error downgrading user:', error);
    throw error;
  }
};