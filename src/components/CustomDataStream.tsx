import React, { useState, useEffect, useCallback } from 'react';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area } from 'recharts';
import { 
  Plus, Trash2, Play, Pause, Settings, Download, 
  Activity, Globe, Zap, Database, TrendingUp, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface CustomDataSource {
  id: string;
  name: string;
  url: string;
  type: 'api' | 'website' | 'file' | 'database';
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  refreshInterval: number; // seconds
  isActive: boolean;
  lastUpdated?: string;
  dataPoints: Array<{
    timestamp: string;
    value: number;
    label?: string;
  }>;
  jsonPath?: string; // For extracting specific data from JSON responses
}

export const CustomDataStream: React.FC = () => {
  const [dataSources, setDataSources] = useState<CustomDataSource[]>([]);
  const [newSource, setNewSource] = useState({
    name: '',
    url: '',
    type: 'api' as const,
    method: 'GET' as const,
    refreshInterval: 30,
    jsonPath: ''
  });
  const [isAdding, setIsAdding] = useState(false);
  const [streamingData, setStreamingData] = useState<Array<{source: string; data: any; timestamp: string}>>([]);

  // Add new data source
  const addDataSource = useCallback(async () => {
    if (!newSource.name || !newSource.url) {
      toast.error('Please enter both name and URL');
      return;
    }

    setIsAdding(true);
    
    try {
      // Test the connection
      const response = await fetch(newSource.url, {
        method: newSource.method,
        headers: newSource.headers || {}
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Extract value from JSON if jsonPath is specified
      let value = 0;
      if (newSource.jsonPath) {
        value = extractValueFromJSON(data, newSource.jsonPath);
      } else {
        // Try to find a numeric value in the response
        value = findNumericValue(data);
      }

      const source: CustomDataSource = {
        id: `source_${Date.now()}`,
        name: newSource.name,
        url: newSource.url,
        type: newSource.type,
        method: newSource.method,
        headers: newSource.headers,
        refreshInterval: newSource.refreshInterval,
        isActive: true,
        lastUpdated: new Date().toISOString(),
        dataPoints: [{
          timestamp: new Date().toISOString(),
          value,
          label: newSource.name
        }],
        jsonPath: newSource.jsonPath
      };

      setDataSources(prev => [...prev, source]);
      
      // Reset form
      setNewSource({
        name: '',
        url: '',
        type: 'api',
        method: 'GET',
        refreshInterval: 30,
        jsonPath: ''
      });

      toast.success(`✅ Added: ${newSource.name}`, { icon: '🔗' });
      
    } catch (error) {
      console.error('Error adding data source:', error);
      toast.error(`❌ Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAdding(false);
    }
  }, [newSource]);

  // Extract value from JSON using simple path notation
  const extractValueFromJSON = (data: any, path: string): number => {
    try {
      const keys = path.split('.');
      let value = data;
      
      for (const key of keys) {
        if (key.includes('[') && key.includes(']')) {
          // Handle array access like data[0].price
          const [arrayKey, indexStr] = key.split('[');
          const index = parseInt(indexStr.replace(']', ''));
          value = value[arrayKey]?.[index];
        } else {
          value = value?.[key];
        }
      }
      
      return typeof value === 'number' ? value : parseFloat(String(value)) || 0;
    } catch {
      return 0;
    }
  };

  // Find first numeric value in JSON
  const findNumericValue = (data: any): number => {
    if (typeof data === 'number') return data;
    if (typeof data === 'string') return parseFloat(data) || 0;
    
    if (Array.isArray(data)) {
      for (const item of data) {
        const num = findNumericValue(item);
        if (num !== 0) return num;
      }
    }
    
    if (typeof data === 'object' && data !== null) {
      for (const key in data) {
        const num = findNumericValue(data[key]);
        if (num !== 0) return num;
      }
    }
    
    return 0;
  };

  // Start streaming for a data source
  const startStreaming = useCallback((sourceId: string) => {
    const source = dataSources.find(s => s.id === sourceId);
    if (!source) return;

    console.log(`🚀 Starting stream for: ${source.name}`);

    const interval = setInterval(async () => {
      try {
        const response = await fetch(source.url, {
          method: source.method,
          headers: source.headers || {}
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        let value = 0;
        
        if (source.jsonPath) {
          value = extractValueFromJSON(data, source.jsonPath);
        } else {
          value = findNumericValue(data);
        }

        setDataSources(prev => prev.map(s => {
          if (s.id === sourceId) {
            return {
              ...s,
              lastUpdated: new Date().toISOString(),
              dataPoints: [...s.dataPoints.slice(-50), {
                timestamp: new Date().toISOString(),
                value,
                label: s.name
              }]
            };
          }
          return s;
        }));

        setStreamingData(prev => [{
          source: source.name,
          data: { value, timestamp: new Date().toISOString() },
          timestamp: new Date().toISOString()
        }, ...prev.slice(0, 19)]);

      } catch (error) {
        console.error(`Streaming error for ${source.name}:`, error);
      }
    }, source.refreshInterval * 1000);

    // Store interval ID (in real app, you'd manage this better)
    (source as any).intervalId = interval;
    
    toast.success(`🚀 Streaming started: ${source.name}`);
  }, [dataSources]);

  // Stop streaming for a data source
  const stopStreaming = useCallback((sourceId: string) => {
    const source = dataSources.find(s => s.id === sourceId);
    if (!source) return;

    if ((source as any).intervalId) {
      clearInterval((source as any).intervalId);
    }

    setDataSources(prev => prev.map(s => 
      s.id === sourceId ? { ...s, isActive: false } : s
    ));

    toast.success(`🛑 Stopped: ${source.name}`);
  }, [dataSources]);

  // Remove data source
  const removeDataSource = useCallback((sourceId: string) => {
    const source = dataSources.find(s => s.id === sourceId);
    if (!source) return;

    if ((source as any).intervalId) {
      clearInterval((source as any).intervalId);
    }

    setDataSources(prev => prev.filter(s => s.id !== sourceId));
    toast.success(`🗑️ Removed: ${source.name}`);
  }, [dataSources]);

  // Export data
  const exportData = useCallback((sourceId: string) => {
    const source = dataSources.find(s => s.id === sourceId);
    if (!source) return;

    const csvContent = [
      ['Timestamp', 'Value', 'Label'],
      ...source.dataPoints.map(point => [
        point.timestamp,
        point.value.toString(),
        point.label || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${source.name.replace(/[^a-z0-9]/gi, '_')}_data.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success(`📊 Exported: ${source.name}`);
  }, [dataSources]);

  // Prepare chart data
  const chartData = dataSources.flatMap(source => 
    source.dataPoints.map(point => ({
      timestamp: new Date(point.timestamp).toLocaleTimeString(),
      value: point.value,
      source: source.name
    }))
  ).sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🔗 Custom Data Streams</h1>
          <p className="text-gray-600 mt-1">Add ANY website or API for real-time data streaming</p>
        </div>
      </div>

      {/* Add New Data Source */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-blue-600" />
          Add Data Source
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Source Name (e.g., Bitcoin Price)"
            value={newSource.name}
            onChange={(e) => setNewSource(prev => ({ ...prev, name: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          
          <input
            type="url"
            placeholder="API URL or Website (e.g., https://api.coindesk.com/v1/price/btc)"
            value={newSource.url}
            onChange={(e) => setNewSource(prev => ({ ...prev, url: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          
          <select
            value={newSource.type}
            onChange={(e) => setNewSource(prev => ({ ...prev, type: e.target.value as any }))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="api">🔌 API Endpoint</option>
            <option value="website">🌐 Website</option>
            <option value="file">📄 File URL</option>
            <option value="database">🗄️ Database</option>
          </select>
          
          <select
            value={newSource.method}
            onChange={(e) => setNewSource(prev => ({ ...prev, method: e.target.value as any }))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
          </select>
          
          <input
            type="number"
            placeholder="Refresh Interval (seconds)"
            value={newSource.refreshInterval}
            onChange={(e) => setNewSource(prev => ({ ...prev, refreshInterval: parseInt(e.target.value) || 30 }))}
            min="5"
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          
          <input
            type="text"
            placeholder="JSON Path (e.g., data.price or result[0].value)"
            value={newSource.jsonPath}
            onChange={(e) => setNewSource(prev => ({ ...prev, jsonPath: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <button
          onClick={addDataSource}
          disabled={isAdding || !newSource.name || !newSource.url}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {isAdding ? (
            <>
              <Activity className="w-4 h-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Add Data Source
            </>
          )}
        </button>
      </div>

      {/* Example APIs */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
        <h3 className="text-lg font-semibold mb-4">🚀 Try These Example APIs:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-blue-700 mb-2">💰 Crypto/Stock APIs:</h4>
            <ul className="space-y-1 text-gray-700">
              <li>• <code>https://api.coindesk.com/v1/price/btc</code></li>
              <li>• <code>https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT</code></li>
              <li>• <code>https://api.kraken.com/0/public/Ticker?pair=BTCUSD</code></li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-purple-700 mb-2">🌤️ Weather APIs:</h4>
            <ul className="space-y-1 text-gray-700">
              <li>• <code>https://api.openweathermap.org/data/2.5/weather?q=London&appid=YOUR_KEY</code></li>
              <li>• <code>https://api.weatherapi.com/v1/current.json?key=YOUR_KEY&q=London</code></li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-green-700 mb-2">📊 Data APIs:</h4>
            <ul className="space-y-1 text-gray-700">
              <li>• <code>https://api.nasa.gov/planetary/apod</code></li>
              <li>• <code>https://api.github.com/users/octocat</code></li>
              <li>• <code>https://jsonplaceholder.typicode.com/posts/1</code></li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-orange-700 mb-2">🏪 Business APIs:</h4>
            <ul className="space-y-1 text-gray-700">
              <li>• <code>https://api.stripe.com/v1/balance</code></li>
              <li>• <code>https://api.twilio.com/2010-04-01/Accounts</code></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Active Data Sources */}
      {dataSources.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-green-600" />
            Active Data Sources ({dataSources.length})
          </h3>
          
          <div className="space-y-3">
            {dataSources.map((source) => (
              <div key={source.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">{source.name}</span>
                    <div className={`w-2 h-2 rounded-full ${source.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className="text-xs text-gray-500">
                      {source.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>📡 {source.url}</p>
                    <p>⏱️ Every {source.refreshInterval}s | 📊 {source.dataPoints.length} points</p>
                    {source.lastUpdated && (
                      <p>🕐 Last: {new Date(source.lastUpdated).toLocaleTimeString()}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {source.isActive ? (
                    <button
                      onClick={() => stopStreaming(source.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                      title="Stop streaming"
                    >
                      <Pause className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => startStreaming(source.id)}
                      className="p-2 text-green-600 hover:bg-green-100 rounded-lg"
                      title="Start streaming"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => exportData(source.id)}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                    title="Export data"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => removeDataSource(source.id)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                    title="Remove source"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Real-time Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Live Data Stream
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <Line data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload[0]) {
                    return (
                      <div className="bg-white p-3 border rounded-lg shadow-lg">
                        <p className="font-medium">{payload[0].payload.source}</p>
                        <p className="text-sm">Value: {payload[0].payload.value}</p>
                        <p className="text-xs text-gray-500">{payload[0].payload.timestamp}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#8B5CF6" 
                strokeWidth={2}
                dot={false}
              />
            </Line>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Updates */}
      {streamingData.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">📡 Recent Updates</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {streamingData.map((update, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Zap className="w-4 h-4 text-yellow-500" />
                <div className="flex-1">
                  <p className="font-medium">{update.source}</p>
                  <p className="text-sm text-gray-600">Value: {update.data.value}</p>
                  <p className="text-xs text-gray-500">{new Date(update.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
