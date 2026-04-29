import React, { useState, useEffect, useCallback } from 'react';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ComposedChart, Area } from 'recharts';
import { Brain, AlertTriangle, Activity, Shield, Cpu, Wifi, WifiOff, TrendingUp, TrendingDown, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { realTimeDataService, RealTimeDataPoint, StockDataPoint } from '../services/realTimeDataService';

interface LiveAnomalyPoint {
  timestamp: string;
  value: number;
  isAnomaly: boolean;
  anomalyScore: number;
  threshold: number;
  symbol: string;
  change: number;
}

interface AnomalyAlert {
  id: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
  symbol: string;
  value: number;
  expectedValue: number;
}

export const RealAnomalyDetection: React.FC = () => {
  const [liveData, setLiveData] = useState<Map<string, LiveAnomalyPoint[]>>(new Map());
  const [anomalies, setAnomalies] = useState<AnomalyAlert[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionStats, setDetectionStats] = useState({
    totalAnomalies: 0,
    highRiskCount: 0,
    avgAnomalyScore: 0,
    detectionRate: 0
  });
  const [sensitivity, setSensitivity] = useState(2.5);
  const [selectedSymbol, setSelectedSymbol] = useState('BTC');

  // Real-time anomaly detection algorithm
  const detectAnomalies = useCallback((data: RealTimeDataPoint[], symbol: string): LiveAnomalyPoint[] => {
    if (data.length < 10) return [];

    const anomalies: LiveAnomalyPoint[] = [];
    
    // Calculate moving average and standard deviation
    for (let i = 10; i < data.length; i++) {
      const window = data.slice(i - 10, i);
      const values = window.map(d => d.price);
      
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      
      const currentPoint = data[i];
      const zScore = Math.abs((currentPoint.price - mean) / stdDev);
      const isAnomaly = zScore > sensitivity;
      
      anomalies.push({
        timestamp: currentPoint.timestamp,
        value: currentPoint.price,
        isAnomaly,
        anomalyScore: zScore,
        threshold: sensitivity,
        symbol: currentPoint.symbol,
        change: currentPoint.change24h
      });
      
      // Create alert for high-severity anomalies
      if (isAnomaly && zScore > sensitivity * 1.5) {
        const alert: AnomalyAlert = {
          id: `${symbol}-${Date.now()}`,
          message: `${symbol} price anomaly detected: $${currentPoint.price.toLocaleString()} (${zScore.toFixed(2)}σ from mean)`,
          severity: zScore > sensitivity * 2 ? 'high' : 'medium',
          timestamp: new Date(),
          symbol: currentPoint.symbol,
          value: currentPoint.price,
          expectedValue: mean
        };
        
        setAnomalies(prev => [alert, ...prev.slice(0, 9)]);
        
        if (zScore > sensitivity * 2) {
          toast.error(`🚨 HIGH RISK: ${symbol} anomaly detected!`, {
            duration: 5000,
            icon: '⚠️'
          });
        } else {
          toast.warning(`⚠️ ${symbol} anomaly detected`, {
            duration: 3000
          });
        }
      }
    }
    
    return anomalies;
  }, [sensitivity]);

  // Subscribe to real-time data for anomaly detection
  const startAnomalyDetection = useCallback(() => {
    console.log('🧠 Starting REAL anomaly detection...');
    setIsDetecting(true);
    toast.success('🔍 Anomaly detection activated', { icon: '🤖' });

    // Subscribe to crypto data
    realTimeDataService.subscribe('crypto-bitcoin', (data: RealTimeDataPoint) => {
      setLiveData(prev => {
        const newData = new Map(prev);
        const history = newData.get('BTC') || [];
        const newHistory = [...history.slice(-100), data];
        
        // Run anomaly detection
        const detectedAnomalies = detectAnomalies(newHistory.slice(-50), 'BTC');
        newData.set('BTC', detectedAnomalies);
        
        // Update stats
        const allAnomalies = Array.from(newData.values()).flat().filter(point => point.isAnomaly);
        const highRiskCount = allAnomalies.filter(point => point.anomalyScore > sensitivity * 1.5).length;
        
        setDetectionStats({
          totalAnomalies: allAnomalies.length,
          highRiskCount,
          avgAnomalyScore: allAnomalies.length > 0 ? 
            allAnomalies.reduce((sum, point) => sum + point.anomalyScore, 0) / allAnomalies.length : 0,
          detectionRate: newHistory.length > 0 ? (allAnomalies.length / newHistory.length) * 100 : 0
        });
        
        return newData;
      });
    });

    realTimeDataService.subscribe('crypto-ethereum', (data: RealTimeDataPoint) => {
      setLiveData(prev => {
        const newData = new Map(prev);
        const history = newData.get('ETH') || [];
        const newHistory = [...history.slice(-100), data];
        const detectedAnomalies = detectAnomalies(newHistory.slice(-50), 'ETH');
        newData.set('ETH', detectedAnomalies);
        return newData;
      });
    });

    realTimeDataService.subscribe('stock-AAPL', (data: StockDataPoint) => {
      setLiveData(prev => {
        const newData = new Map(prev);
        const history = newData.get('AAPL') || [];
        const cryptoDataPoint: RealTimeDataPoint = {
          timestamp: data.timestamp,
          symbol: data.symbol,
          price: data.price,
          change24h: data.change,
          volume: data.volume
        };
        const newHistory = [...history.slice(-100), cryptoDataPoint];
        const detectedAnomalies = detectAnomalies(newHistory.slice(-50), 'AAPL');
        newData.set('AAPL', detectedAnomalies);
        return newData;
      });
    });

    // Start the data streams
    realTimeDataService.startCryptoDataStream();
    realTimeDataService.startStockDataStream();

  }, [detectAnomalies, sensitivity]);

  // Stop anomaly detection
  const stopAnomalyDetection = useCallback(() => {
    console.log('🛑 Stopping anomaly detection...');
    setIsDetecting(false);
    realTimeDataService.stopAllStreams();
    toast.success('Anomaly detection stopped', { icon: '🔌' });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      realTimeDataService.stopAllStreams();
    };
  }, []);

  // Get chart data for selected symbol
  const getChartData = () => {
    const data = liveData.get(selectedSymbol) || [];
    return data.map(point => ({
      timestamp: new Date(point.timestamp).toLocaleTimeString(),
      value: point.value,
      anomaly: point.isAnomaly ? point.value : null,
      threshold: point.threshold,
      score: point.anomalyScore
    }));
  };

  const chartData = getChartData();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🧠 REAL AI Anomaly Detection</h1>
          <p className="text-gray-600 mt-1">Live anomaly detection on real crypto & stock market data</p>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="BTC">🪙 Bitcoin</option>
            <option value="ETH">💎 Ethereum</option>
            <option value="AAPL">📈 Apple Stock</option>
          </select>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Sensitivity:</label>
            <input
              type="range"
              min="1"
              max="4"
              step="0.1"
              value={sensitivity}
              onChange={(e) => setSensitivity(parseFloat(e.target.value))}
              className="w-24"
            />
            <span className="text-sm font-medium bg-gray-100 px-2 py-1 rounded">{sensitivity.toFixed(1)}σ</span>
          </div>
          <button
            onClick={isDetecting ? stopAnomalyDetection : startAnomalyDetection}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              isDetecting 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              {isDetecting ? (
                <>
                  <WifiOff className="w-4 h-4" />
                  Stop Detection
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4" />
                  Start AI Detection
                </>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Detection Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Anomalies</p>
              <p className="text-2xl font-bold text-red-600">{detectionStats.totalAnomalies}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">High Risk</p>
              <p className="text-2xl font-bold text-orange-600">{detectionStats.highRiskCount}</p>
            </div>
            <Shield className="w-8 h-8 text-orange-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Anomaly Score</p>
              <p className="text-2xl font-bold text-purple-600">{detectionStats.avgAnomalyScore.toFixed(2)}</p>
            </div>
            <Cpu className="w-8 h-8 text-purple-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Detection Rate</p>
              <p className="text-2xl font-bold text-blue-600">{detectionStats.detectionRate.toFixed(1)}%</p>
            </div>
            <Activity className="w-8 h-8 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Live Anomaly Chart */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          LIVE Anomaly Detection - {selectedSymbol}
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" />
            <YAxis />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload[0]) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 border rounded-lg shadow-lg">
                      <p className="font-medium">Time: {data.timestamp}</p>
                      <p className="text-sm">Price: ${data.value.toLocaleString()}</p>
                      {data.anomaly && (
                        <>
                          <p className="text-sm text-red-600">🚨 ANOMALY DETECTED!</p>
                          <p className="text-xs">Score: {data.score.toFixed(2)}σ</p>
                        </>
                      )}
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
            />
            <Area
              type="monotone"
              dataKey="anomaly"
              stroke="#EF4444"
              fill="#EF4444"
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <ReferenceLine 
              y={chartData.length > 0 ? chartData[chartData.length - 1]?.value * (1 + sensitivity * 0.05) : 0} 
              stroke="#EF4444" 
              strokeDasharray="5 5" 
              label="Upper Threshold"
            />
            <ReferenceLine 
              y={chartData.length > 0 ? chartData[chartData.length - 1]?.value * (1 - sensitivity * 0.05) : 0} 
              stroke="#EF4444" 
              strokeDasharray="5 5" 
              label="Lower Threshold"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Anomaly Alerts */}
      {anomalies.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Recent Anomaly Alerts
          </h3>
          <div className="space-y-3">
            {anomalies.map((anomaly) => (
              <div
                key={anomaly.id}
                className={`p-4 rounded-lg border-l-4 ${
                  anomaly.severity === 'high' ? 'bg-red-50 border-red-500' :
                  anomaly.severity === 'medium' ? 'bg-yellow-50 border-yellow-500' :
                  'bg-blue-50 border-blue-500'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        anomaly.severity === 'high' ? 'bg-red-600 text-white' :
                        anomaly.severity === 'medium' ? 'bg-yellow-600 text-white' :
                        'bg-blue-600 text-white'
                      }`}>
                        {anomaly.severity.toUpperCase()}
                      </span>
                      <span className="text-xs bg-gray-600 text-white px-2 py-1 rounded">
                        {anomaly.symbol}
                      </span>
                    </div>
                    <p className="font-medium">{anomaly.message}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Expected: ${anomaly.expectedValue.toLocaleString()} | Actual: ${anomaly.value.toLocaleString()}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {anomaly.timestamp.toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Status */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isDetecting ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-sm font-medium">
              {isDetecting ? '🧠 AI ANOMALY DETECTION ACTIVE' : '🔌 DETECTION INACTIVE'}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            {isDetecting ? 'Analyzing live market data in real-time' : 'Click "Start AI Detection" to begin'}
          </div>
        </div>
      </div>
    </div>
  );
};
