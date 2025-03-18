"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import {
  type User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
} from "firebase/auth"
import { auth, ADMIN_EMAIL, db } from "../lib/firebase"
import { doc, getDoc, setDoc, updateDoc, increment } from "firebase/firestore"

interface UserData extends User {
  isAdmin?: boolean
  plan?: "free" | "premium"
  uploadCount?: number
  lastUpgradeDate?: string
}

interface AuthContextType {
  user: UserData | null
  loading: boolean
  signup: (email: string, password: string, name: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateUserProfile: (name: string) => Promise<void>
  updateUserPassword: (newPassword: string) => Promise<void>
  incrementUploadCount: () => Promise<void>
  canUpload: () => boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Get user data from Firestore
        const userRef = doc(db, "users", user.uid)
        const userDoc = await getDoc(userRef)
        const userData = userDoc.data()

        const enhancedUser: UserData = {
          ...user,
          isAdmin: user.email === ADMIN_EMAIL,
          plan: userData?.plan || "free",
          uploadCount: userData?.uploadCount || 0,
          lastUpgradeDate: userData?.lastUpgradeDate || null,
        }
        setUser(enhancedUser)
      } else {
        setUser(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const signup = async (email: string, password: string, name: string) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(user, { displayName: name })

    // Initialize user data in Firestore
    const userRef = doc(db, "users", user.uid)
    await setDoc(userRef, {
      email,
      displayName: name,
      plan: email === ADMIN_EMAIL ? "premium" : "free",
      uploadCount: 0,
      createdAt: new Date().toISOString(),
      lastUpgradeDate: email === ADMIN_EMAIL ? new Date().toISOString() : null,
    })
  }

  const login = async (email: string, password: string) => {
    const { user } = await signInWithEmailAndPassword(auth, email, password)

    // Check if user document exists, if not create it
    const userRef = doc(db, "users", user.uid)
    const userDoc = await getDoc(userRef)

    if (!userDoc.exists()) {
      await setDoc(userRef, {
        email,
        displayName: user.displayName,
        plan: email === ADMIN_EMAIL ? "premium" : "free",
        uploadCount: 0,
        createdAt: new Date().toISOString(),
        lastUpgradeDate: email === ADMIN_EMAIL ? new Date().toISOString() : null,
      })
    }
  }

  const logout = () => signOut(auth)

  const updateUserProfile = async (name: string) => {
    if (!auth.currentUser) throw new Error("No user logged in")
    await updateProfile(auth.currentUser, { displayName: name })

    // Update Firestore document
    const userRef = doc(db, "users", auth.currentUser.uid)
    await setDoc(userRef, { displayName: name }, { merge: true })
  }

  const updateUserPassword = async (newPassword: string) => {
    if (!auth.currentUser) throw new Error("No user logged in")
    await updatePassword(auth.currentUser, newPassword)
  }

  const incrementUploadCount = async () => {
    if (!user) throw new Error("No user logged in")
    const userRef = doc(db, "users", user.uid)

    // Update Firestore document
    await updateDoc(userRef, {
      uploadCount: increment(1),
    })

    // Update local user state
    setUser((prevUser) => {
      if (prevUser) {
        return {
          ...prevUser,
          uploadCount: (prevUser.uploadCount || 0) + 1,
        }
      }
      return prevUser
    })
  }

  const canUpload = () => {
    if (!user) return false
    if (user.plan === "premium") return true
    return (user.uploadCount || 0) < 1
  }

  const value = {
    user,
    loading,
    signup,
    login,
    logout,
    updateUserProfile,
    updateUserPassword,
    incrementUploadCount,
    canUpload,
  }

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>
}
