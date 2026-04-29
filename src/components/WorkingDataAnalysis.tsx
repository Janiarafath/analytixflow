import React, { useState, useCallback, useEffect } from 'react';
import {
  LineChart, BarChart, PieChart, Loader2, Download,
  Brain, RefreshCw, FileDown, BarChart3, Edit3
} from 'lucide-react';
import { AIChatInterface } from './AIChatInterface';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import {
  Line, Bar, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, ScatterChart, Scatter, AreaChart
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';

export const WorkingDataAnalysis = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [originalData, setOriginalData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [selectedChartType, setSelectedChartType] = useState<'line' | 'bar' | 'area' | 'scatter' | 'pie'>('line');
  const [showAiChat, setShowAiChat] = useState(false);
  const [chartData, setChartData] = useState<any>(null);
  const [aiSuggestions, setAiSuggestions] = useState<Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    action: () => void;
  }>>([]);

  // Load data from localStorage or generate sample data
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
          return;
        }
      } catch (error) {
        toast.error('Error loading stored data');
      }
    }

    // Generate sample data if no ETL data exists
    const sampleData = [
      { date: '2024-01-01', sales: 1200, customers: 45, revenue: 2400, profit: 800, category: 'Electronics' },
      { date: '2024-01-02', sales: 1500, customers: 52, revenue: 3000, profit: 1200, category: 'Electronics' },
      { date: '2024-01-03', sales: 800, customers: 31, revenue: 1600, profit: 400, category: 'Clothing' },
      { date: '2024-01-04', sales: 2000, customers: 68, revenue: 4000, profit: 2000, category: 'Electronics' },
      { date: '2024-01-05', sales: 1100, customers: 42, revenue: 2200, profit: 700, category: 'Clothing' },
      { date: '2024-01-06', sales: 1800, customers: 61, revenue: 3600, profit: 1600, category: 'Electronics' },
      { date: '2024-01-07', sales: 900, customers: 35, revenue: 1800, profit: 500, category: 'Clothing' },
      { date: '2024-01-08', sales: 2200, customers: 75, revenue: 4400, profit: 2400, category: 'Electronics' },
      { date: '2024-01-09', sales: 1300, customers: 48, revenue: 2600, profit: 900, category: 'Clothing' },
      { date: '2024-01-10', sales: 1700, customers: 58, revenue: 3400, profit: 1400, category: 'Electronics' }
    ];

    setData(sampleData);
    setOriginalData(sampleData);
    setColumns(Object.keys(sampleData[0]));
    toast.success('Using sample data - Upload your own CSV/Excel file to replace');
  }, []);

  // Prepare chart data safely
  const prepareChartData = useCallback(() => {
    if (selectedColumns.length === 0 || !data.length) return null;

    try {
      console.log('Preparing chart data:', { selectedColumns, selectedChartType, dataLength: data.length });

      // For line, bar, area charts
      if (selectedChartType !== 'pie') {
        const chartData = data.map((row, index) => {
          const dataPoint: any = { name: row.date || `Row ${index + 1}` };
          selectedColumns.forEach(col => {
            const value = parseFloat(row[col]);
            dataPoint[col] = isNaN(value) ? 0 : value;
          });
          return dataPoint;
        });
        console.log('Generated chart data:', chartData);
        return chartData;
      }

      // For pie chart - use first selected column
      if (selectedChartType === 'pie' && selectedColumns.length === 1) {
        const pieData = data.map((row, index) => ({
          name: row.date || `Item ${index + 1}`,
          value: parseFloat(row[selectedColumns[0]]) || 0
        }));
        console.log('Generated pie data:', pieData);
        return pieData;
      }

      return null;
    } catch (error) {
      console.error('Error preparing chart data:', error);
      return null;
    }
  }, [data, selectedColumns, selectedChartType]);

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
    link.download = 'data.csv';
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

  // Generate AI suggestions
  const generateAISuggestions = () => {
    const suggestions = [];
    
    // Check for missing values
    columns.forEach(column => {
      const missingCount = data.filter(row => !row[column] || row[column] === '').length;
      if (missingCount > 0) {
        suggestions.push({
          id: `missing_${column}`,
          type: 'clean_data',
          title: `Remove Missing Values from ${column}`,
          description: `Remove ${missingCount} rows with missing values`,
          action: () => {
            const cleanedData = data.filter(row => row[column] && row[column] !== '');
            setData(cleanedData);
            toast.success(`Removed ${missingCount} rows with missing values`);
          }
        });
      }
    });

    // Check numeric columns for transformations
    const numericColumns = columns.filter(col => {
      const values = data.map(row => parseFloat(row[col])).filter(v => !isNaN(v));
      return values.length > data.length * 0.5;
    });

    if (numericColumns.length >= 2) {
      suggestions.push({
        id: 'add_ratio',
        type: 'transform',
        title: `Add Ratio Column`,
        description: `Create ratio using ${numericColumns[0]} and ${numericColumns[1]}`,
        action: () => {
          const newColName = `${numericColumns[0]}_to_${numericColumns[1]}_ratio`;
          const updatedData = data.map(row => {
            const val1 = parseFloat(row[numericColumns[0]]);
            const val2 = parseFloat(row[numericColumns[1]]);
            const ratio = val2 !== 0 ? val1 / val2 : 0;
            return { ...row, [newColName]: ratio };
          });
          setData(updatedData);
          setColumns([...columns, newColName]);
          toast.success(`Added ${newColName} column`);
        }
      });
    }

    setAiSuggestions(suggestions);
    toast.success(`Generated ${suggestions.length} AI suggestions`);
  };

  // Render chart
  const renderChart = () => {
    if (!chartData) {
      return (
        <div className="text-center py-8 text-gray-500">
          {selectedColumns.length === 0 
            ? "Please select columns to visualize" 
            : "No data available for visualization"}
        </div>
      );
    }

    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

    try {
      switch (selectedChartType) {
        case 'line':
          return (
            <ResponsiveContainer width="100%" height={400}>
              <Line data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                {selectedColumns.map((col, index) => (
                  <Line
                    key={col}
                    type="monotone"
                    dataKey={col}
                    stroke={colors[index % colors.length]}
                    strokeWidth={2}
                  />
                ))}
              </Line>
            </ResponsiveContainer>
          );

        case 'bar':
          return (
            <ResponsiveContainer width="100%" height={400}>
              <Bar data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                {selectedColumns.map((col, index) => (
                  <Bar
                    key={col}
                    dataKey={col}
                    fill={colors[index % colors.length]}
                  />
                ))}
              </Bar>
            </ResponsiveContainer>
          );

        case 'area':
          return (
            <ResponsiveContainer width="100%" height={400}>
              <Area data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                {selectedColumns.map((col, index) => (
                  <Area
                    key={col}
                    type="monotone"
                    dataKey={col}
                    stroke={colors[index % colors.length]}
                    fill={colors[index % colors.length] + '40'}
                  />
                ))}
              </Area>
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
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter name="Data Points" data={scatterData} fill="#3B82F6" />
                </ScatterChart>
              </ResponsiveContainer>
            );
          }
          return (
            <div className="text-center py-8 text-gray-500">
              Select at least 2 columns for scatter plot
            </div>
          );

        case 'pie':
          if (selectedColumns.length === 1) {
            return (
              <ResponsiveContainer width="100%" height={400}>
                <RechartsPie>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
            );
          }
          return (
            <div className="text-center py-8 text-gray-500">
              Select exactly 1 column for pie chart
            </div>
          );

        default:
          return <div className="text-center py-8 text-gray-500">Chart type not supported</div>;
      }
    } catch (error) {
      console.error('Error rendering chart:', error);
      return (
        <div className="text-center py-8 text-red-500">
          Error rendering chart. Please try different chart type or columns.
        </div>
      );
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📊 Data Analysis</h1>
            <p className="text-gray-600 mt-1">Upload, analyze and visualize your data with AI assistance</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={generateAISuggestions}
              disabled={!data.length}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Brain className="w-4 h-4" />
              AI Suggestions
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

      {/* Column and Chart Selection */}
      {data.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { type: 'line', icon: LineChart, label: 'Line' },
                { type: 'bar', icon: BarChart, label: 'Bar' },
                { type: 'area', icon: AreaChart, label: 'Area' },
                { type: 'scatter', icon: ScatterChart, label: 'Scatter' },
                { type: 'pie', icon: PieChart, label: 'Pie' }
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
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">
              {selectedChartType.charAt(0).toUpperCase() + selectedChartType.slice(1)} Chart
            </h3>
            {renderChart()}
          </div>
        </div>
      )}

      {/* AI Suggestions */}
      {aiSuggestions.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">AI Suggestions</h3>
          <div className="space-y-3">
            {aiSuggestions.map((suggestion) => (
              <div key={suggestion.id} className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium mb-1">{suggestion.title}</h4>
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

      {/* AI Chat */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            AI Data Assistant
          </h3>
          <button
            onClick={() => setShowAiChat(!showAiChat)}
            className="text-purple-600 hover:text-purple-700 font-medium"
          >
            {showAiChat ? 'Hide' : 'Show'} Chat
          </button>
        </div>
        
        {showAiChat && (
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
          <h3 className="text-lg font-semibold mb-4">Data Preview</h3>
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
                {data.slice(0, 10).map((row, index) => (
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
