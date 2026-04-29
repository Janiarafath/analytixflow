import React, { useState, useEffect, useCallback } from 'react';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, Bar } from 'recharts';
import { Activity, TrendingUp, TrendingDown, DollarSign, Cloud, Wind, Droplets, Gauge, Wifi, WifiOff, Globe, Zap, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { realTimeDataService, RealTimeDataPoint, StockDataPoint, WeatherDataPoint } from '../services/realTimeDataService';

interface LiveDataPoint {
  timestamp: string;
  value: number;
  change: number;
  source: string;
  symbol: string;
}

interface ConnectionStatus {
  crypto: boolean;
  stocks: boolean;
  weather: boolean;
}

export const TrueRealTimeDashboard: React.FC = () => {
  const [cryptoData, setCryptoData] = useState<Map<string, RealTimeDataPoint[]>>(new Map());
  const [stockData, setStockData] = useState<Map<string, StockDataPoint[]>>(new Map());
  const [weatherData, setWeatherData] = useState<Map<string, WeatherDataPoint>>(new Map());
  const [isLive, setIsLive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    crypto: false,
    stocks: false,
    weather: false
  });
  const [selectedDataSource, setSelectedDataSource] = useState<'crypto' | 'stocks' | 'weather'>('crypto');

  // Initialize real-time data connections
  const startRealTimeConnections = useCallback(() => {
    console.log('🚀 Starting REAL data connections...');
    
    setIsLive(true);
    toast.success('Connecting to LIVE data sources...', { icon: '📡' });

    // Start crypto data stream
    realTimeDataService.subscribe('crypto-bitcoin', (data: RealTimeDataPoint) => {
      setCryptoData(prev => {
        const newData = new Map(prev);
        const history = newData.get('BTC') || [];
        newData.set('BTC', [...history.slice(-50), data]);
        return newData;
      });
      setConnectionStatus(prev => ({ ...prev, crypto: true }));
    });

    realTimeDataService.subscribe('crypto-ethereum', (data: RealTimeDataPoint) => {
      setCryptoData(prev => {
        const newData = new Map(prev);
        const history = newData.get('ETH') || [];
        newData.set('ETH', [...history.slice(-50), data]);
        return newData;
      });
    });

    realTimeDataService.subscribe('crypto-solana', (data: RealTimeDataPoint) => {
      setCryptoData(prev => {
        const newData = new Map(prev);
        const history = newData.get('SOL') || [];
        newData.set('SOL', [...history.slice(-50), data]);
        return newData;
      });
    });

    // Start stock data stream
    realTimeDataService.subscribe('stock-AAPL', (data: StockDataPoint) => {
      setStockData(prev => {
        const newData = new Map(prev);
        const history = newData.get('AAPL') || [];
        newData.set('AAPL', [...history.slice(-50), data]);
        return newData;
      });
      setConnectionStatus(prev => ({ ...prev, stocks: true }));
    });

    realTimeDataService.subscribe('stock-GOOGL', (data: StockDataPoint) => {
      setStockData(prev => {
        const newData = new Map(prev);
        const history = newData.get('GOOGL') || [];
        newData.set('GOOGL', [...history.slice(-50), data]);
        return newData;
      });
    });

    realTimeDataService.subscribe('stock-MSFT', (data: StockDataPoint) => {
      setStockData(prev => {
        const newData = new Map(prev);
        const history = newData.get('MSFT') || [];
        newData.set('MSFT', [...history.slice(-50), data]);
        return newData;
      });
    });

    // Start weather data stream
    realTimeDataService.subscribe('weather-New York', (data: WeatherDataPoint) => {
      setWeatherData(prev => {
        const newData = new Map(prev);
        newData.set('New York', data);
        return newData;
      });
      setConnectionStatus(prev => ({ ...prev, weather: true }));
    });

    realTimeDataService.subscribe('weather-London', (data: WeatherDataPoint) => {
      setWeatherData(prev => {
        const newData = new Map(prev);
        newData.set('London', data);
        return newData;
      });
    });

    realTimeDataService.subscribe('weather-Tokyo', (data: WeatherDataPoint) => {
      setWeatherData(prev => {
        const newData = new Map(prev);
        newData.set('Tokyo', data);
        return newData;
      });
    });

    // Start the actual data services
    realTimeDataService.startCryptoDataStream();
    realTimeDataService.startStockDataStream();
    realTimeDataService.startWeatherDataStream();

    toast.success('✅ Connected to LIVE data sources!', { duration: 3000 });
  }, []);

  // Stop real-time connections
  const stopRealTimeConnections = useCallback(() => {
    console.log('🛑 Stopping real-time connections...');
    setIsLive(false);
    realTimeDataService.stopAllStreams();
    setConnectionStatus({ crypto: false, stocks: false, weather: false });
    toast.success('Disconnected from data sources', { icon: '🔌' });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      realTimeDataService.stopAllStreams();
    };
  }, []);

  // Get chart data based on selected source
  const getChartData = (): LiveDataPoint[] => {
    const allData: LiveDataPoint[] = [];
    
    if (selectedDataSource === 'crypto') {
      cryptoData.forEach((data, symbol) => {
        data.forEach(point => {
          allData.push({
            timestamp: new Date(point.timestamp).toLocaleTimeString(),
            value: point.price,
            change: point.change24h,
            source: 'crypto',
            symbol
          });
        });
      });
    } else if (selectedDataSource === 'stocks') {
      stockData.forEach((data, symbol) => {
        data.forEach(point => {
          allData.push({
            timestamp: new Date(point.timestamp).toLocaleTimeString(),
            value: point.price,
            change: point.change,
            source: 'stocks',
            symbol
          });
        });
      });
    }
    
    return allData.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  };

  // Calculate metrics
  const calculateMetrics = () => {
    const metrics = {
      totalDataPoints: 0,
      avgChange: 0,
      positiveChanges: 0,
      negativeChanges: 0,
      connections: Object.values(connectionStatus).filter(Boolean).length
    };

    const allData = getChartData();
    metrics.totalDataPoints = allData.length;
    
    if (allData.length > 0) {
      metrics.avgChange = allData.reduce((sum, point) => sum + point.change, 0) / allData.length;
      metrics.positiveChanges = allData.filter(point => point.change > 0).length;
      metrics.negativeChanges = allData.filter(point => point.change < 0).length;
    }

    return metrics;
  };

  const metrics = calculateMetrics();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🔴 LIVE Real-Time Data Dashboard</h1>
          <p className="text-gray-600 mt-1">Connected to actual APIs - Crypto, Stocks & Weather data</p>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedDataSource}
            onChange={(e) => setSelectedDataSource(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="crypto">🪙 Cryptocurrency</option>
            <option value="stocks">📈 Stock Market</option>
            <option value="weather">🌤️ Weather</option>
          </select>
          <button
            onClick={isLive ? stopRealTimeConnections : startRealTimeConnections}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              isLive 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              {isLive ? (
                <>
                  <WifiOff className="w-4 h-4" />
                  Disconnect
                </>
              ) : (
                <>
                  <Wifi className="w-4 h-4" />
                  Connect LIVE
                </>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Connection Status */}
      <div className="bg-white rounded-lg shadow-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-gray-600" />
            <span className="font-medium">Connection Status:</span>
          </div>
          <div className="flex gap-4">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
              connectionStatus.crypto ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}>
              <div className={`w-2 h-2 rounded-full ${connectionStatus.crypto ? 'bg-green-500' : 'bg-gray-400'}`} />
              Crypto
            </div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
              connectionStatus.stocks ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}>
              <div className={`w-2 h-2 rounded-full ${connectionStatus.stocks ? 'bg-green-500' : 'bg-gray-400'}`} />
              Stocks
            </div>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
              connectionStatus.weather ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}>
              <div className={`w-2 h-2 rounded-full ${connectionStatus.weather ? 'bg-green-500' : 'bg-gray-400'}`} />
              Weather
            </div>
          </div>
        </div>
      </div>

      {/* Live Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Live Data Points</p>
              <p className="text-2xl font-bold text-blue-600">{metrics.totalDataPoints}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Change</p>
              <p className="text-2xl font-bold text-green-600">{metrics.avgChange.toFixed(2)}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Positive Changes</p>
              <p className="text-2xl font-bold text-green-600">{metrics.positiveChanges}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Connections</p>
              <p className="text-2xl font-bold text-purple-600">{metrics.connections}/3</p>
            </div>
            <Wifi className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Real-Time Chart */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          LIVE {selectedDataSource === 'crypto' ? 'Cryptocurrency' : selectedDataSource === 'stocks' ? 'Stock Market' : 'Weather'} Data
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <Line data={getChartData()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" />
            <YAxis />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload[0]) {
                  const data = payload[0].payload as LiveDataPoint;
                  return (
                    <div className="bg-white p-3 border rounded-lg shadow-lg">
                      <p className="font-medium">{data.symbol}</p>
                      <p className="text-sm">Value: ${data.value.toLocaleString()}</p>
                      <p className={`text-sm ${data.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Change: {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)}%
                      </p>
                      <p className="text-xs text-gray-500">{data.timestamp}</p>
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
              stroke="#3B82F6" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
          </Line>
        </ResponsiveContainer>
      </div>

      {/* Current Data Display */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Crypto Data */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-yellow-500" />
            Live Crypto Prices
          </h3>
          <div className="space-y-3">
            {Array.from(cryptoData.entries()).map(([symbol, data]) => {
              const latest = data[data.length - 1];
              if (!latest) return null;
              return (
                <div key={symbol} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{symbol}</p>
                    <p className="text-sm text-gray-600">${latest.price.toLocaleString()}</p>
                  </div>
                  <div className={`text-sm font-medium ${latest.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {latest.change24h >= 0 ? '+' : ''}{latest.change24h.toFixed(2)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stock Data */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Live Stock Prices
          </h3>
          <div className="space-y-3">
            {Array.from(stockData.entries()).map(([symbol, data]) => {
              const latest = data[data.length - 1];
              if (!latest) return null;
              return (
                <div key={symbol} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{symbol}</p>
                    <p className="text-sm text-gray-600">${latest.price.toLocaleString()}</p>
                  </div>
                  <div className={`text-sm font-medium ${latest.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {latest.change >= 0 ? '+' : ''}{latest.change.toFixed(2)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Weather Data */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Cloud className="w-5 h-5 text-blue-500" />
            Live Weather Data
          </h3>
          <div className="space-y-3">
            {Array.from(weatherData.entries()).map(([city, data]) => (
              <div key={city} className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">{city}</p>
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                  <div className="flex items-center gap-1">
                    <Gauge className="w-3 h-3 text-orange-500" />
                    <span>{data.temperature}°C</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Droplets className="w-3 h-3 text-blue-500" />
                    <span>{data.humidity}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Wind className="w-3 h-3 text-gray-500" />
                    <span>{data.windSpeed} m/s</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Gauge className="w-3 h-3 text-purple-500" />
                    <span>{data.pressure} hPa</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Status Indicator */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-sm font-medium">
              {isLive ? '🔴 LIVE STREAMING FROM REAL APIs' : '🔌 DISCONNECTED'}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            {isLive ? 'Connected to CoinGecko, Yahoo Finance, OpenWeatherMap' : 'Click "Connect LIVE" to start streaming'}
          </div>
        </div>
      </div>
    </div>
  );
};
