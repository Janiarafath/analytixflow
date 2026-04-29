import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  LineChart, BarChart, PieChart, Loader2, Download,
  Brain, RefreshCw, FileDown, BarChart3, Edit3
} from 'lucide-react';
import { AIChatInterface } from './AIChatInterface';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar, Pie, Doughnut, Radar, PolarArea } from 'react-chartjs-2';
import { LineChart as RechartsLine, BarChart as RechartsBar, PieChart as RechartsPie, 
         XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend as RechartsLegend, 
         ResponsiveContainer, Area, AreaChart, ScatterChart, Scatter } from 'recharts';
import { useAuth } from '../contexts/AuthContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface ColumnSuggestion {
  name: string;
  type: string;
  description: string;
  action?: string;
}

interface DataInsight {
  title: string;
  description: string;
  type: 'info' | 'warning' | 'success' | 'action';
  action?: () => void;
}

interface Correlation {
  column1: string;
  column2: string;
  score: number;
}

interface AISuggestion {
  id: string;
  type: 'add_column' | 'remove_rows' | 'transform_data' | 'create_chart' | 'filter_data';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  action: () => void;
}

export const EnhancedDataAnalysis = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [originalData, setOriginalData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [selectedChartType, setSelectedChartType] = useState<'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'doughnut' | 'radar'>('line');
  const [previewRows, setPreviewRows] = useState<number>(10);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<'visualize' | 'analyze' | 'transform'>('visualize');
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [dataInsights, setDataInsights] = useState<DataInsight[]>([]);
  const [correlations, setCorrelations] = useState<Correlation[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [chartData, setChartData] = useState<any>(null);
  const [filterConditions, setFilterConditions] = useState<Array<{column: string, operator: string, value: string}>>([]);

  // Load data from localStorage on component mount
  useEffect(() => {
    const storedData = localStorage.getItem('etl_processed_data');
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        if (Array.isArray(parsedData) && parsedData.length > 0) {
          setData(parsedData);
          setOriginalData(parsedData);
          setColumns(Object.keys(parsedData[0]));
          toast.success('Loaded processed data from ETL');
          generateDataInsights(parsedData, Object.keys(parsedData[0]));
        }
      } catch (error) {
        toast.error('Error loading stored data');
      }
    }
  }, []);

  // Generate data insights
  const generateDataInsights = (data: any[], columns: string[]) => {
    const insights: DataInsight[] = [];
    
    // Row count insight
    insights.push({
      title: 'Dataset Overview',
      description: `Your dataset contains ${data.length} rows and ${columns.length} columns`,
      type: 'info'
    });

    // Missing values analysis
    columns.forEach(column => {
      const missingCount = data.filter(row => !row[column] || row[column] === '').length;
      if (missingCount > 0) {
        insights.push({
          title: `Missing Values in ${column}`,
          description: `${missingCount} rows have missing or empty values in ${column}`,
          type: 'warning',
          action: () => handleRemoveMissingValues(column)
        });
      }
    });

    // Data type suggestions
    columns.forEach(column => {
      const values = data.map(row => row[column]);
      const numericCount = values.filter(v => !isNaN(parseFloat(v))).length;
      const dateCount = values.filter(v => !isNaN(Date.parse(v))).length;
      
      if (numericCount > values.length * 0.8) {
        insights.push({
          title: `Convert ${column} to Number`,
          description: `${column} appears to be numeric and could be converted for better analysis`,
          type: 'action',
          action: () => handleConvertToNumeric(column)
        });
      }
    });

    setDataInsights(insights);
  };

  // Generate AI suggestions
  const generateAISuggestions = useCallback(async () => {
    if (!data.length) {
      toast.error('Please upload data first');
      return;
    }

    setIsGeneratingSuggestions(true);
    try {
      const suggestions: AISuggestion[] = [];
      
      // Suggest adding calculated columns
      const numericColumns = columns.filter(col => {
        const values = data.map(row => parseFloat(row[col])).filter(v => !isNaN(v));
        return values.length > data.length * 0.5;
      });

      if (numericColumns.length >= 2) {
        suggestions.push({
          id: 'add_ratio',
          type: 'add_column',
          title: 'Add Ratio Column',
          description: `Create a ratio column using ${numericColumns[0]} and ${numericColumns[1]}`,
          impact: 'medium',
          action: () => handleAddRatioColumn(numericColumns[0], numericColumns[1])
        });
      }

      // Suggest removing outliers
      numericColumns.forEach(column => {
        const values = data.map(row => parseFloat(row[column])).filter(v => !isNaN(v));
        if (values.length > 0) {
          const mean = values.reduce((a, b) => a + b, 0) / values.length;
          const stdDev = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length);
          const outliers = values.filter(v => Math.abs(v - mean) > 2 * stdDev);
          
          if (outliers.length > 0) {
            suggestions.push({
              id: `remove_outliers_${column}`,
              type: 'remove_rows',
              title: `Remove Outliers from ${column}`,
              description: `Remove ${outliers.length} outliers from ${column} for cleaner analysis`,
              impact: 'high',
              action: () => handleRemoveOutliers(column)
            });
          }
        }
      });

      // Suggest creating summary columns
      if (numericColumns.length > 0) {
        suggestions.push({
          id: 'add_summary',
          type: 'add_column',
          title: 'Add Summary Statistics',
          description: 'Add mean, median, and standard deviation columns for numeric data',
          impact: 'medium',
          action: () => handleAddSummaryColumns(numericColumns)
        });
      }

      // Suggest best chart types
      if (selectedColumns.length > 0) {
        const chartType = recommendChartType(selectedColumns, data);
        suggestions.push({
          id: 'recommend_chart',
          type: 'create_chart',
          title: `Try ${chartType} Chart`,
          description: `${chartType} chart would work best for your selected columns`,
          impact: 'low',
          action: () => setSelectedChartType(chartType.toLowerCase() as any)
        });
      }

      setAiSuggestions(suggestions);
      toast.success(`Generated ${suggestions.length} AI suggestions`);
    } catch (error) {
      toast.error('Failed to generate suggestions');
    } finally {
      setIsGeneratingSuggestions(false);
    }
  }, [data, columns, selectedColumns]);

  // Recommend chart type based on data
  const recommendChartType = (selectedCols: string[], data: any[]): string => {
    const numericCols = selectedCols.filter(col => {
      const values = data.map(row => parseFloat(row[col])).filter(v => !isNaN(v));
      return values.length > data.length * 0.5;
    });

    if (numericCols.length === 1) {
      return 'Line';
    } else if (numericCols.length === 2) {
      return 'Scatter';
    } else if (numericCols.length > 2) {
      return 'Bar';
    } else {
      return 'Pie';
    }
  };

  // Handle AI suggestion actions
  const handleAddRatioColumn = (col1: string, col2: string) => {
    const newColName = `${col1}_to_${col2}_ratio`;
    const updatedData = data.map(row => {
      const val1 = parseFloat(row[col1]);
      const val2 = parseFloat(row[col2]);
      const ratio = val2 !== 0 ? val1 / val2 : 0;
      return { ...row, [newColName]: ratio };
    });
    
    setData(updatedData);
    setColumns([...columns, newColName]);
    toast.success(`Added ${newColName} column`);
    generateDataInsights(updatedData, [...columns, newColName]);
  };

  const handleRemoveOutliers = (column: string) => {
    const values = data.map(row => parseFloat(row[column])).filter(v => !isNaN(v));
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length);
    
    const updatedData = data.filter(row => {
      const val = parseFloat(row[column]);
      return isNaN(val) || Math.abs(val - mean) <= 2 * stdDev;
    });
    
    setData(updatedData);
    toast.success(`Removed outliers from ${column}`);
    generateDataInsights(updatedData, columns);
  };

  const handleConvertToNumeric = (column: string) => {
    const updatedData = data.map(row => ({
      ...row,
      [column]: parseFloat(row[column]) || 0
    }));
    
    setData(updatedData);
    toast.success(`Converted ${column} to numeric`);
  };

  const handleAddSummaryColumns = (numericCols: string[]) => {
    const updatedData = data.map(row => {
      const newRow = { ...row };
      numericCols.forEach(col => {
        const values = data.map(r => parseFloat(r[col])).filter(v => !isNaN(v));
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const median = values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
        const stdDev = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length);
        
        newRow[`${col}_mean`] = mean;
        newRow[`${col}_median`] = median;
        newRow[`${col}_stddev`] = stdDev;
      });
      return newRow;
    });
    
    const newCols = numericCols.flatMap(col => [`${col}_mean`, `${col}_median`, `${col}_stddev`]);
    setData(updatedData);
    setColumns([...columns, ...newCols]);
    toast.success('Added summary statistics columns');
  };

  const handleRemoveMissingValues = (column: string) => {
    const updatedData = data.filter(row => row[column] && row[column] !== '');
    setData(updatedData);
    toast.success(`Removed rows with missing values in ${column}`);
    generateDataInsights(updatedData, columns);
  };

  // Prepare chart data
  const prepareChartData = useCallback(() => {
    if (selectedColumns.length === 0 || !data.length) return null;

    try {
      const labels = data.map((_, index) => `Row ${index + 1}`);
      const datasets = selectedColumns.map((col, index) => {
        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
        const values = data.map(row => {
          const val = parseFloat(row[col]);
          return isNaN(val) ? 0 : val;
        });
        
        return {
          label: col,
          data: values,
          borderColor: colors[index % colors.length],
          backgroundColor: colors[index % colors.length] + '40',
          tension: 0.1
        };
      });

      return { labels, datasets };
    } catch (error) {
      console.error('Error preparing chart data:', error);
      return null;
    }
  }, [data, selectedColumns]);

  // Update chart data when dependencies change
  useEffect(() => {
    setChartData(prepareChartData());
  }, [prepareChartData]);

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        let parsedData: any[] = [];

        if (file.name.endsWith('.csv')) {
          const result = Papa.parse(content, { header: true });
          parsedData = result.data as any[];
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          const workbook = XLSX.read(content, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          parsedData = XLSX.utils.sheet_to_json(worksheet);
        }

        if (parsedData.length > 0) {
          setData(parsedData);
          setOriginalData(parsedData);
          setColumns(Object.keys(parsedData[0]));
          toast.success(`Loaded ${parsedData.length} rows from ${file.name}`);
          generateDataInsights(parsedData, Object.keys(parsedData[0]));
        }
      } catch (error) {
        toast.error('Error parsing file');
      } finally {
        setLoading(false);
      }
    };

    reader.readAsText(file);
  };

  // Export data
  const exportData = () => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'enhanced_data.csv';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported successfully');
  };

  // Reset data
  const resetData = () => {
    setData(originalData);
    setColumns(Object.keys(originalData[0]));
    setSelectedColumns([]);
    toast.success('Data reset to original');
  };

  // Render chart based on type
  const renderChart = () => {
    if (!chartData || !chartData.labels || !chartData.datasets) {
      return <div className="text-center text-gray-500 py-8">No data available for visualization</div>;
    }

    try {
      switch (selectedChartType) {
        case 'line':
          const lineData = chartData.labels.map((label, i) => {
            const dataPoint: any = { name: label };
            chartData.datasets.forEach(dataset => {
              if (dataset.data && dataset.data[i] !== undefined) {
                dataPoint[dataset.label] = dataset.data[i];
              }
            });
            return dataPoint;
          });

          return (
            <ResponsiveContainer width="100%" height={400}>
              <RechartsLine data={lineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip />
                <RechartsLegend />
                {chartData.datasets.map((dataset, index) => (
                  <Line
                    key={dataset.label}
                    type="monotone"
                    dataKey={dataset.label}
                    stroke={dataset.borderColor}
                    strokeWidth={2}
                  />
                ))}
              </RechartsLine>
            </ResponsiveContainer>
          );
      
      case 'bar':
          const barData = chartData.labels.map((label, i) => {
            const dataPoint: any = { name: label };
            chartData.datasets.forEach(dataset => {
              if (dataset.data && dataset.data[i] !== undefined) {
                dataPoint[dataset.label] = dataset.data[i];
              }
            });
            return dataPoint;
          });

          return (
            <ResponsiveContainer width="100%" height={400}>
              <RechartsBar data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip />
                <RechartsLegend />
                {chartData.datasets.map((dataset, index) => (
                  <Bar
                    key={dataset.label}
                    dataKey={dataset.label}
                    fill={dataset.backgroundColor}
                  />
                ))}
              </RechartsBar>
            </ResponsiveContainer>
          );
      
      case 'area':
          const areaData = chartData.labels.map((label, i) => {
            const dataPoint: any = { name: label };
            chartData.datasets.forEach(dataset => {
              if (dataset.data && dataset.data[i] !== undefined) {
                dataPoint[dataset.label] = dataset.data[i];
              }
            });
            return dataPoint;
          });

          return (
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={areaData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip />
                <RechartsLegend />
                {chartData.datasets.map((dataset, index) => (
                  <Area
                    key={dataset.label}
                    type="monotone"
                    dataKey={dataset.label}
                    stroke={dataset.borderColor}
                    fill={dataset.backgroundColor}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          );
      
      case 'scatter':
        if (selectedColumns.length >= 2) {
          const scatterData = data.map(row => ({
            x: parseFloat(row[selectedColumns[0]]) || 0,
            y: parseFloat(row[selectedColumns[1]]) || 0
          }));
          
          return (
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="x" name={selectedColumns[0]} />
                <YAxis dataKey="y" name={selectedColumns[1]} />
                <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter name="Data Points" data={scatterData} fill="#3B82F6" />
              </ScatterChart>
            </ResponsiveContainer>
          );
        }
        return <div className="text-center text-gray-500 py-8">Select at least 2 columns for scatter plot</div>;
      
      case 'pie':
        if (selectedColumns.length === 1) {
          const pieData = data.map((row, index) => ({
            name: `Item ${index + 1}`,
            value: parseFloat(row[selectedColumns[0]]) || 0
          }));
          
          return (
            <ResponsiveContainer width="100%" height={400}>
              <RechartsPie>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index % 5]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </RechartsPie>
            </ResponsiveContainer>
          );
        }
        return <div className="text-center text-gray-500 py-8">Select exactly 1 column for pie chart</div>;
      
      default:
        return <div className="text-center text-gray-500 py-8">Chart type not supported</div>;
    }
    } catch (error) {
      console.error('Error rendering chart:', error);
      return <div className="text-center text-red-500 py-8">Error rendering chart. Please try different chart type or columns.</div>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📊 Enhanced Data Analysis</h1>
            <p className="text-gray-600 mt-1">Advanced visualization with AI-powered suggestions</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={generateAISuggestions}
              disabled={isGeneratingSuggestions || !data.length}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isGeneratingSuggestions ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4" />
                  AI Suggestions
                </>
              )}
            </button>
            
            <button
              onClick={exportData}
              disabled={!data.length}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            
            <button
              onClick={resetData}
              disabled={!data.length}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>

        {/* File Upload */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <FileDown className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">Upload your data file</p>
            <p className="text-sm text-gray-500">CSV, Excel files supported</p>
          </label>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {[
              { id: 'visualize', name: 'Visualize', icon: BarChart3 },
              { id: 'analyze', name: 'Analyze', icon: Brain },
              { id: 'transform', name: 'Transform', icon: Edit3 }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'visualize' && (
            <div className="space-y-6">
              {/* Column Selection */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Select Columns for Visualization</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {columns.map(column => (
                    <label key={column} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedColumns.includes(column)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedColumns(prev => [...prev, column]);
                          } else {
                            setSelectedColumns(prev => prev.filter(col => col !== column));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium">{column}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Chart Type Selection */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Chart Type</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { type: 'line', icon: LineChart, label: 'Line Chart' },
                    { type: 'bar', icon: BarChart, label: 'Bar Chart' },
                    { type: 'area', icon: AreaChart, label: 'Area Chart' },
                    { type: 'scatter', icon: ScatterChart, label: 'Scatter Plot' },
                    { type: 'pie', icon: PieChart, label: 'Pie Chart' }
                  ].map(({ type, icon: Icon, label }) => (
                    <button
                      key={type}
                      onClick={() => setSelectedChartType(type as any)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedChartType === type
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon className={`w-6 h-6 mx-auto mb-2 ${
                        selectedChartType === type ? 'text-blue-600' : 'text-gray-600'
                      }`} />
                      <div className="text-sm font-medium">{label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart Display */}
              {selectedColumns.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    {selectedChartType.charAt(0).toUpperCase() + selectedChartType.slice(1)} Chart
                  </h3>
                  {renderChart()}
                </div>
              )}
            </div>
          )}

          {activeTab === 'analyze' && (
            <div className="space-y-6">
              {/* Data Insights */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Data Insights</h3>
                <div className="space-y-3">
                  {dataInsights.map((insight, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        insight.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                        insight.type === 'success' ? 'bg-green-50 border-green-200' :
                        insight.type === 'action' ? 'bg-blue-50 border-blue-200' :
                        'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium mb-1">{insight.title}</h4>
                          <p className="text-sm text-gray-600">{insight.description}</p>
                        </div>
                        {insight.action && (
                          <button
                            onClick={insight.action}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            Apply
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Suggestions */}
              {aiSuggestions.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">AI-Powered Suggestions</h3>
                  <div className="space-y-3">
                    {aiSuggestions.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        className={`p-4 rounded-lg border ${
                          suggestion.impact === 'high' ? 'bg-red-50 border-red-200' :
                          suggestion.impact === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                          'bg-green-50 border-green-200'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{suggestion.title}</h4>
                              <span className={`px-2 py-1 text-xs rounded ${
                                suggestion.impact === 'high' ? 'bg-red-200 text-red-800' :
                                suggestion.impact === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                                'bg-green-200 text-green-800'
                              }`}>
                                {suggestion.impact} impact
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{suggestion.description}</p>
                          </div>
                          <button
                            onClick={suggestion.action}
                            className="ml-4 px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'transform' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Data Transformation</h3>
                <p className="text-gray-600 mb-4">Apply transformations to your data</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Current Data</h4>
                    <p className="text-sm text-gray-600">{data.length} rows, {columns.length} columns</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Transformations Applied</h4>
                    <p className="text-sm text-gray-600">No transformations yet</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Chat Panel */}
      {showAiPanel && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">AI Data Assistant</h3>
            <button
              onClick={() => setShowAiPanel(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
          
          <AIChatInterface
            data={data}
            columns={columns}
            onSendMessage={async (message) => {
              // Enhanced AI responses with actionable suggestions
              const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  question: message,
                  dataSample: data.slice(0, 10),
                  columns,
                  dataProfile: []
                }),
              });
              
              const json = await response.json();
              return json.answer || 'No response received.';
            }}
          />
        </div>
      )}

      {/* AI Chat Panel */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            AI Data Assistant
          </h3>
          <button
            onClick={() => setShowAiPanel(!showAiPanel)}
            className="text-purple-600 hover:text-purple-700 font-medium"
          >
            {showAiPanel ? 'Hide' : 'Show'} Chat
          </button>
        </div>
        
        {showAiPanel && (
          <AIChatInterface
            data={data}
            columns={columns}
            onSendMessage={async (message) => {
              try {
                const response = await fetch('/api/ai/chat', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    question: message,
                    dataSample: data.slice(0, 10),
                    columns,
                    dataProfile: []
                  }),
                });
                
                const json = await response.json();
                if (!response.ok) {
                  throw new Error(json?.message || 'Failed to get response');
                }
                return json.answer || 'No response received.';
              } catch (error) {
                console.error('AI Chat error:', error);
                return 'Sorry, I encountered an error processing your request. Please try again.';
              }
            }}
          />
        )}
      </div>

      {/* Data Preview */}
      {data.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Data Preview</h3>
            <select
              value={previewRows}
              onChange={(e) => setPreviewRows(parseInt(e.target.value))}
              className="px-3 py-1 border border-gray-300 rounded"
            >
              <option value={5}>5 rows</option>
              <option value={10}>10 rows</option>
              <option value={25}>25 rows</option>
              <option value={50}>50 rows</option>
            </select>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map(column => (
                    <th key={column} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.slice(0, previewRows).map((row, index) => (
                  <tr key={index}>
                    {columns.map(column => (
                      <td key={column} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row[column]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
