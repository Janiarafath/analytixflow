import React, { useState } from 'react';
import { Settings, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const SetupWizard = () => {
  const [config, setConfig] = useState({
    account: '',
    username: '',
    password: '',
    database: '',
    warehouse: ''
  });
  const [testing, setTesting] = useState(false);

  const testConnection = async () => {
    setTesting(true);
    try {
      // In a real application, you would send these credentials to your backend
      // The backend would then establish the Snowflake connection
      // For now, we'll just simulate the connection
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Store credentials (except password) in localStorage
      localStorage.setItem('snowflake_config', JSON.stringify({
        account: config.account,
        username: config.username,
        database: config.database,
        warehouse: config.warehouse
      }));
      
      toast.success('Configuration saved successfully!');
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Failed to save configuration');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-6 w-6 text-indigo-600" />
        <h2 className="text-xl font-semibold">Snowflake Configuration</h2>
      </div>

      <div className="space-y-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="font-medium text-blue-800">Important Note</h3>
              <p className="mt-2 text-sm text-blue-700">
                For security reasons, Snowflake connections should be handled through a backend server.
                Please set up a backend service to handle the actual Snowflake connection.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Account"
            value={config.account}
            onChange={(e) => setConfig({ ...config, account: e.target.value })}
            className="rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          <input
            type="text"
            placeholder="Username"
            value={config.username}
            onChange={(e) => setConfig({ ...config, username: e.target.value })}
            className="rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={config.password}
            onChange={(e) => setConfig({ ...config, password: e.target.value })}
            className="rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          <input
            type="text"
            placeholder="Database"
            value={config.database}
            onChange={(e) => setConfig({ ...config, database: e.target.value })}
            className="rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
          <input
            type="text"
            placeholder="Warehouse"
            value={config.warehouse}
            onChange={(e) => setConfig({ ...config, warehouse: e.target.value })}
            className="rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <button
          onClick={testConnection}
          disabled={testing}
          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {testing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Saving Configuration...
            </>
          ) : (
            'Save Configuration'
          )}
        </button>
      </div>
    </div>
  );
};