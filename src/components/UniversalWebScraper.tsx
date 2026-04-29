import React, { useState, useEffect, useCallback } from 'react';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Bar, PieChart, Pie, Cell } from 'recharts';
import { 
  Globe, Plus, Trash2, Download, 
  DollarSign, Hash, Calendar, 
  Mail, Link, FileText, Activity, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import { webScraperService, ScrapedData, MonitoringConfig } from '../services/webScraperService';

interface ScrapedDataPoint {
  timestamp: string;
  url: string;
  value: number;
  type: 'price' | 'number' | 'wordCount' | 'linkCount';
  label: string;
}

export const UniversalWebScraper: React.FC = () => {
  const [urlInput, setUrlInput] = useState('');
  const [monitoringConfigs, setMonitoringConfigs] = useState<MonitoringConfig[]>([]);
  const [scrapedData, setScrapedData] = useState<Map<string, ScrapedData[]>>(new Map());
  const [selectedUrl, setSelectedUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [chartData, setChartData] = useState<ScrapedDataPoint[]>([]);
  const [scrapingInterval, setScrapingInterval] = useState(30);

  // Load monitoring configs
  useEffect(() => {
    const configs = webScraperService.getMonitoringConfigs();
    setMonitoringConfigs(configs);
    
    // Subscribe to data updates for existing monitors
    configs.forEach(config => {
      webScraperService.subscribe(config.url, (data: ScrapedData) => {
        setScrapedData(prev => {
          const newData = new Map(prev);
          const history = newData.get(config.url) || [];
          newData.set(config.url, [...history.slice(-100), data]);
          return newData;
        });
      });
    });

    return () => {
      webScraperService.stopAllMonitoring();
    };
  }, []);

  // Update chart data when scraped data changes
  useEffect(() => {
    const allData: ScrapedDataPoint[] = [];
    
    scrapedData.forEach((dataList, url) => {
      dataList.forEach(data => {
        // Add prices
        data.structuredData.prices.forEach((price, index) => {
          const numericPrice = parseFloat(price.price.replace(/[^0-9.]/g, ''));
          if (!isNaN(numericPrice)) {
            allData.push({
              timestamp: new Date(data.timestamp).toLocaleTimeString(),
              url,
              value: numericPrice,
              type: 'price',
              label: price.context
            });
          }
        });

        // Add numbers
        data.structuredData.numbers.forEach((number, index) => {
          allData.push({
            timestamp: new Date(data.timestamp).toLocaleTimeString(),
            url,
            value: number.value,
            type: 'number',
            label: number.context
          });
        });

        // Add word count
        allData.push({
          timestamp: new Date(data.timestamp).toLocaleTimeString(),
          url,
          value: data.metadata.wordCount,
          type: 'wordCount',
          label: 'Word Count'
        });

        // Add link count
        allData.push({
          timestamp: new Date(data.timestamp).toLocaleTimeString(),
          url,
          value: data.metadata.links.length,
          type: 'linkCount',
          label: 'Links Found'
        });
      });
    });

    setChartData(allData.sort((a, b) => a.timestamp.localeCompare(b.timestamp)));
  }, [scrapedData]);

  // Add new URL to monitor
  const startMonitoring = useCallback(async () => {
    if (!urlInput.trim()) {
      toast.error('Please enter a valid URL');
      return;
    }

    try {
      setIsScraping(true);
      toast.loading('🕷️ Connecting to website...', { id: 'scraping' });

      // Validate URL format
      let url = urlInput.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      // Test scrape first
      const testData = await webScraperService.scrapeWebsite(url);
      
      // Start monitoring
      webScraperService.startMonitoring(url, scrapingInterval);
      
      // Subscribe to updates
      webScraperService.subscribe(url, (data: ScrapedData) => {
        setScrapedData(prev => {
          const newData = new Map(prev);
          const history = newData.get(url) || [];
          newData.set(url, [...history.slice(-100), data]);
          return newData;
        });
      });

      // Update monitoring configs
      const configs = webScraperService.getMonitoringConfigs();
      setMonitoringConfigs(configs);
      
      setUrlInput('');
      setIsScraping(false);
      
      toast.success(`✅ Now monitoring: ${url}`, { id: 'scraping', duration: 3000 });
      
      // Show extracted data summary
      toast(`📊 Found: ${testData.structuredData.prices.length} prices, ${testData.structuredData.numbers.length} numbers`, {
        duration: 4000,
        icon: '🔍'
      });

    } catch (error) {
      setIsScraping(false);
      toast.error(`❌ Failed to scrape ${urlInput}`, { id: 'scraping' });
      console.error('Scraping error:', error);
    }
  }, [urlInput, scrapingInterval]);

  // Stop monitoring a URL
  const stopMonitoring = useCallback((url: string) => {
    webScraperService.stopMonitoring(url);
    
    const configs = webScraperService.getMonitoringConfigs();
    setMonitoringConfigs(configs);
    
    // Clean up scraped data
    setScrapedData(prev => {
      const newData = new Map(prev);
      newData.delete(url);
      return newData;
    });
    
    toast.success(`🛑 Stopped monitoring: ${url}`);
  }, []);

  // Get latest data for a URL
  const getLatestData = (url: string): ScrapedData | null => {
    const history = scrapedData.get(url) || [];
    return history.length > 0 ? history[history.length - 1] : null;
  };

  // Export scraped data
  const exportData = (url: string) => {
    const history = scrapedData.get(url) || [];
    if (history.length === 0) {
      toast.error('No data to export');
      return;
    }

    const csvContent = [
      ['Timestamp', 'Title', 'Word Count', 'Prices', 'Numbers', 'Links'],
      ...history.map(data => [
        data.timestamp,
        data.title,
        data.metadata.wordCount,
        data.structuredData.prices.map(p => p.price).join('; '),
        data.structuredData.numbers.map(n => n.value.toString()).join('; '),
        data.metadata.links.length.toString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `scraped-data-${new URL(url).hostname}-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(downloadUrl);

    toast.success('Data exported successfully');
  };

  // Get data type distribution
  const getDataTypeDistribution = () => {
    const distribution = { price: 0, number: 0, wordCount: 0, linkCount: 0 };
    
    chartData.forEach(point => {
      distribution[point.type]++;
    });

    return Object.entries(distribution).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: name === 'price' ? '#10B981' : name === 'number' ? '#3B82F6' : name === 'wordCount' ? '#F59E0B' : '#8B5CF6'
    }));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🕷️ Universal Web Scraper</h1>
          <p className="text-gray-600 mt-1">Monitor ANY website in real-time - Extract prices, numbers, and data</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Interval:</label>
            <select
              value={scrapingInterval}
              onChange={(e) => setScrapingInterval(Number(e.target.value))}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
            >
              <option value={10}>10s</option>
              <option value={30}>30s</option>
              <option value={60}>1min</option>
              <option value={300}>5min</option>
            </select>
          </div>
        </div>
      </div>

      {/* URL Input */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-purple-600" />
          Add Website to Monitor
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Enter any website URL (e.g., amazon.com, ebay.com, cnn.com)..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                startMonitoring();
              }
            }}
          />
          <button
            onClick={startMonitoring}
            disabled={isScraping || !urlInput.trim()}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isScraping ? (
              <>
                <Activity className="w-4 h-4 animate-spin" />
                Scraping...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Start Monitoring
              </>
            )}
          </button>
        </div>
        <div className="mt-3 text-sm text-gray-500">
          💡 Try: amazon.com, ebay.com, cnn.com, reddit.com, or any website!
        </div>
      </div>

      {/* Monitoring Status */}
      {monitoringConfigs.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-600" />
            Active Monitoring ({monitoringConfigs.length} sites)
          </h3>
          <div className="space-y-3">
            {monitoringConfigs.map((config) => {
              const latestData = getLatestData(config.url);
              return (
                <div key={config.url} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="w-4 h-4 text-gray-600" />
                      <span className="font-medium">{config.url}</span>
                      <div className={`w-2 h-2 rounded-full ${config.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <span className="text-xs text-gray-500">
                        {config.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {latestData && (
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {latestData.metadata.wordCount} words
                        </span>
                        {latestData.structuredData.prices.length > 0 && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {latestData.structuredData.prices.length} prices
                          </span>
                        )}
                        {latestData.structuredData.numbers.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            {latestData.structuredData.numbers.length} numbers
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(latestData.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => exportData(config.url)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                      title="Export data"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => stopMonitoring(config.url)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                      title="Stop monitoring"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Data Visualization */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Time Series Chart */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Real-Time Data Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <Line data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload[0]) {
                      const data = payload[0].payload as ScrapedDataPoint;
                      return (
                        <div className="bg-white p-3 border rounded-lg shadow-lg">
                          <p className="font-medium">{data.url}</p>
                          <p className="text-sm">{data.label}: {data.value}</p>
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
                  stroke="#8B5CF6" 
                  strokeWidth={2}
                  dot={{ fill: '#8B5CF6' }}
                />
              </Line>
            </ResponsiveContainer>
          </div>

          {/* Data Type Distribution */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Data Types Found</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={getDataTypeDistribution()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {getDataTypeDistribution().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Latest Scraped Content */}
      {scrapedData.size > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Latest Scraped Content</h3>
          <div className="space-y-4">
            {Array.from(scrapedData.entries()).map(([url, dataList]) => {
              const latest = dataList[dataList.length - 1];
              if (!latest) return null;
              
              return (
                <div key={url} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{latest.title}</h4>
                    <span className="text-sm text-gray-500">
                      {new Date(latest.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{latest.content}</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    {latest.structuredData.prices.length > 0 && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-green-600" />
                        <span>{latest.structuredData.prices.map(p => p.price).join(', ')}</span>
                      </div>
                    )}
                    {latest.structuredData.numbers.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Hash className="w-3 h-3 text-blue-600" />
                        <span>{latest.structuredData.numbers.map(n => n.value).join(', ')}</span>
                      </div>
                    )}
                    {latest.structuredData.emails.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-purple-600" />
                        <span>{latest.structuredData.emails.map(e => e.email).join(', ')}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Link className="w-3 h-3 text-gray-600" />
                      <span>{latest.metadata.links.length} links</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
        <h3 className="text-lg font-semibold mb-3">🚀 What can you monitor?</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-purple-700 mb-2">🛒 E-commerce Sites</h4>
            <p className="text-gray-600">Amazon, eBay, Shopify - Monitor prices, stock levels, product changes</p>
          </div>
          <div>
            <h4 className="font-medium text-blue-700 mb-2">📰 News & Media</h4>
            <p className="text-gray-600">CNN, BBC, Reddit - Track breaking news, trending topics, sentiment</p>
          </div>
          <div>
            <h4 className="font-medium text-green-700 mb-2">📊 Financial Data</h4>
            <p className="text-gray-600">Stock sites, crypto exchanges - Real-time prices, market data</p>
          </div>
        </div>
        <div className="mt-4 text-center text-sm text-gray-600">
          💡 <strong>Pro tip:</strong> The scraper automatically detects prices, numbers, emails, dates, and tracks changes over time!
        </div>
      </div>
    </div>
  );
};
