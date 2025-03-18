import React, { useState, useRef, useEffect } from 'react';
import { Database, Settings, LogOut, LineChart, BarChart2, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserSettings } from './UserSettings';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setShowDropdown(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getInitials = () => {
    if (user?.displayName) {
      return user.displayName.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return user?.email?.[0].toUpperCase() || 'U';
  };

  return (
    <>
      <nav className="bg-indigo-600 fixed w-full z-10">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-center">
                <div className="relative">
                  <BarChart2 className="h-8 w-8 text-white absolute opacity-60 transform translate-x-1 translate-y-1" />
                  <Database className="h-8 w-8 text-white relative z-10" />
                </div>
                <span className="ml-2 text-white text-xl font-bold">AnalytixFlow</span>
              </div>
              
              {user && (
                <div className="flex items-center space-x-4">
                  <a
                    href="/"
                    className="text-white hover:bg-indigo-500 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    ETL Dashboard
                  </a>
                  <a
                    href="/analysis"
                    className="text-white hover:bg-indigo-500 px-3 py-2 rounded-md text-sm font-medium flex items-center"
                  >
                    <LineChart className="h-4 w-4 mr-2" />
                    Data Analysis
                  </a>
                  {user.isAdmin && (
                    <a
                      href="/admin"
                      className="text-white hover:bg-indigo-500 px-3 py-2 rounded-md text-sm font-medium flex items-center"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Admin Dashboard
                    </a>
                  )}
                </div>
              )}
            </div>

            {user && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 text-white hover:bg-indigo-500/50 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-600"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-lg">
                    {getInitials()}
                  </div>
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg py-1 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="font-medium text-gray-900 truncate">
                        {user.displayName || user.email}
                      </div>
                      {user.displayName && (
                        <div className="text-sm text-gray-500 truncate">{user.email}</div>
                      )}
                      {user.isAdmin && (
                        <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                          Admin
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setShowSettings(true);
                        setShowDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {showSettings && (
        <UserSettings onClose={() => setShowSettings(false)} />
      )}
    </>
  );
};