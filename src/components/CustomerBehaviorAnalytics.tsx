import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Activity, ShoppingCart, Eye, MousePointer, Search, 
  TrendingUp, TrendingDown, AlertTriangle, Target, Zap, 
  Globe, Smartphone, Monitor, Tablet, Clock, DollarSign,
  Brain, Heart, Star, UserCheck, UserX, MapPin, Filter
} from 'lucide-react';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Bar, PieChart, Pie, Cell, Area } from 'recharts';
import toast from 'react-hot-toast';
import { 
  customerAnalyticsService, 
  CustomerActivity, 
  CustomerProfile, 
  BehaviorPattern,
  ConversionFunnel 
} from '../services/customerAnalyticsService';

interface RealTimeMetrics {
  activeUsers: number;
  totalPageViews: number;
  purchases: number;
  addToCarts: number;
  totalRevenue: number;
  conversionRate: number;
  cartAbandonRate: number;
  deviceBreakdown: Record<string, number>;
  locationBreakdown: Record<string, number>;
  timestamp: string;
}

export const CustomerBehaviorAnalytics: React.FC = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics | null>(null);
  const [recentActivities, setRecentActivities] = useState<CustomerActivity[]>([]);
  const [customerProfiles, setCustomerProfiles] = useState<CustomerProfile[]>([]);
  const [behaviorPatterns, setBehaviorPatterns] = useState<BehaviorPattern[]>([]);
  const [conversionFunnel, setConversionFunnel] = useState<ConversionFunnel[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [customerJourney, setCustomerJourney] = useState<CustomerActivity[]>([]);

  // Start customer tracking
  const startTracking = useCallback(() => {
    console.log('🎯 Starting customer behavior tracking...');
    setIsTracking(true);
    
    // Subscribe to real-time updates
    customerAnalyticsService.subscribe('customer_activity', (activity: CustomerActivity) => {
      setRecentActivities(prev => [activity, ...prev.slice(0, 49)]);
    });
    
    customerAnalyticsService.subscribe('metrics_update', (metrics: RealTimeMetrics) => {
      setRealTimeMetrics(metrics);
    });
    
    customerAnalyticsService.subscribe('behavior_patterns', (data: { customerId: string, patterns: BehaviorPattern[] }) => {
      setBehaviorPatterns(prev => {
        const filtered = prev.filter(p => p.customerId !== data.customerId);
        return [...data.patterns, ...filtered].slice(0, 20);
      });
    });
    
    // Start the tracking service
    customerAnalyticsService.startCustomerTracking();
    
    toast.success('🎯 Customer behavior tracking started!', { 
      icon: '👁️',
      duration: 3000 
    });
  }, []);

  // Stop customer tracking
  const stopTracking = useCallback(() => {
    console.log('🛑 Stopping customer tracking...');
    setIsTracking(false);
    customerAnalyticsService.stopTracking();
    
    toast.success('🛑 Customer tracking stopped', { 
      icon: '🔌',
      duration: 2000 
    });
  }, []);

  // Load customer profiles and funnel data
  useEffect(() => {
    const loadData = () => {
      setCustomerProfiles(customerAnalyticsService.getCustomerProfiles());
      setConversionFunnel(customerAnalyticsService.getConversionFunnel());
      setBehaviorPatterns(customerAnalyticsService.getBehaviorPatterns());
    };

    // Initial load
    loadData();
    
    // Update every 5 seconds
    const interval = setInterval(loadData, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Get customer journey when customer is selected
  useEffect(() => {
    if (selectedCustomer) {
      const journey = customerAnalyticsService.getCustomerJourney(selectedCustomer);
      setCustomerJourney(journey);
    }
  }, [selectedCustomer]);

  // Format action for display
  const formatAction = (action: CustomerActivity['action']) => {
    const actionConfig = {
      view: { icon: Eye, color: 'text-blue-600', label: 'Page View' },
      click: { icon: MousePointer, color: 'text-green-600', label: 'Click' },
      purchase: { icon: ShoppingCart, color: 'text-purple-600', label: 'Purchase' },
      add_to_cart: { icon: ShoppingCart, color: 'text-orange-600', label: 'Add to Cart' },
      search: { icon: Search, color: 'text-indigo-600', label: 'Search' },
      login: { icon: UserCheck, color: 'text-teal-600', label: 'Login' },
      logout: { icon: UserX, color: 'text-red-600', label: 'Logout' },
      scroll: { icon: Activity, color: 'text-gray-600', label: 'Scroll' },
      hover: { icon: MousePointer, color: 'text-pink-600', label: 'Hover' }
    };
    
    const config = actionConfig[action];
    const Icon = config.icon;
    
    return { Icon, color: config.color, label: config.label };
  };

  // Get device icon
  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'mobile': return Smartphone;
      case 'desktop': return Monitor;
      case 'tablet': return Tablet;
      default: return Monitor;
    }
  };

  // Prepare chart data
  const metricsHistory = realTimeMetrics ? [realTimeMetrics] : [];
  
  const deviceData = Object.entries(realTimeMetrics?.deviceBreakdown || {}).map(([device, count]) => ({
    name: device.charAt(0).toUpperCase() + device.slice(1),
    value: count,
    color: device === 'mobile' ? '#3B82F6' : device === 'desktop' ? '#10B981' : '#F59E0B'
  }));

  const locationData = Object.entries(realTimeMetrics?.locationBreakdown || {})
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([location, count]) => ({
      location,
      count
    }));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🎯 Customer Behavior Analytics</h1>
          <p className="text-gray-600 mt-1">Real-time customer tracking and behavior insights</p>
        </div>
        <button
          onClick={isTracking ? stopTracking : startTracking}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            isTracking 
              ? 'bg-red-600 hover:bg-red-700 text-white' 
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            {isTracking ? (
              <>
                <Activity className="w-4 h-4 animate-pulse" />
                Stop Tracking
              </>
            ) : (
              <>
                <Target className="w-4 h-4" />
                Start Tracking
              </>
            )}
          </div>
        </button>
      </div>

      {/* Real-time Metrics */}
      {realTimeMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-blue-600">{realTimeMetrics.activeUsers}</p>
                <p className="text-xs text-gray-500 mt-1">Last 5 minutes</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Page Views</p>
                <p className="text-2xl font-bold text-green-600">{realTimeMetrics.totalPageViews}</p>
                <p className="text-xs text-gray-500 mt-1">Last 5 minutes</p>
              </div>
              <Eye className="w-8 h-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversions</p>
                <p className="text-2xl font-bold text-purple-600">{realTimeMetrics.purchases}</p>
                <p className="text-xs text-gray-500 mt-1">{realTimeMetrics.conversionRate.toFixed(1)}% rate</p>
              </div>
              <ShoppingCart className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Revenue</p>
                <p className="text-2xl font-bold text-orange-600">${realTimeMetrics.totalRevenue.toFixed(0)}</p>
                <p className="text-xs text-gray-500 mt-1">Last 5 minutes</p>
              </div>
              <DollarSign className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Device Breakdown */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Device Usage</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={deviceData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {deviceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Locations */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Top Locations
          </h3>
          <div className="space-y-2">
            {locationData.map((location, index) => (
              <div key={location.location} className="flex justify-between items-center">
                <span className="text-sm font-medium">{location.location}</span>
                <span className="text-sm text-gray-600">{location.count} visits</span>
              </div>
            ))}
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Conversion Funnel</h3>
          <ResponsiveContainer width="100%" height={250}>
            <Bar data={conversionFunnel} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="stage" type="category" width={80} />
              <Tooltip />
              <Bar dataKey="customers" fill="#8B5CF6" />
            </Bar>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Customer Segments */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Customer Segments</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {['new', 'returning', 'vip', 'at_risk'].map(segment => {
            const segmentCustomers = customerProfiles.filter(p => p.segment === segment);
            const count = segmentCustomers.length;
            const avgScore = segmentCustomers.length > 0 
              ? segmentCustomers.reduce((sum, p) => sum + p.behaviorScore, 0) / segmentCustomers.length 
              : 0;
            
            const segmentConfig = {
              new: { icon: Star, color: 'text-blue-600', bgColor: 'bg-blue-50', label: 'New' },
              returning: { icon: Heart, color: 'text-green-600', bgColor: 'bg-green-50', label: 'Returning' },
              vip: { icon: Zap, color: 'text-purple-600', bgColor: 'bg-purple-50', label: 'VIP' },
              at_risk: { icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-50', label: 'At Risk' }
            };
            
            const config = segmentConfig[segment as keyof typeof segmentConfig];
            const Icon = config.icon;
            
            return (
              <div key={segment} className={`p-4 rounded-lg ${config.bgColor} border border-gray-200`}>
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`w-5 h-5 ${config.color}`} />
                  <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-xs text-gray-600">Avg Score: {avgScore.toFixed(0)}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Live Customer Activity</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {recentActivities.map((activity) => {
            const actionConfig = formatAction(activity.action);
            const DeviceIcon = getDeviceIcon(activity.device);
            const ActionIcon = actionConfig.Icon;
            
            return (
              <div key={activity.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <ActionIcon className={`w-4 h-4 ${actionConfig.color}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{activity.customerId}</span>
                    <span className="text-xs text-gray-500">{actionConfig.label}</span>
                    {activity.product && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {activity.product}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                    <span>{activity.page}</span>
                    <DeviceIcon className="w-3 h-3" />
                    <span>{activity.location}</span>
                    <Clock className="w-3 h-3" />
                    <span>{new Date(activity.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Behavior Patterns */}
      {behaviorPatterns.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            Detected Behavior Patterns
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {behaviorPatterns.map((pattern) => (
              <div key={pattern.id} className="p-4 border border-purple-200 rounded-lg bg-purple-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-purple-900">{pattern.pattern.replace('_', ' ').toUpperCase()}</span>
                  <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded">
                    {(pattern.confidence * 100).toFixed(0)}% confidence
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-1">{pattern.description}</p>
                <p className="text-xs text-gray-500">
                  Customer: {pattern.customerId} | {new Date(pattern.detectedAt).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Status */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isTracking ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-sm font-medium">
              {isTracking ? '🎯 CUSTOMER TRACKING ACTIVE' : '🔌 TRACKING INACTIVE'}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            {isTracking ? 'Monitoring customer behavior in real-time' : 'Click "Start Tracking" to begin monitoring'}
          </div>
        </div>
      </div>
    </div>
  );
};
