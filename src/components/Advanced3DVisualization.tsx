import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  Area, Bar, PieChart, Pie, Cell, Scatter, ComposedChart,
  ReferenceLine, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  Treemap
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Activity, Zap, Globe, Database, 
  AlertCircle, BarChart3, PieChart as PieChartIcon, Target, 
  Settings, Download, RefreshCw, Eye, Filter, Calendar, Brain,
  Layers, Box, Sparkles, Gauge
} from 'lucide-react';
import toast from 'react-hot-toast';

interface DataPoint {
  timestamp: string;
  value: number;
  predicted?: number;
  confidence?: number;
  metadata?: Record<string, any>;
}

interface DataStream {
  id: string;
  name: string;
  color: string;
  data: DataPoint[];
  isActive: boolean;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
  volatility: number;
  predictionAccuracy?: number;
}

interface PredictionModel {
  algorithm: 'linear' | 'polynomial' | 'exponential' | 'neural';
  accuracy: number;
  nextValue: number;
  confidence: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  timeHorizon: '1h' | '6h' | '24h' | '7d';
}

export const Advanced3DVisualization: React.FC = () => {
  const [streams, setStreams] = useState<DataStream[]>([]);
  const [selectedStreams, setSelectedStreams] = useState<string[]>([]);
  const [chartType, setChartType] = useState<'3d-line' | '3d-surface' | '3d-scatter' | '3d-bar' | '3d-pie' | 'prediction'>('3d-line');
  const [predictionModel, setPredictionModel] = useState<PredictionModel | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [showPrediction, setShowPrediction] = useState(true);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('1h');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Generate sample data with predictions
  useEffect(() => {
    const generateDataStream = (name: string, baseValue: number, color: string, volatility: number): DataStream => {
      const data: DataPoint[] = [];
      let currentValue = baseValue;
      
      for (let i = 0; i < 100; i++) {
        const change = (Math.random() - 0.5) * volatility;
        currentValue = Math.max(0, currentValue + change);
        
        const predicted = currentValue + (Math.random() - 0.5) * volatility * 0.5;
        
        data.push({
          timestamp: new Date(Date.now() - (99 - i) * 60000).toISOString(),
          value: currentValue,
          predicted: i > 50 ? predicted : undefined,
          confidence: i > 50 ? 0.7 + Math.random() * 0.3 : undefined,
          metadata: {
            volume: Math.random() * 1000,
            sentiment: Math.random() > 0.5 ? 'positive' : 'negative',
            category: ['technology', 'finance', 'retail'][Math.floor(Math.random() * 3)]
          }
        });
      }
      
      const trend = data[data.length - 1].value > data[0].value ? 'up' : 
                   data[data.length - 1].value < data[0].value ? 'down' : 'stable';
      const changePercent = ((data[data.length - 1].value - data[0].value) / data[0].value) * 100;
      
      return {
        id: `stream_${name.replace(/\s+/g, '_').toLowerCase()}`,
        name,
        color,
        data,
        isActive: true,
        trend,
        changePercent,
        volatility,
        predictionAccuracy: 85 + Math.random() * 10
      };
    };

    const sampleStreams: DataStream[] = [
      generateDataStream('Bitcoin Price', 45000, '#F7931E', 2000),
      generateDataStream('Ethereum Price', 3000, '#627EEA', 200),
      generateDataStream('Stock Index', 4500, '#10B981', 100),
      generateDataStream('User Activity', 1000, '#8B5CF6', 100),
      generateDataStream('Revenue Rate', 5000, '#F59E0B', 500)
    ];
    
    setStreams(sampleStreams);
    setSelectedStreams(['stream_bitcoin_price', 'stream_ethereum_price', 'stream_stock_index']);
  }, []);

  // Predictive analytics
  const generatePrediction = useCallback(async () => {
    setIsPredicting(true);
    
    // Simulate ML prediction
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const selectedData = streams.filter(s => selectedStreams.includes(s.id));
    if (selectedData.length === 0) {
      setIsPredicting(false);
      return;
    }
    
    const latestValues = selectedData.map(s => s.data[s.data.length - 1].value);
    const avgValue = latestValues.reduce((sum, v) => sum + v, 0) / latestValues.length;
    
    const algorithms: PredictionModel['algorithm'][] = ['linear', 'polynomial', 'exponential', 'neural'];
    const algorithm = algorithms[Math.floor(Math.random() * algorithms.length)];
    
    const prediction: PredictionModel = {
      algorithm,
      accuracy: 85 + Math.random() * 10,
      nextValue: avgValue * (0.95 + Math.random() * 0.1),
      confidence: 0.7 + Math.random() * 0.25,
      trend: Math.random() > 0.5 ? 'bullish' : Math.random() < 0.3 ? 'bearish' : 'neutral',
      timeHorizon: '6h'
    };
    
    setPredictionModel(prediction);
    setIsPredicting(false);
    
    toast.success(`🧠 Prediction generated using ${algorithm} model`, { 
      duration: 3000,
      icon: '🔮'
    });
  }, [streams, selectedStreams]);

  // Auto-generate predictions
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      generatePrediction();
    }, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, [autoRefresh, generatePrediction]);

  // Update data in real-time
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      setStreams(prev => prev.map(stream => {
        const lastValue = stream.data[stream.data.length - 1].value;
        const change = (Math.random() - 0.5) * stream.volatility;
        const newValue = Math.max(0, lastValue + change);
        
        const newDataPoint: DataPoint = {
          timestamp: new Date().toISOString(),
          value: newValue,
          predicted: newValue + (Math.random() - 0.5) * stream.volatility * 0.3,
          confidence: 0.6 + Math.random() * 0.3,
          metadata: {
            volume: Math.random() * 1000,
            sentiment: Math.random() > 0.5 ? 'positive' : 'negative',
            category: ['technology', 'finance', 'retail'][Math.floor(Math.random() * 3)]
          }
        };
        
        return {
          ...stream,
          data: [...stream.data.slice(1), newDataPoint],
          trend: newValue > lastValue ? 'up' : newValue < lastValue ? 'down' : 'stable',
          changePercent: ((newValue - stream.data[0].value) / stream.data[0].value) * 100
        };
      }));
    }, 5000);
    
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Prepare chart data
  const chartData = useMemo(() => {
    const filteredStreams = streams.filter(s => selectedStreams.includes(s.id));
    const timeRangeMs = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    }[timeRange];
    
    const now = Date.now();
    
    return filteredStreams.flatMap(stream => 
      stream.data
        .filter(d => new Date(d.timestamp).getTime() > now - timeRangeMs)
        .map((d, index) => ({
          timestamp: new Date(d.timestamp).toLocaleTimeString(),
          ...d,
          [stream.name]: d.value,
          [`${stream.name}_predicted`]: d.predicted,
          [`${stream.name}_confidence`]: d.confidence,
          index,
          volume: d.metadata?.volume || Math.random() * 1000,
          sentiment: d.metadata?.sentiment || 'neutral'
        }))
    );
  }, [streams, selectedStreams, timeRange]);

  // 3D Surface data
  const surfaceData = useMemo(() => {
    const gridSize = 20;
    const data = [];
    
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const x = (i / gridSize) * 100;
        const y = (j / gridSize) * 100;
        const z = Math.sin(x / 10) * Math.cos(y / 10) * 50 + 
                Math.random() * 20 + 50;
        
        data.push({ x, y, z });
      }
    }
    
    return data;
  }, []);

  // 3D Pie data
  const pieData = useMemo(() => {
    return selectedStreams.map(streamId => {
      const stream = streams.find(s => s.id === streamId);
      if (!stream) return null;
      
      const total = stream.data.reduce((sum, d) => sum + d.value, 0);
      const avg = total / stream.data.length;
      
      return {
        name: stream.name,
        value: avg,
        color: stream.color,
        trend: stream.trend,
        change: stream.changePercent
      };
    }).filter(Boolean);
  }, [streams, selectedStreams]);

  // Render 3D visualization
  const render3DChart = () => {
    switch (chartType) {
      case '3d-line':
        return (
          <div className="relative">
            <ResponsiveContainer width="100%" height={500}>
              <Line data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <ZAxis dataKey="volume" />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload[0]) {
                      return (
                        <div className="bg-white p-4 border rounded-lg shadow-lg">
                          <p className="font-semibold">{payload[0].payload.timestamp}</p>
                          {selectedStreams.map(streamId => {
                            const stream = streams.find(s => s.id === streamId);
                            return (
                              <div key={streamId} className="mt-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stream?.color }} />
                                  <span className="font-medium">{stream?.name}:</span>
                                  <span>{payload[0].payload[stream?.name || '']?.toFixed(2)}</span>
                                </div>
                                {payload[0].payload[`${stream?.name}_predicted`] && (
                                  <div className="text-sm text-blue-600 ml-5">
                                    Predicted: {payload[0].payload[`${stream?.name}_predicted`]?.toFixed(2)}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          <div className="text-xs text-gray-500 mt-2">
                            Volume: {payload[0].payload.volume?.toFixed(0)}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                {selectedStreams.map((streamId, index) => {
                  const stream = streams.find(s => s.id === streamId);
                  return (
                    <React.Fragment key={streamId}>
                      <Line
                        type="monotone"
                        dataKey={stream.name}
                        stroke={stream?.color}
                        strokeWidth={3}
                        dot={{ fill: stream?.color, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      {showPrediction && (
                        <Line
                          type="monotone"
                          dataKey={`${stream.name}_predicted`}
                          stroke={stream?.color}
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          opacity={0.6}
                          dot={false}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </Line>
            </ResponsiveContainer>
            
            {/* 3D effect overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="h-full w-full bg-gradient-to-b from-transparent via-transparent to-blue-50 opacity-20" />
            </div>
          </div>
        );
        
      case '3d-surface':
        return (
          <div className="relative">
            <ResponsiveContainer width="100%" height={500}>
              <Scatter data={surfaceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="x" />
                <YAxis dataKey="y" />
                <ZAxis dataKey="z" />
                <Tooltip />
                <Scatter
                  name="3D Surface"
                  dataKey="z"
                  fill="#8B5CF6"
                  shape={(props: any) => {
                    const { cx, cy, payload } = props;
                    const size = Math.abs(payload.z) / 2;
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={size}
                        fill={payload.z > 50 ? '#10B981' : payload.z > 30 ? '#F59E0B' : '#EF4444'}
                        fillOpacity={0.7}
                      />
                    );
                  }}
                />
              </Scatter>
            </ResponsiveContainer>
            
            {/* 3D depth effect */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-purple-100 to-transparent opacity-30" />
          </div>
        );
        
      case '3d-bar':
        return (
          <div className="relative">
            <ResponsiveContainer width="100%" height={500}>
              <Bar data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <ZAxis dataKey="volume" />
                <Tooltip />
                <Legend />
                {selectedStreams.map((streamId, index) => {
                  const stream = streams.find(s => s.id === streamId);
                  return (
                    <Bar
                      key={streamId}
                      dataKey={stream.name}
                      fill={stream?.color}
                      shape={(props: any) => {
                        const { x, y, width, height, payload } = props;
                        const depth = (payload.volume || 100) / 10;
                        
                        return (
                          <g>
                            {/* Front face */}
                            <rect
                              x={x}
                              y={y}
                              width={width}
                              height={height}
                              fill={stream?.color}
                              opacity={0.9}
                            />
                            {/* Top face */}
                            <path
                              d={`M ${x} ${y} L ${x + depth} ${y - depth} L ${x + width + depth} ${y - depth} L ${x + width} ${y} Z`}
                              fill={stream?.color}
                              opacity={0.7}
                            />
                            {/* Side face */}
                            <path
                              d={`M ${x + width} ${y} L ${x + width + depth} ${y - depth} L ${x + width + depth} ${y + height - depth} L ${x + width} ${y + height} Z`}
                              fill={stream?.color}
                              opacity={0.5}
                            />
                          </g>
                        );
                      }}
                    />
                  );
                })}
              </Bar>
            </ResponsiveContainer>
            
            {/* 3D shadow effect */}
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-gray-300 to-transparent opacity-30" />
          </div>
        );
        
      case '3d-pie':
        return (
          <div className="relative">
            <ResponsiveContainer width="100%" height={500}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={150}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent, change }) => (
                    <div className="text-xs">
                      <div className="font-semibold">{name}</div>
                      <div>{(percent * 100).toFixed(1)}%</div>
                      <div className={change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'}>
                        {change > 0 ? '+' : ''}{change.toFixed(1)}%
                      </div>
                    </div>
                  )}
                  shape={(props: any) => {
                    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
                    const depth = 20;
                    
                    return (
                      <g>
                        {/* Front face */}
                        <path
                          d={`M ${cx} ${cy} L ${cx + outerRadius * Math.cos(-startAngle * Math.PI / 180)} ${cy + outerRadius * Math.sin(-startAngle * Math.PI / 180)} A ${outerRadius} ${outerRadius} 0 ${endAngle - startAngle > 180 ? 1 : 0} 1 ${cx + outerRadius * Math.cos(-endAngle * Math.PI / 180)} ${cy + outerRadius * Math.sin(-endAngle * Math.PI / 180)} Z`}
                          fill={fill}
                          opacity={0.9}
                        />
                        {/* 3D depth effect */}
                        <path
                          d={`M ${cx + outerRadius * Math.cos(-startAngle * Math.PI / 180)} ${cy + outerRadius * Math.sin(-startAngle * Math.PI / 180)} L ${cx + (outerRadius + depth) * Math.cos(-startAngle * Math.PI / 180)} ${cy + (outerRadius + depth) * Math.sin(-startAngle * Math.PI / 180)} A ${outerRadius + depth} ${outerRadius + depth} 0 ${endAngle - startAngle > 180 ? 1 : 0} 1 ${cx + (outerRadius + depth) * Math.cos(-endAngle * Math.PI / 180)} ${cy + (outerRadius + depth) * Math.sin(-endAngle * Math.PI / 180)} L ${cx + outerRadius * Math.cos(-endAngle * Math.PI / 180)} ${cy + outerRadius * Math.sin(-endAngle * Math.PI / 180)} Z`}
                          fill={fill}
                          opacity={0.5}
                        />
                      </g>
                    );
                  }}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            
            {/* 3D shadow */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-transparent to-gray-200 opacity-20 rounded-full" />
          </div>
        );
        
      case 'prediction':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Prediction Chart */}
            <div className="bg-white rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" />
                AI Predictions
              </h3>
              
              <ResponsiveContainer width="100%" height={300}>
                <Line data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {selectedStreams.map((streamId, index) => {
                    const stream = streams.find(s => s.id === streamId);
                    return (
                      <React.Fragment key={streamId}>
                        <Line
                          type="monotone"
                          dataKey={stream.name}
                          stroke={stream?.color}
                          strokeWidth={2}
                          name="Actual"
                        />
                        <Line
                          type="monotone"
                          dataKey={`${stream.name}_predicted`}
                          stroke={stream?.color}
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          opacity={0.7}
                          name="Predicted"
                        />
                      </React.Fragment>
                    );
                  })}
                </Line>
              </ResponsiveContainer>
            </div>
            
            {/* Prediction Model Info */}
            <div className="bg-white rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Model Performance</h3>
              
              {predictionModel ? (
                <div className="space-y-4">
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Algorithm:</span>
                      <span className="font-semibold text-purple-700">
                        {predictionModel.algorithm.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Accuracy:</span>
                      <span className="font-semibold text-green-600">
                        {predictionModel.accuracy.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Confidence:</span>
                      <span className="font-semibold text-blue-600">
                        {(predictionModel.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Trend:</span>
                      <span className={`font-semibold ${
                        predictionModel.trend === 'bullish' ? 'text-green-600' :
                        predictionModel.trend === 'bearish' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {predictionModel.trend === 'bullish' ? '📈 Bullish' :
                         predictionModel.trend === 'bearish' ? '📉 Bearish' : '➡️ Neutral'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Next Value:</span>
                      <span className="font-bold text-lg">
                        ${predictionModel.nextValue.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={generatePrediction}
                    disabled={isPredicting}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isPredicting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4" />
                        Generate New Prediction
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No prediction model active</p>
                  <button
                    onClick={generatePrediction}
                    disabled={isPredicting}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isPredicting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4" />
                        Start Prediction
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-purple-600" />
              Advanced 3D Visualization
            </h1>
            <p className="text-gray-600 mt-1">3D charts with AI predictions and advanced analytics</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPrediction(!showPrediction)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                showPrediction ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              <Brain className="w-4 h-4" />
              {showPrediction ? 'Predictions ON' : 'Predictions OFF'}
            </button>
            
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                autoRefresh ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              {autoRefresh ? 'Live' : 'Paused'}
            </button>
          </div>
        </div>

        {/* Stream Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">📊 Data Streams</h3>
          <div className="flex flex-wrap gap-3">
            {streams.map(stream => (
              <label key={stream.id} className="flex items-center gap-2 cursor-pointer p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
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
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
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

        {/* Chart Type Selection */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { type: '3d-line', icon: BarChart3, label: '3D Line', desc: 'Multi-dimensional line chart' },
            { type: '3d-surface', icon: Layers, label: '3D Surface', desc: '3D surface plot' },
            { type: '3d-bar', icon: Box, label: '3D Bar', desc: '3D bar chart' },
            { type: '3d-pie', icon: PieChartIcon, label: '3D Pie', desc: '3D pie chart' },
            { type: 'prediction', icon: Brain, label: 'AI Predictions', desc: 'ML predictions' }
          ].map(({ type, icon: Icon, label, desc }) => (
            <button
              key={type}
              onClick={() => setChartType(type as any)}
              className={`p-4 rounded-lg border-2 transition-all ${
                chartType === type 
                  ? 'border-purple-600 bg-purple-50' 
                  : 'border-gray-200 hover:border-purple-300'
              }`}
            >
              <Icon className={`w-6 h-6 mx-auto mb-2 ${
                chartType === type ? 'text-purple-600' : 'text-gray-600'
              }`} />
              <div className={`font-medium text-sm ${
                chartType === type ? 'text-purple-900' : 'text-gray-700'
              }`}>
                {label}
              </div>
              <div className="text-xs text-gray-500 mt-1">{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main 3D Chart */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Gauge className="w-5 h-5 text-blue-600" />
            {chartType === 'prediction' ? 'AI Predictions & Analytics' : '3D Visualization'}
          </h3>
          
          {selectedStreams.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Activity className="w-4 h-4" />
              {selectedStreams.length} streams active
              {autoRefresh && (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Live
                </>
              )}
            </div>
          )}
        </div>

        {render3DChart()}
      </div>

      {/* Statistics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Performance Metrics
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
                      <span className="font-medium">{min.toFixed(2)}-{max.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Volatility:</span>
                      <span className="font-medium">{stream.volatility.toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            Prediction Accuracy
          </h3>
          <div className="space-y-3">
            {selectedStreams.map(streamId => {
              const stream = streams.find(s => s.id === streamId);
              if (!stream) return null;
              
              return (
                <div key={streamId} className="p-3 bg-purple-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{stream.name}</span>
                    <span className="text-sm font-semibold text-purple-700">
                      {stream.predictionAccuracy?.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-purple-200 rounded-full h-2 mt-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${stream.predictionAccuracy || 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-600" />
            Real-time Insights
          </h3>
          <div className="space-y-3">
            <div className="p-3 bg-orange-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Data Points:</span>
                <span className="font-medium">{chartData.length}</span>
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Update Rate:</span>
                <span className="font-medium">5s</span>
              </div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Prediction Status:</span>
                <span className="font-medium text-green-600">
                  {predictionModel ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Chart Type:</span>
                <span className="font-medium">{chartType.replace('-', ' ').toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
