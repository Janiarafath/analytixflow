import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { Navbar } from './components/Navbar';
import { ETLWrapper } from './components/ETLWrapper';
import { DataAnalysis } from './components/DataAnalysis';
import { Homepage } from './components/Homepage';
import { Auth } from './components/Auth';
import { AdminDashboard } from './components/AdminDashboard';
import { UpgradePage } from './components/UpgradePage';
import { useAuth } from './contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { initEmailJS } from './lib/emailjs';

// Initialize EmailJS
initEmailJS();

function LoadingSpinner() {
  return (
    <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto" />
        <p className="mt-2 text-lg font-medium text-gray-900">Loading...</p>
      </div>
    </div>
  );
}

function AuthenticatedApp() {
  const { user } = useAuth();
  const [path, setPath] = useState(window.location.pathname);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handlePathChange = () => {
      setLoading(true);
      setPath(window.location.pathname);
      setTimeout(() => {
        setLoading(false);
      }, 500);
    };

    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (anchor && anchor.href && anchor.href.startsWith(window.location.origin)) {
        e.preventDefault();
        const newPath = new URL(anchor.href).pathname;
        if (newPath !== path) {
          window.history.pushState({}, '', newPath);
          handlePathChange();
        }
      }
    });

    window.addEventListener('popstate', handlePathChange);

    return () => {
      window.removeEventListener('popstate', handlePathChange);
    };
  }, [path]);

  if (!user) {
    if (path === '/auth') {
      return <Auth />;
    }
    if (path === '/upgrade') {
      return <UpgradePage />;
    }
    return <Homepage />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      {loading && <LoadingSpinner />}
      <div className="pt-16">
        {path === '/admin' && user.isAdmin ? (
          <AdminDashboard />
        ) : path === '/analysis' ? (
          <DataAnalysis />
        ) : path === '/upgrade' ? (
          <UpgradePage />
        ) : (
          <ETLWrapper />
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <AuthenticatedApp />
    </AuthProvider>
  );
}

export default App;