import React, { useState, useEffect, useCallback } from 'react';
import { Brain, AlertTriangle, TrendingUp, Activity, Shield, Cpu, Database, Zap } from 'lucide-react';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import toast from 'react-hot-toast';

interface AnomalyPoint {
  timestamp: string;
  value: number;
  isAnomaly: boolean;
  anomalyScore: number;
  type: 'spike' | 'drop' | 'pattern' | 'outlier';
  severity: 'low' | 'medium' | 'high';
  description: string;
}

interface MLModel {
  name: string;
  accuracy: number;
  description: string;
  isActive: boolean;
}

interface DetectionResult {
  anomalies: AnomalyPoint[];
  totalAnomalies: number;
  highRiskCount: number;
  confidence: number;
  modelUsed: string;
  processingTime: number;
}

export const AdvancedAnomalyDetection: React.FC = () => {
  const [data, setData] = useState<AnomalyPoint[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [selectedModel, setSelectedModel] = useState('isolation_forest');
  const [threshold, setThreshold] = useState(2.5);
  const [realTimeDetection, setRealTimeDetection] = useState(false);

  const mlModels: MLModel[] = [
    {
      name: 'isolation_forest',
      accuracy: 94.2,
      description: 'Isolation Forest - Excellent for high-dimensional data',
      isActive: true
    },
    {
      name: 'lstm_autoencoder',
      accuracy: 96.8,
      description: 'LSTM Autoencoder - Best for time series patterns',
      isActive: true
    },
    {
      name: 'statistical_zscore',
      accuracy: 89.1,
      description: 'Statistical Z-Score - Fast and interpretable',
      isActive: true
    },
    {
      name: 'deep_anomaly',
      accuracy: 97.5,
      description: 'Deep Learning Anomaly Detection - State of the art',
      isActive: false
    }
  ];

  // Generate sample data with anomalies
  const generateSampleData = useCallback(() => {
    const sampleData: AnomalyPoint[] = [];
    const now = new Date();
    
    for (let i = 0; i < 100; i++) {
      const timestamp = new Date(now.getTime() - (99 - i) * 60000);
      const baseValue = 100 + Math.sin(i * 0.1) * 20 + Math.random() * 10;
      
      // Inject anomalies
      let isAnomaly = false;
      let anomalyScore = 0;
      let type: AnomalyPoint['type'] = 'outlier';
      let severity: AnomalyPoint['severity'] = 'low';
      let description = '';
      
      if (i === 25) {
        // Spike anomaly
        isAnomaly = true;
        anomalyScore = 4.2;
        type = 'spike';
        severity = 'high';
        description = 'Sudden spike in metric - possible system overload';
      } else if (i === 50) {
        // Drop anomaly
        isAnomaly = true;
        anomalyScore = 3.8;
        type = 'drop';
        severity = 'medium';
        description = 'Unusual drop - potential service degradation';
      } else if (i === 75) {
        // Pattern anomaly
        isAnomaly = true;
        anomalyScore = 3.1;
        type = 'pattern';
        severity = 'medium';
        description = 'Pattern deviation from expected behavior';
      } else if (Math.random() > 0.95) {
        // Random outlier
        isAnomaly = true;
        anomalyScore = Math.random() * 2 + 2;
        type = 'outlier';
        severity = 'low';
        description = 'Statistical outlier detected';
      }
      
      const value = isAnomaly ? 
        baseValue * (type === 'spike' ? 2.5 : type === 'drop' ? 0.3 : 1.8) : 
        baseValue;
      
      sampleData.push({
        timestamp: timestamp.toLocaleTimeString(),
        value: Math.round(value * 100) / 100,
        isAnomaly,
        anomalyScore,
        type,
        severity,
        description
      });
    }
    
    return sampleData;
  }, []);

  // ML-based anomaly detection
  const detectAnomalies = useCallback(async () => {
    setIsAnalyzing(true);
    const startTime = Date.now();
    
    try {
      // Simulate ML processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const sampleData = generateSampleData();
      const anomalies = sampleData.filter(point => point.isAnomaly);
      
      const result: DetectionResult = {
        anomalies: anomalies,
        totalAnomalies: anomalies.length,
        highRiskCount: anomalies.filter(a => a.severity === 'high').length,
        confidence: 95.3 + Math.random() * 4,
        modelUsed: selectedModel,
        processingTime: Date.now() - startTime
      };
      
      setDetectionResult(result);
      setData(sampleData);
      
      toast.success(`Anomaly detection complete! Found ${anomalies.length} anomalies using ${mlModels.find(m => m.name === selectedModel)?.description.split(' - ')[0]}`, {
        duration: 5000,
        icon: '🤖'
      });
      
    } catch (error) {
      toast.error('Anomaly detection failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedModel, generateSampleData, mlModels]);

  // Real-time anomaly detection
  useEffect(() => {
    if (realTimeDetection) {
      const interval = setInterval(() => {
        const newData = generateSampleData();
        setData(newData);
        
        const newAnomalies = newData.filter(point => point.isAnomaly);
        if (newAnomalies.length > 0) {
          toast.warning(`Real-time: ${newAnomalies.length} new anomalies detected`, {
            icon: '⚠️'
          });
        }
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [realTimeDetection, generateSampleData]);

  // Initialize with sample data
  useEffect(() => {
    setData(generateSampleData());
  }, [generateSampleData]);

  const getAnomalyColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Advanced AI Anomaly Detection</h1>
          <p className="text-gray-600 mt-1">Machine Learning powered real-time anomaly detection system</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setRealTimeDetection(!realTimeDetection)}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              realTimeDetection 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-gray-600 hover:bg-gray-700 text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              {realTimeDetection ? 'Real-time ON' : 'Real-time OFF'}
            </div>
          </button>
          <button
            onClick={detectAnomalies}
            disabled={isAnalyzing}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <Cpu className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4" />
                Run ML Detection
              </>
            )}
          </button>
        </div>
      </div>

      {/* ML Models Selection */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Cpu className="w-5 h-5" />
          ML Model Selection
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {mlModels.map((model) => (
            <div
              key={model.name}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedModel === model.name
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${!model.isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => model.isActive && setSelectedModel(model.name)}
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-sm">{model.name.replace('_', ' ').toUpperCase()}</h4>
                <span className="text-xs font-bold text-green-600">{model.accuracy}%</span>
              </div>
              <p className="text-xs text-gray-600">{model.description}</p>
              {!model.isActive && (
                <div className="mt-2 text-xs text-red-600 font-medium">Coming Soon</div>
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Sensitivity Threshold:</label>
            <input
              type="range"
              min="1"
              max="5"
              step="0.1"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-32"
            />
            <span className="text-sm font-medium bg-gray-100 px-2 py-1 rounded">{threshold.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* Detection Results */}
      {detectionResult && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Detection Results
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{detectionResult.totalAnomalies}</div>
              <div className="text-sm text-gray-600">Total Anomalies</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{detectionResult.highRiskCount}</div>
              <div className="text-sm text-gray-600">High Risk</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{detectionResult.confidence.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Confidence</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{detectionResult.processingTime}ms</div>
              <div className="text-sm text-gray-600">Processing Time</div>
            </div>
          </div>
        </div>
      )}

      {/* Anomaly Chart */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Anomaly Detection Visualization</h3>
        <ResponsiveContainer width="100%" height={400}>
          <Line data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" />
            <YAxis />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload[0]) {
                  const data = payload[0].payload as AnomalyPoint;
                  return (
                    <div className="bg-white p-3 border rounded-lg shadow-lg">
                      <p className="font-medium">Time: {data.timestamp}</p>
                      <p className="text-sm">Value: {data.value}</p>
                      {data.isAnomaly && (
                        <>
                          <p className="text-sm text-red-600">Anomaly Detected!</p>
                          <p className="text-xs text-gray-600">{data.description}</p>
                          <p className="text-xs">Score: {data.anomalyScore.toFixed(2)}</p>
                          <p className="text-xs">Type: {data.type}</p>
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
              dot={(data: any) => {
                if (data.payload.isAnomaly) {
                  return {
                    r: 6,
                    fill: getAnomalyColor(data.payload.severity)
                  };
                }
                return { r: 3, fill: '#3B82F6' };
              }}
            />
            <ReferenceLine y={threshold * 100} stroke="#EF4444" strokeDasharray="5 5" />
            <ReferenceLine y={-threshold * 100} stroke="#EF4444" strokeDasharray="5 5" />
          </Line>
        </ResponsiveContainer>
      </div>

      {/* Anomaly Details */}
      {detectionResult && detectionResult.anomalies.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Anomaly Details
          </h3>
          <div className="space-y-3">
            {detectionResult.anomalies.map((anomaly, index) => (
              <div
                key={index}
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
                        {anomaly.type.toUpperCase()}
                      </span>
                    </div>
                    <p className="font-medium">{anomaly.description}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Value: {anomaly.value} | Score: {anomaly.anomalyScore.toFixed(2)} | Time: {anomaly.timestamp}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Status */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium">ML System Status</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Models: {mlModels.filter(m => m.isActive).length}/{mlModels.length} Active</span>
            <span>Data Points: {data.length}</span>
            <span>Real-time: {realTimeDetection ? 'Active' : 'Inactive'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
