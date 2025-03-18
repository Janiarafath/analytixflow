"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Users, UserCheck, UserX, RefreshCw, Search } from "lucide-react"
import { toast } from "react-hot-toast"
import { getFirestore, collection, onSnapshot } from "firebase/firestore"
import { useAuth } from "../contexts/AuthContext"
import { upgradeUserToPremium, downgradeUserToFree } from "../lib/firebase"

interface UserData {
  id: string
  email: string
  displayName: string | null
  plan: "free" | "premium"
  uploadCount: number
  lastUpgradeDate?: string
}

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth()
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    if (!user || !user.isAdmin) {
      setLoading(false)
      return
    }

    const db = getFirestore()
    const usersRef = collection(db, "users")

    const unsubscribe = onSnapshot(
      usersRef,
      (snapshot) => {
        const userData: UserData[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          userData.push({
            id: doc.id,
            email: data.email || "",
            displayName: data.displayName || null,
            plan: data.plan || "free",
            uploadCount: data.uploadCount || 0,
            lastUpgradeDate: data.lastUpgradeDate,
          })
        })
        setUsers(userData)
        setLoading(false)
      },
      (error) => {
        console.error("Error fetching users:", error)
        toast.error("Failed to load users")
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [user])

  const handleUpgradeUser = async (userId: string) => {
    try {
      await upgradeUserToPremium(userId)
      toast.success("User upgraded to premium successfully")
    } catch (error) {
      console.error("Error upgrading user:", error)
      toast.error("Failed to upgrade user")
    }
  }

  const handleDowngradeUser = async (userId: string) => {
    try {
      await downgradeUserToFree(userId)
      toast.success("User downgraded to free successfully")
    } catch (error) {
      console.error("Error downgrading user:", error)
      toast.error("Failed to downgrade user")
    }
  }

  const filteredUsers = users
    .filter((user) => {
      if (filter === "free") return user.plan === "free"
      if (filter === "premium") return user.plan === "premium"
      return true
    })
    .filter(
      (user) =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.displayName && user.displayName.toLowerCase().includes(searchTerm.toLowerCase())),
    )

  if (!user || !user.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl font-semibold text-red-600">Access Denied. Admin privileges required.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="all">All Users</option>
            <option value="free">Free Users</option>
            <option value="premium">Premium Users</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uploads
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Upgrade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{user.email}</div>
                      {user.displayName && <div className="text-sm text-gray-500">{user.displayName}</div>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.plan === "premium" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.uploadCount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.lastUpgradeDate ? new Date(user.lastUpgradeDate).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.plan === "free" ? (
                      <button
                        onClick={() => handleUpgradeUser(user.id)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        Upgrade to Premium
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDowngradeUser(user.id)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                      >
                        <UserX className="h-4 w-4 mr-1" />
                        Downgrade to Free
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter settings.</p>
          </div>
        )}
      </div>
    </div>
  )
}