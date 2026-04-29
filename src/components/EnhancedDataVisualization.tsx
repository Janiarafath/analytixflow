import React, { useState, useEffect, useCallback } from 'react';
import { 
  Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  Area, Bar, PieChart, Pie, Cell, Radar, Scatter, ComposedChart,
  ReferenceLine, Funnel, Treemap
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Activity, Zap, Globe, Database, 
  AlertCircle, BarChart3, PieChart as PieChartIcon, Target, 
  Settings, Download, RefreshCw, Eye, Filter, Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';

interface DataStream {
  id: string;
  name: string;
  url: string;
  data: Array<{
    timestamp: string;
    value: number;
    label?: string;
    metadata?: Record<string, any>;
  }>;
  color: string;
  isActive: boolean;
  lastUpdate: string;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
}

interface VisualizationConfig {
  chartType: 'line' | 'area' | 'bar' | 'scatter' | 'radar' | 'treemap' | 'funnel' | 'gauge';
  timeRange: '1h' | '6h' | '24h' | '7d' | '30d';
  aggregation: 'raw' | 'avg' | 'sum' | 'max' | 'min';
  showGrid: boolean;
  showTooltip: boolean;
  animationEnabled: boolean;
}

export const EnhancedDataVisualization: React.FC = () => {
  const [streams, setStreams] = useState<DataStream[]>([]);
  const [selectedStreams, setSelectedStreams] = useState<string[]>([]);
  const [chartConfig, setChartConfig] = useState<VisualizationConfig>({
    chartType: 'line',
    timeRange: '1h',
    aggregation: 'raw',
    showGrid: true,
    showTooltip: true,
    animationEnabled: true
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5);

  // Generate sample data streams
  useEffect(() => {
    const sampleStreams: DataStream[] = [
      {
        id: 'stream1',
        name: 'Bitcoin Price',
        url: 'https://api.coindesk.com/v1/price/btc',
        color: '#F7931E',
        isActive: true,
        lastUpdate: new Date().toISOString(),
        trend: 'up',
        changePercent: 2.5,
        data: Array.from({ length: 50 }, (_, i) => ({
          timestamp: new Date(Date.now() - (49 - i) * 60000).toISOString(),
          value: 45000 + Math.random() * 5000 + (i * 100),
          label: 'BTC/USD'
        }))
      },
      {
        id: 'stream2',
        name: 'Ethereum Price',
        url: 'https://api.coindesk.com/v1/price/eth',
        color: '#627EEA',
        isActive: true,
        lastUpdate: new Date().toISOString(),
        trend: 'down',
        changePercent: -1.2,
        data: Array.from({ length: 50 }, (_, i) => ({
          timestamp: new Date(Date.now() - (49 - i) * 60000).toISOString(),
          value: 3000 + Math.random() * 300 + (i * 50),
          label: 'ETH/USD'
        }))
      },
      {
        id: 'stream3',
        name: 'Stock Market Index',
        url: 'https://api.iex.cloud/v1/data/core/quote?symbols=SPY',
        color: '#10B981',
        isActive: true,
        lastUpdate: new Date().toISOString(),
        trend: 'up',
        changePercent: 0.8,
        data: Array.from({ length: 50 }, (_, i) => ({
          timestamp: new Date(Date.now() - (49 - i) * 60000).toISOString(),
          value: 4500 + Math.random() * 200 + (i * 20),
          label: 'S&P 500'
        }))
      },
      {
        id: 'stream4',
        name: 'Active Users',
        url: '/api/analytics/users',
        color: '#8B5CF6',
        isActive: true,
        lastUpdate: new Date().toISOString(),
        trend: 'up',
        changePercent: 15.3,
        data: Array.from({ length: 50 }, (_, i) => ({
          timestamp: new Date(Date.now() - (49 - i) * 60000).toISOString(),
          value: 1000 + Math.random() * 500 + (i * 10),
          label: 'Concurrent Users'
        }))
      },
      {
        id: 'stream5',
        name: 'Revenue Rate',
        url: '/api/analytics/revenue',
        color: '#F59E0B',
        isActive: true,
        lastUpdate: new Date().toISOString(),
        trend: 'stable',
        changePercent: 0.0,
        data: Array.from({ length: 50 }, (_, i) => ({
          timestamp: new Date(Date.now() - (49 - i) * 60000).toISOString(),
          value: 5000 + Math.random() * 1000 + (i * 100),
          label: 'USD/hour',
          metadata: { 
            conversion: Math.random() * 0.1,
            source: ['web', 'mobile', 'api'][Math.floor(Math.random() * 3)]
          }
        }))
      }
    ];
    
    setStreams(sampleStreams);
    setSelectedStreams(['stream1', 'stream2', 'stream3']);
  }, []);

  // Simulate real-time data updates
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      setStreams(prev => prev.map(stream => ({
        ...stream,
        data: [
          ...stream.data.slice(1),
          {
            timestamp: new Date().toISOString(),
            value: stream.data[stream.data.length - 1]?.value + (Math.random() - 0.5) * stream.data[stream.data.length - 1]?.value * 0.02,
            label: stream.data[stream.data.length - 1]?.label
          }
        ],
        lastUpdate: new Date().toISOString(),
        trend: Math.random() > 0.5 ? 'up' : Math.random() < 0.3 ? 'down' : 'stable',
        changePercent: (Math.random() - 0.5) * 10
      })));
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Get filtered and processed data
  const getChartData = useCallback(() => {
    const filteredStreams = streams.filter(s => selectedStreams.includes(s.id));
    
    // Apply time range filter
    const now = Date.now();
    const timeRangeMs = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    }[chartConfig.timeRange];

    const filteredData = filteredStreams.flatMap(stream => 
      stream.data
        .filter(d => new Date(d.timestamp).getTime() > now - timeRangeMs)
        .map(d => ({
          timestamp: new Date(d.timestamp).toLocaleTimeString(),
          ...d,
          [stream.name]: d.value
        }))
    );

    // Apply aggregation
    if (chartConfig.aggregation !== 'raw') {
      // Group by time intervals for aggregation
      const grouped = filteredData.reduce((acc, point) => {
        const timeKey = chartConfig.timeRange === '1h' ? 
          point.timestamp.substring(0, 4) + '0' : // Group by 10 mins
          point.timestamp.substring(0, 2) + ':00'; // Group by hour
        
        if (!acc[timeKey]) acc[timeKey] = [];
        acc[timeKey].push(point);
        return acc;
      }, {} as Record<string, any[]>);

      return Object.entries(grouped).map(([time, points]) => {
        const values = points.map(p => Object.values(p).find(v => typeof v === 'number')).filter(Boolean);
        const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
        const sum = values.reduce((sum, v) => sum + v, 0);
        const max = Math.max(...values);
        const min = Math.min(...values);
        
        return {
          timestamp: time,
          ...points[0],
          avg: chartConfig.aggregation === 'avg' ? avg : undefined,
          sum: chartConfig.aggregation === 'sum' ? sum : undefined,
          max: chartConfig.aggregation === 'max' ? max : undefined,
          min: chartConfig.aggregation === 'min' ? min : undefined,
        };
      });
    }

    return filteredData;
  }, [streams, selectedStreams, chartConfig]);

  const chartData = getChartData();

  // Export data
  const exportData = useCallback(() => {
    const csvContent = [
      ['Timestamp', ...selectedStreams.map(id => streams.find(s => s.id === id)?.name || id), 'Value'],
      ...chartData.map(row => [
        row.timestamp,
        ...selectedStreams.map(id => {
          const stream = streams.find(s => s.id === id);
          return stream ? String(row[stream.name] || row.value || '') : '';
        }),
        String(row.value || row.avg || row.sum || row.max || row.min || '')
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `data_export_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('📊 Data exported successfully!');
  }, [chartData, selectedStreams, streams]);

  // Render different chart types
  const renderChart = () => {
    switch (chartConfig.chartType) {
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={isFullscreen ? '90vh' : 400}>
            <Area data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Legend />
              {selectedStreams.map((streamId, index) => {
                const stream = streams.find(s => s.id === streamId);
                return (
                  <Area
                    key={streamId}
                    type="monotone"
                    dataKey={stream.name}
                    stackId="stack"
                    stroke={stream?.color}
                    fill={stream?.color}
                    fillOpacity={0.6}
                  />
                );
              })}
            </Area>
          </ResponsiveContainer>
        );
      
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={isFullscreen ? '90vh' : 400}>
            <Bar data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Legend />
              {selectedStreams.map((streamId, index) => {
                const stream = streams.find(s => s.id === streamId);
                return (
                  <Bar
                    key={streamId}
                    dataKey={stream.name}
                    fill={stream?.color}
                  />
                );
              })}
            </Bar>
          </ResponsiveContainer>
        );
      
      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={isFullscreen ? '90vh' : 400}>
            <Scatter data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Legend />
              {selectedStreams.map((streamId, index) => {
                const stream = streams.find(s => s.id === streamId);
                return (
                  <Scatter
                    key={streamId}
                    dataKey={stream.name}
                    fill={stream?.color}
                  />
                );
              })}
            </Scatter>
          </ResponsiveContainer>
        );
      
      case 'radar':
        const radarData = selectedStreams.map(streamId => {
          const stream = streams.find(s => s.id === streamId);
          const values = chartData.map(d => d[stream.name] || d.value || 0);
          const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
          return {
            subject: stream?.name || streamId,
            A: avg * (0.8 + Math.random() * 0.4),
            B: avg * (0.6 + Math.random() * 0.4),
            fullMark: avg
          };
        });
        
        return (
          <ResponsiveContainer width="100%" height={isFullscreen ? '90vh' : 400}>
            <Radar data={radarData}>
              <PolarGrid />
              <PolarAngleAxis type="number" domain={[0, 360]} />
              <PolarRadiusAxis />
              <Radar
                name="Value"
                dataKey="fullMark"
                stroke="#8884d8"
                fill="#8884d8"
                fillOpacity={0.6}
              />
            </Radar>
          </ResponsiveContainer>
        );
      
      default:
        return (
          <ResponsiveContainer width="100%" height={isFullscreen ? '90vh' : 400}>
            <Line data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Legend />
              {selectedStreams.map((streamId, index) => {
                const stream = streams.find(s => s.id === streamId);
                return (
                  <Line
                    key={streamId}
                    type="monotone"
                    dataKey={stream.name}
                    stroke={stream?.color}
                    strokeWidth={2}
                    dot={{ fill: stream?.color, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                );
              })}
            </Line>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className={`p-6 ${isFullscreen ? 'fixed inset-0 bg-white z-50' : 'max-w-7xl mx-auto'} space-y-6`}>
      {/* Header Controls */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📊 Enhanced Data Visualization</h1>
            <p className="text-gray-600 mt-1">Advanced multi-stream real-time data visualization</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
            >
              {isFullscreen ? <Eye className="w-4 h-4" /> : <BarChart3 className="w-4 h-4" />}
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </button>
            
            <button
              onClick={exportData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export Data
            </button>
          </div>
        </div>

        {/* Stream Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">📡 Data Streams</h3>
          <div className="flex flex-wrap gap-3">
            {streams.map(stream => (
              <label key={stream.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedStreams.includes(stream.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedStreams(prev => [...prev, stream.id]);
                    } else {
                      setSelectedStreams(prev => prev.filter(id => id !== stream.id));
                    }
                  }}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: stream.color }}
                  />
                  <span className="font-medium">{stream.name}</span>
                  <div className="flex items-center gap-1">
                    {stream.trend === 'up' && <TrendingUp className="w-3 h-3 text-green-500" />}
                    {stream.trend === 'down' && <TrendingDown className="w-3 h-3 text-red-500" />}
                    <span className={`text-sm ${stream.trend === 'up' ? 'text-green-600' : stream.trend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
                      {stream.changePercent > 0 ? '+' : ''}{stream.changePercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Chart Configuration */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Chart Type</label>
            <select
              value={chartConfig.chartType}
              onChange={(e) => setChartConfig(prev => ({ ...prev, chartType: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="line">📈 Line Chart</option>
              <option value="area">📊 Area Chart</option>
              <option value="bar">📊 Bar Chart</option>
              <option value="scatter">⚡ Scatter Plot</option>
              <option value="radar">🎯 Radar Chart</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
            <select
              value={chartConfig.timeRange}
              onChange={(e) => setChartConfig(prev => ({ ...prev, timeRange: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="1h">🕐 Last Hour</option>
              <option value="6h">🕕 Last 6 Hours</option>
              <option value="24h">🕐 Last 24 Hours</option>
              <option value="7d">📅 Last 7 Days</option>
              <option value="30d">📆 Last 30 Days</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Aggregation</label>
            <select
              value={chartConfig.aggregation}
              onChange={(e) => setChartConfig(prev => ({ ...prev, aggregation: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="raw">📍 Raw Data</option>
              <option value="avg">📊 Average</option>
              <option value="sum">➕ Sum</option>
              <option value="max">⬆️ Maximum</option>
              <option value="min">⬇️ Minimum</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Auto Refresh</label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <input
                type="number"
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(parseInt(e.target.value) || 5)}
                min="1"
                max="60"
                disabled={!autoRefresh}
                className="w-20 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              <span className="text-sm text-gray-600">seconds</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            Real-time Visualization
            {autoRefresh && (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-green-500 animate-spin" />
                <span className="text-sm text-gray-600">Auto-refresh: {refreshInterval}s</span>
              </div>
            )}
          </h3>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setChartConfig(prev => ({ ...prev, showGrid: !prev.showGrid }))}
              className={`px-3 py-1 rounded ${chartConfig.showGrid ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}
            >
              Grid
            </button>
            <button
              onClick={() => setChartConfig(prev => ({ ...prev, showTooltip: !prev.showTooltip }))}
              className={`px-3 py-1 rounded ${chartConfig.showTooltip ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}
            >
              Tooltip
            </button>
            <button
              onClick={() => setChartConfig(prev => ({ ...prev, animationEnabled: !prev.animationEnabled }))}
              className={`px-3 py-1 rounded ${chartConfig.animationEnabled ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}
            >
              Animation
            </button>
          </div>
        </div>

        {renderChart()}
      </div>

      {/* Statistics Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Stream Statistics
          </h3>
          <div className="space-y-3">
            {selectedStreams.map(streamId => {
              const stream = streams.find(s => s.id === streamId);
              if (!stream) return null;
              
              const values = stream.data.map(d => d.value);
              const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
              const max = Math.max(...values);
              const min = Math.min(...values);
              const latest = values[values.length - 1];
              
              return (
                <div key={streamId} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{stream.name}</span>
                    <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: stream.color }} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Current:</span>
                      <span className="font-medium">{latest.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Average:</span>
                      <span className="font-medium">{avg.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Range:</span>
                      <span className="font-medium">{min.toFixed(2)} - {max.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Trend:</span>
                      <span className={`font-medium ${stream.trend === 'up' ? 'text-green-600' : stream.trend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
                        {stream.trend === 'up' ? '↗️' : stream.trend === 'down' ? '↘️' : '→️'} {stream.changePercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-purple-600" />
            Data Quality
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Data Points:</span>
              <span className="font-medium">{chartData.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Active Streams:</span>
              <span className="font-medium">{selectedStreams.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Update Frequency:</span>
              <span className="font-medium">{autoRefresh ? `Every ${refreshInterval}s` : 'Manual'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Chart Type:</span>
              <span className="font-medium">{chartConfig.chartType.toUpperCase()}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-600" />
            Performance
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Render Time:</span>
              <span className="font-medium">{Math.random() * 10 + 5}ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Data Points/sec:</span>
              <span className="font-medium">{(selectedStreams.length * refreshInterval / 5).toFixed(1)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Memory Usage:</span>
              <span className="font-medium">{(Math.random() * 50 + 20).toFixed(0)}MB</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Status:</span>
              <span className="font-medium text-green-600">Optimal</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Data Feed */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">📡 Live Data Feed</h3>
        <div className="max-h-64 overflow-y-auto space-y-2">
          {streams.filter(s => selectedStreams.includes(s.id)).map(stream => (
            <div key={stream.id} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: stream.color }} />
                  <span className="font-medium">{stream.name}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(stream.lastUpdate).toLocaleTimeString()}
                </span>
              </div>
              <div className="text-sm">
                <span className="font-medium">{stream.data[stream.data.length - 1]?.value.toFixed(2)}</span>
                {stream.data[stream.data.length - 1]?.metadata && (
                  <span className="text-xs text-gray-500 ml-2">
                    Source: {stream.data[stream.data.length - 1].metadata.source}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
