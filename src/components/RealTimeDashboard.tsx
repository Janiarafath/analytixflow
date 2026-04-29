import React, { useState, useEffect, useRef } from 'react';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, TrendingUp, AlertTriangle, Users, DollarSign, Zap, Download } from 'lucide-react';
import toast from 'react-hot-toast';

interface RealTimeDataPoint {
  timestamp: string;
  value: number;
  category?: string;
}

interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  color: string;
}

interface AnomalyAlert {
  id: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
}

export const RealTimeDashboard: React.FC = () => {
  const [isLive, setIsLive] = useState(false);
  const [realTimeData, setRealTimeData] = useState<RealTimeDataPoint[]>([]);
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyAlert[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');
    const ws = useRef<WebSocket | null>(null);

  // Simulate real-time data generation
  const generateRealTimeData = () => {
    const now = new Date();
    const newDataPoint: RealTimeDataPoint = {
      timestamp: now.toLocaleTimeString(),
      value: Math.floor(Math.random() * 100) + 50,
      category: ['Sales', 'Users', 'Revenue', 'Orders'][Math.floor(Math.random() * 4)]
    };
    
    setRealTimeData(prev => [...prev.slice(-50), newDataPoint]);
    
    // Update metrics
    setMetrics([
      {
        title: 'Live Users',
        value: Math.floor(Math.random() * 1000) + 500,
        change: Math.random() * 20 - 10,
        icon: <Users className="w-5 h-5" />,
        color: 'text-blue-600'
      },
      {
        title: 'Revenue Today',
        value: `$${(Math.random() * 10000 + 5000).toFixed(0)}`,
        change: Math.random() * 30 - 15,
        icon: <DollarSign className="w-5 h-5" />,
        color: 'text-green-600'
      },
      {
        title: 'Conversion Rate',
        value: `${(Math.random() * 5 + 2).toFixed(1)}%`,
        change: Math.random() * 2 - 1,
        icon: <TrendingUp className="w-5 h-5" />,
        color: 'text-purple-600'
      },
      {
        title: 'Active Sessions',
        value: Math.floor(Math.random() * 500) + 200,
        change: Math.random() * 50 - 25,
        icon: <Activity className="w-5 h-5" />,
        color: 'text-orange-600'
      }
    ]);

    // Simulate anomaly detection
    if (Math.random() > 0.95) {
      const anomaly: AnomalyAlert = {
        id: Date.now().toString(),
        message: [
          'Unusual spike in user activity detected',
          'Revenue drop of 25% compared to yesterday',
          'Server response time increased by 300%',
          'Failed transaction rate exceeded threshold'
        ][Math.floor(Math.random() * 4)],
        severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as 'low' | 'medium' | 'high',
        timestamp: now
      };
      setAnomalies(prev => [anomaly, ...prev.slice(0, 4)]);
      toast.error(`Anomaly Detected: ${anomaly.message}`, {
        duration: 5000,
        icon: '⚠️'
      });
    }
  };

  // Start/Stop real-time streaming
  const toggleLiveStream = () => {
    if (isLive) {
      setIsLive(false);
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    } else {
      setIsLive(true);
      toast.success('Real-time streaming started', {
        icon: '📡'
      });
    }
  };

  // Real-time data simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isLive) {
      interval = setInterval(generateRealTimeData, 2000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLive]);

  // WebSocket connection for real external data
  useEffect(() => {
    if (isLive) {
      // Simulate WebSocket connection
      try {
        ws.current = new WebSocket('wss://api.example.com/realtime');
        
        ws.current.onopen = () => {
          console.log('WebSocket connected for real-time data');
        };
        
        ws.current.onmessage = (event) => {
          const data = JSON.parse(event.data);
          console.log('WebSocket data received:', data);
        };
        
        ws.current.onerror = (error) => {
          console.error('WebSocket error:', error);
          toast.error('Real-time connection lost');
        };
        
      } catch (error) {
        console.log('WebSocket simulation - using generated data instead');
      }
    }
    
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [isLive]);

  // Export real-time data
  const exportData = () => {
    const csvContent = [
      ['Timestamp', 'Value', 'Category'],
      ...realTimeData.map(point => [point.timestamp, point.value, point.category || ''])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `realtime-data-${new Date().toISOString()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('Real-time data exported');
  };

  const pieData = [
    { name: 'Desktop', value: 45, color: '#3B82F6' },
    { name: 'Mobile', value: 35, color: '#10B981' },
    { name: 'Tablet', value: 20, color: '#F59E0B' }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Real-Time Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Live data streaming and anomaly detection system</p>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="5m">Last 5 minutes</option>
            <option value="15m">Last 15 minutes</option>
            <option value="1h">Last hour</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
          </select>
          <button
            onClick={toggleLiveStream}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              isLive 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              {isLive ? (
                <>
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                  Stop Streaming
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Start Live Stream
                </>
              )}
            </div>
          </button>
          <button
            onClick={exportData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Anomaly Alerts */}
      {anomalies.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-red-900">Recent Anomaly Alerts</h3>
          </div>
          <div className="space-y-2">
            {anomalies.map(anomaly => (
              <div
                key={anomaly.id}
                className={`p-3 rounded-lg border-l-4 ${
                  anomaly.severity === 'high' ? 'bg-red-100 border-red-500' :
                  anomaly.severity === 'medium' ? 'bg-yellow-100 border-yellow-500' :
                  'bg-blue-100 border-blue-500'
                }`}
              >
                <div className="flex justify-between items-start">
                  <p className="text-sm font-medium">{anomaly.message}</p>
                  <span className={`text-xs px-2 py-1 rounded ${
                    anomaly.severity === 'high' ? 'bg-red-600 text-white' :
                    anomaly.severity === 'medium' ? 'bg-yellow-600 text-white' :
                    'bg-blue-600 text-white'
                  }`}>
                    {anomaly.severity.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {anomaly.timestamp.toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <div key={index} className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{metric.value}</p>
                <div className="flex items-center gap-1 mt-2">
                  {metric.change > 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />
                  )}
                  <span className={`text-sm font-medium ${
                    metric.change > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className={metric.color}>
                {metric.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-time Line Chart */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Real-Time Activity</h3>
          <ResponsiveContainer width="100%" height={300}>
            <Line data={realTimeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </Line>
          </ResponsiveContainer>
        </div>

        {/* Device Distribution Pie Chart */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Device Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => `${entry.name} ${(entry.percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stream Status */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            }`} />
            <span className="text-sm font-medium">
              {isLive ? 'Live Stream Active' : 'Stream Inactive'}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            {realTimeData.length} data points collected
          </div>
        </div>
      </div>
    </div>
  );
};
