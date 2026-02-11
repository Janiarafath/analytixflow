import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  LineChart, BarChart, PieChart, Loader2, Download, 
  Brain, Sparkles, AlertCircle, Search, Zap, Table, 
  ChevronDown, ChevronUp, RefreshCw, FileDown, Send
} from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
import { Line, Bar, Pie } from 'react-chartjs-2';
import { useAuth } from '../contexts/AuthContext';

// Initialize Gemini AI with the provided API key
const genAI = new GoogleGenerativeAI('AIzaSyB1d5fGSK7r27FRoBTwrfqknP_8qTczlsI');

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
}

interface DataInsight {
  title: string;
  description: string;
  type: 'info' | 'warning' | 'success';
}

interface Correlation {
  column1: string;
  column2: string;
  score: number;
}

export const DataAnalysis = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState('');
  const [predictions, setPredictions] = useState<number[]>([]);
  const [previewRows, setPreviewRows] = useState<number>(5);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [columnSuggestions, setColumnSuggestions] = useState<ColumnSuggestion[]>([]);
  const [dataInsights, setDataInsights] = useState<DataInsight[]>([]);
  const [correlations, setCorrelations] = useState<Correlation[]>([]);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('visualize');
  const [anomalies, setAnomalies] = useState<{column: string, rows: number[]}[]>([]);
  const [recommendedCharts, setRecommendedCharts] = useState<string[]>([]);
  const [currentChartType, setCurrentChartType] = useState<'line' | 'bar' | 'pie'>('line');
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  // Load data from localStorage on component mount
  useEffect(() => {
    const storedData = localStorage.getItem('etl_processed_data');
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        if (Array.isArray(parsedData) && parsedData.length > 0) {
          setData(parsedData);
          setColumns(Object.keys(parsedData[0]));
          toast.success('Loaded processed data from ETL');
          
          // Auto-generate chart recommendations
          generateChartRecommendations(parsedData, Object.keys(parsedData[0]));
        }
      } catch (error) {
        toast.error('Error loading stored data');
      }
    }
  }, []);

  const generatePredictions = () => {
    if (!selectedColumn) return;

    const values = data.map(row => parseFloat(row[selectedColumn])).filter(val => !isNaN(val));
    if (values.length < 2) return;

    // Simple linear regression for prediction
    const n = values.length;
    const xValues = Array.from({ length: n }, (_, i) => i);
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((acc, x, i) => acc + x * values[i], 0);
    const sumXX = xValues.reduce((acc, x) => acc + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Generate next 5 predictions
    const newPredictions = Array.from({ length: 5 }, (_, i) => {
      const x = n + i;
      return slope * x + intercept;
    });

    setPredictions(newPredictions);
    toast.success('Predictions generated');
  };

  const getChartData = () => {
    if (!selectedColumn || !data.length) return null;

    const values = data.map(row => parseFloat(row[selectedColumn])).filter(val => !isNaN(val));
    const labels = Array.from({ length: values.length }, (_, i) => `Point ${i + 1}`);

    return {
      labels,
      datasets: [
        {
          label: selectedColumn,
          data: values,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          tension: 0.1
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `${selectedColumn || 'Data'} Visualization`,
      },
    },
  };

  const rowOptions = [5, 10, 25, 50, 100];

  // Generate AI insights
  const generateAiInsights = async () => {
    if (!data.length) {
      toast.error('Please upload data first');
      return;
    }

    setIsGeneratingInsights(true);
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      
      // Prepare data sample for analysis
      const dataSample = data.slice(0, Math.min(data.length, 50)); // Limit to 50 rows for API efficiency
      const prompt = `Analyze this dataset and provide insights:
        ${JSON.stringify(dataSample, null, 2)}
        
        Please provide:
        1. Key insights about the data
        2. Data quality assessment
        3. Potential patterns or trends
        4. Recommendations for further analysis
        
        Format your response in clear, concise paragraphs.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      setAiInsights(response.text());
      
      // Generate structured insights
      generateStructuredInsights(dataSample);
      
      toast.success('AI analysis complete');
    } catch (error) {
      console.error('AI analysis error:', error);
      toast.error('Failed to analyze data: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const generateStructuredInsights = async (dataSample: any[]) => {
    try {
      // Generate data quality insights
      const qualityInsights: DataInsight[] = [];
      
      // Check for missing values
      columns.forEach(column => {
        const missingCount = dataSample.filter(row => 
          row[column] === null || row[column] === undefined || row[column] === ""
        ).length;
        
        const missingPercentage = (missingCount / dataSample.length) * 100;
        
        if (missingPercentage > 10) {
          qualityInsights.push({
            title: `Missing Values in ${column}`,
            description: `${missingPercentage.toFixed(1)}% of values are missing in this column.`,
            type: 'warning'
          });
        }
      });
      
      // Check for potential duplicate rows
      const stringifiedRows = dataSample.map(row => JSON.stringify(row));
      const uniqueRows = new Set(stringifiedRows);
      
      if (uniqueRows.size < dataSample.length) {
        const duplicatePercentage = ((dataSample.length - uniqueRows.size) / dataSample.length) * 100;
        qualityInsights.push({
          title: 'Duplicate Rows Detected',
          description: `Approximately ${duplicatePercentage.toFixed(1)}% of rows may be duplicates.`,
          type: 'warning'
        });
      }
      
      // Add some general insights
      qualityInsights.push({
        title: 'Dataset Overview',
        description: `Dataset contains ${data.length} rows and ${columns.length} columns.`,
        type: 'info'
      });
      
      // Find numeric columns
      const numericColumns = columns.filter(column => {
        const numericValues = dataSample.map(row => parseFloat(row[column])).filter(val => !isNaN(val));
        return numericValues.length > dataSample.length * 0.5; // More than 50% are numbers
      });
      
      if (numericColumns.length > 0) {
        qualityInsights.push({
          title: 'Numeric Analysis Available',
          description: `${numericColumns.length} columns contain numeric data suitable for statistical analysis.`,
          type: 'success'
        });
      }
      
      setDataInsights(qualityInsights);
      
      // Calculate correlations between numeric columns
      if (numericColumns.length > 1) {
        const newCorrelations: Correlation[] = [];
        
        for (let i = 0; i < numericColumns.length; i++) {
          for (let j = i + 1; j < numericColumns.length; j++) {
            const col1 = numericColumns[i];
            const col2 = numericColumns[j];
            
            const values1 = dataSample.map(row => parseFloat(row[col1])).filter(val => !isNaN(val));
            const values2 = dataSample.map(row => parseFloat(row[col2])).filter(val => !isNaN(val));
            
            // Only calculate if we have enough matching values
            if (values1.length >= 5 && values1.length === values2.length) {
              const correlation = calculateCorrelation(values1, values2);
              
              if (!isNaN(correlation) && Math.abs(correlation) > 0.5) {
                newCorrelations.push({
                  column1: col1,
                  column2: col2,
                  score: correlation
                });
              }
            }
          }
        }
        
        setCorrelations(newCorrelations);
        
        // Detect anomalies in numeric columns
        const newAnomalies: {column: string, rows: number[]}[] = [];
        
        numericColumns.forEach(column => {
          const values = dataSample.map((row, index) => ({ 
            value: parseFloat(row[column]), 
            index 
          })).filter(item => !isNaN(item.value));
          
          if (values.length >= 10) {
            // Calculate mean and standard deviation
            const mean = values.reduce((sum, item) => sum + item.value, 0) / values.length;
            const stdDev = Math.sqrt(
              values.reduce((sum, item) => sum + Math.pow(item.value - mean, 2), 0) / values.length
            );
            
            // Find values more than 2 standard deviations from the mean
            const outlierIndices = values
              .filter(item => Math.abs(item.value - mean) > 2 * stdDev)
              .map(item => item.index);
            
            if (outlierIndices.length > 0) {
              newAnomalies.push({
                column,
                rows: outlierIndices
              });
            }
          }
        });
        
        setAnomalies(newAnomalies);
      }
      
    } catch (error) {
      console.error('Error generating structured insights:', error);
    }
  };

  const calculateCorrelation = (x: number[], y: number[]): number => {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  };

  const askAiQuestion = async () => {
    if (!aiQuery.trim() || !data.length) return;
    
    setAiLoading(true);
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      
      // Prepare data sample for the query
      const dataSample = data.slice(0, Math.min(data.length, 50));
      const prompt = `Given this dataset:
        ${JSON.stringify(dataSample, null, 2)}
        
        Please answer the following question about the data:
        "${aiQuery}"
        
        Provide a clear, concise answer based only on the data provided.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      setAiResponse(response.text());
    } catch (error) {
      console.error('AI query error:', error);
      toast.error('Failed to process your question: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setAiLoading(false);
    }
  };

  const suggestNewColumns = async () => {
    if (!data.length) return;

    setLoading(true);
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      
      const dataSample = data.slice(0, Math.min(data.length, 20));
      const prompt = `Based on this dataset sample:
        ${JSON.stringify(dataSample, null, 2)}
        
        Suggest 3-5 new columns that would add value to the dataset.
        For each column, provide:
        - Column name
        - Data type (string, number, date, etc.)
        - Description of its purpose and how it could be calculated from existing data
        
        Format your response as a structured list.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      
      // Parse AI suggestions into structured format
      const suggestions = parseSuggestions(response.text());
      setColumnSuggestions(suggestions);
      toast.success('Column suggestions generated');
    } catch (error) {
      console.error('Error getting column suggestions:', error);
      toast.error('Failed to get column suggestions: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  const parseSuggestions = (aiResponse: string): ColumnSuggestion[] => {
    // Simple parser for AI response
    try {
      const lines = aiResponse.split('\n');
      const suggestions: ColumnSuggestion[] = [];
      let currentSuggestion: Partial<ColumnSuggestion> = {};
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Check if this is a new suggestion (starts with number or has a column name pattern)
        if (/^\d+\.|\bColumn( name)?:|\bName:/i.test(trimmedLine)) {
          // Save previous suggestion if it exists
          if (currentSuggestion.name) {
            suggestions.push(currentSuggestion as ColumnSuggestion);
          }
          
          // Start new suggestion
          currentSuggestion = { name: '', type: '', description: '' };
          
          // Try to extract name
          const nameMatch = trimmedLine.match(/(?:Column( name)?|Name):\s*(.+)/i);
          if (nameMatch) {
            currentSuggestion.name = nameMatch[2].trim();
          } else {
            // If it's a numbered item, try to find the name
            const numberedMatch = trimmedLine.match(/^\d+\.\s*(.+?)(?:\s*\(|:|\s*-|$)/);
            if (numberedMatch) {
              currentSuggestion.name = numberedMatch[1].trim();
            }
          }
        } 
        // Check for type
        else if (/Type:|Data type:/i.test(trimmedLine)) {
          const typeMatch = trimmedLine.match(/(?:Type|Data type):\s*(.+)/i);
          if (typeMatch) {
            currentSuggestion.type = typeMatch[1].trim();
          }
        }
        // Check for description
        else if (/Description:|Purpose:/i.test(trimmedLine)) {
          const descMatch = trimmedLine.match(/(?:Description|Purpose):\s*(.+)/i);
          if (descMatch) {
            currentSuggestion.description = descMatch[1].trim();
          }
        }
        // If none of the above, it might be a continuation of the description
        else if (currentSuggestion.name && !currentSuggestion.description) {
          currentSuggestion.description = trimmedLine;
        }
        else if (currentSuggestion.description) {
          currentSuggestion.description += ' ' + trimmedLine;
        }
      }
      
      // Add the last suggestion if it exists
      if (currentSuggestion.name) {
        suggestions.push(currentSuggestion as ColumnSuggestion);
      }
      
      // If parsing failed to produce valid suggestions, create some default ones
      if (suggestions.length === 0) {
        const parts = aiResponse.split(/\d+\./);
        parts.shift(); // Remove first empty part
        
        suggestions.push(...parts.map((part, index) => ({
          name: `Suggested Column ${index + 1}`,
          type: 'Unknown',
          description: part.trim()
        })));
      }
      
      return suggestions;
    } catch (error) {
      console.error('Error parsing AI suggestions:', error);
      return [];
    }
  };

  const addSuggestedColumn = (suggestion: ColumnSuggestion) => {
    toast.success(`Column "${suggestion.name}" will be added in a future update`);
    // In a real implementation, this would add the column with calculated values
  };

  const generateChartRecommendations = (dataSet: any[], dataColumns: string[]) => {
    // Simple logic to recommend chart types based on data characteristics
    const recommendations: string[] = [];
    
    // Find numeric columns
    const numericColumns = dataColumns.filter(column => {
      const numericValues = dataSet.map(row => parseFloat(row[column])).filter(val => !isNaN(val));
      return numericValues.length > dataSet.length * 0.5;
    });
    
    // Find categorical columns
    const categoricalColumns = dataColumns.filter(column => {
      const uniqueValues = new Set(dataSet.map(row => row[column]));
      return uniqueValues.size < Math.min(20, dataSet.length * 0.2);
    });
    
    if (numericColumns.length > 0) {
      recommendations.push('line');
      recommendations.push('bar');
      
      // If we have both numeric and categorical columns, recommend grouped charts
      if (categoricalColumns.length > 0) {
        recommendations.push('grouped-bar');
        recommendations.push('stacked-bar');
      }
      
      // If we have time-related columns, recommend time series
      const possibleTimeColumns = dataColumns.filter(col => 
        /date|time|year|month|day/i.test(col)
      );
      
      if (possibleTimeColumns.length > 0) {
        recommendations.push('time-series');
      }
    }
    
    if (categoricalColumns.length > 0) {
      recommendations.push('pie');
      recommendations.push('donut');
    }
    
    setRecommendedCharts(recommendations);
    
    // Auto-select a column if none is selected
    if (!selectedColumn && numericColumns.length > 0) {
      setSelectedColumn(numericColumns[0]);
    }
  };

  const downloadData = (format: 'csv' | 'json') => {
    if (!data.length) return;

    try {
      let content: string;
      let filename: string;
      let type: string;

      if (format === 'csv') {
        content = Papa.unparse(data);
        filename = 'data_export.csv';
        type = 'text/csv';
      } else {
        content = JSON.stringify(data, null, 2);
        filename = 'data_export.json';
        type = 'application/json';
      }

      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Data exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="mb-8 bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">AI-Powered Data Analysis</h1>
            <p className="text-gray-600">
              {data.length > 0 ? 
                'Your data is ready for analysis. Use AI to gain insights and visualize trends.' :
                'Use the ETL dashboard to process data before analyzing it here.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => downloadData('csv')}
              disabled={!data.length}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="h-5 w-5" />
              Export CSV
            </button>
            <button
              onClick={() => downloadData('json')}
              disabled={!data.length}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
            >
              <FileDown className="h-5 w-5" />
              Export JSON
            </button>
          </div>
        </div>
      </div>

      {data.length > 0 && (
        <div className="space-y-8">
          {/* Tabs Navigation */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('visualize')}
                  className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                    activeTab === 'visualize'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <LineChart className="h-5 w-5" />
                    Visualize
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('ai-insights')}
                  className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                    activeTab === 'ai-insights'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI Insights
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('data-preview')}
                  className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                    activeTab === 'data-preview'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Table className="h-5 w-5" />
                    Data Preview
                  </div>
                </button>
              </nav>
            </div>

            <div className="p-6">
              {/* Visualization Tab */}
              {activeTab === 'visualize' && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
                    <div className="flex-1">
                      <label htmlFor="column-select" className="block text-sm font-medium text-gray-700 mb-1">
                        Select a column to visualize
                      </label>
                      <select
                        id="column-select"
                        value={selectedColumn}
                        onChange={(e) => setSelectedColumn(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">Select a column</option>
                        {columns.map(column => (
                          <option key={column} value={column}>{column}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Chart Type
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentChartType('line')}
                          className={`p-2 rounded-lg ${
                            currentChartType === 'line' 
                              ? 'bg-indigo-100 text-indigo-700' 
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <LineChart className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setCurrentChartType('bar')}
                          className={`p-2 rounded-lg ${
                            currentChartType === 'bar' 
                              ? 'bg-indigo-100 text-indigo-700' 
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <BarChart className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setCurrentChartType('pie')}
                          className={`p-2 rounded-lg ${
                            currentChartType === 'pie' 
                              ? 'bg-indigo-100 text-indigo-700' 
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <PieChart className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    
                    <button
                      onClick={generatePredictions}
                      disabled={!selectedColumn}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <Sparkles className="h-5 w-5" />
                      Generate Predictions
                    </button>
                  </div>

                  {selectedColumn && getChartData() && (
                    <div className="bg-white p-4 rounded-lg shadow">
                      <h4 className="text-lg font-medium mb-4">{selectedColumn} Visualization</h4>
                      <div className="h-80">
                        {currentChartType === 'line' && <Line options={chartOptions} data={getChartData()!} />}
                        {currentChartType === 'bar' && <Bar options={chartOptions} data={getChartData()!} />}
                        {currentChartType === 'pie' && <Pie data={getChartData()!} />}
                      </div>
                    </div>
                  )}

                  {predictions.length > 0 && (
                    <div className="mt-6 bg-indigo-50 p-6 rounded-lg">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-indigo-600" />
                        Next 5 Predicted Values for {selectedColumn}:
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {predictions.map((pred, index) => (
                          <div key={index} className="bg-white p-4 rounded-lg shadow">
                            <div className="text-sm text-gray-500">Point {index + data.length + 1}</div>
                            <div className="font-medium text-lg">{pred.toFixed(2)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {recommendedCharts.length > 0 && !selectedColumn && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-blue-600" />
                        Recommended Visualizations
                      </h4>
                      <p className="text-sm text-blue-700 mb-3">
                        Based on your data, we recommend the following visualization types:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {recommendedCharts.map((chart, index) => (
                          <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                            {chart.charAt(0).toUpperCase() + chart.slice(1)} Chart
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* AI Insights Tab */}
              {activeTab === 'ai-insights' && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <h3 className="text-lg font-semibold">AI-Powered Data Insights</h3>
                    <div className="flex gap-3">
                      <button
                        onClick={generateAiInsights}
                        disabled={isGeneratingInsights || !data.length}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {isGeneratingInsights ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Brain className="h-5 w-5" />
                        )}
                        {isGeneratingInsights ? 'Analyzing...' : 'Analyze Data'}
                      </button>
                      <button
                        onClick={suggestNewColumns}
                        disabled={loading || !data.length}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {loading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Sparkles className="h-5 w-5" />
                        )}
                        Suggest Columns
                      </button>
                    </div>
                  </div>

                  {/* AI Insights Section */}
                  {aiInsights && (
                    <div className="bg-white rounded-lg p-6 shadow">
                      <h4 className="text-lg font-medium mb-4">AI Analysis</h4>
                      <div className="prose max-w-none">
                        <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
                          {aiInsights}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Data Quality Insights */}
                  {dataInsights.length > 0 && (
                    <div className="bg-white rounded-lg p-6 shadow">
                      <h4 className="text-lg font-medium mb-4">Data Quality Assessment</h4>
                      <div className="space-y-3">
                        {dataInsights.map((insight, index) => (
                          <div 
                            key={index} 
                            className={`p-4 rounded-lg ${
                              insight.type === 'warning' 
                                ? 'bg-yellow-50' 
                                : insight.type === 'success' 
                                  ? 'bg-green-50' 
                                  : 'bg-blue-50'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {insight.type === 'warning' && (
                                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                              )}
                              {insight.type === 'success' && (
                                <Sparkles className="h-5 w-5 text-green-600 mt-0.5" />
                              )}
                              {insight.type === 'info' && (
                                <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
                              )}
                              <div>
                                <h5 className={`font-medium ${
                                  insight.type === 'warning' 
                                    ? 'text-yellow-800' 
                                    : insight.type === 'success' 
                                      ? 'text-green-800' 
                                      : 'text-blue-800'
                                }`}>
                                  {insight.title}
                                </h5>
                                <p className={`mt-1 text-sm ${
                                  insight.type === 'warning' 
                                    ? 'text-yellow-700' 
                                    : insight.type === 'success' 
                                      ? 'text-green-700' 
                                      : 'text-blue-700'
                                }`}>
                                  {insight.description}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Correlations */}
                  {correlations.length > 0 && (
                    <div className="bg-white rounded-lg p-6 shadow">
                      <h4 className="text-lg font-medium mb-4">Detected Correlations</h4>
                      <div className="space-y-3">
                        {correlations.map((correlation, index) => (
                          <div key={index} className="bg-indigo-50 p-4 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-medium">{correlation.column1}</span>
                                <span className="mx-2">and</span>
                                <span className="font-medium">{correlation.column2}</span>
                              </div>
                              <div className={`px-3 py-1 rounded-full text-sm ${
                                Math.abs(correlation.score) > 0.7 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                Correlation: {correlation.score.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Anomalies */}
                  {anomalies.length > 0 && (
                    <div className="bg-white rounded-lg p-6 shadow">
                      <h4 className="text-lg font-medium mb-4">Detected Anomalies</h4>
                      <div className="space-y-3">
                        {anomalies.map((anomaly, index) => (
                          <div key={index} className="bg-yellow-50 p-4 rounded-lg">
                            <h5 className="font-medium text-yellow-800">
                              Anomalies in column: {anomaly.column}
                            </h5>
                            <p className="mt-1 text-sm text-yellow-700">
                              {anomaly.rows.length} potential outliers detected in rows: {anomaly.rows.slice(0, 5).join(', ')}
                              {anomaly.rows.length > 5 ? ` and ${anomaly.rows.length - 5} more...` : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Column Suggestions */}
                  {columnSuggestions.length > 0 && (
                    <div className="bg-white rounded-lg p-6 shadow">
                      <h4 className="text-lg font-medium mb-4">AI-Suggested Columns</h4>
                      <div className="space-y-4">
                        {columnSuggestions.map((suggestion, index) => (
                          <div key={index} className="bg-green-50 p-4 rounded-lg">
                            <div className="flex items-start justify-between">
                              <div>
                                <h5 className="font-medium text-green-800">{suggestion.name}</h5>
                                <div className="text-sm text-green-600 mt-1">Type: {suggestion.type}</div>
                                <p className="text-sm text-green-700 mt-2">{suggestion.description}</p>
                              </div>
                              <button
                                onClick={() => addSuggestedColumn(suggestion)}
                                className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1 self-start"
                              >
                                <Sparkles className="h-4 w-4" />
                                Add
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ask AI Section */}
                  <div className="bg-white rounded-lg p-6 shadow">
                    <h4 className="text-lg font-medium mb-4">Ask AI About Your Data</h4>
                    <div className="flex gap-3 mb-4">
                      <input
                        type="text"
                        value={aiQuery}
                        onChange={(e) => setAiQuery(e.target.value)}
                        placeholder="Ask a question about your data..."
                        className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            askAiQuestion();
                          }
                        }}
                      />
                      <button
                        onClick={askAiQuestion}
                        disabled={aiLoading || !aiQuery.trim() || !data.length}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {aiLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Send className="h-5 w-5" />
                        )}
                        Ask
                      </button>
                    </div>
                    
                    {aiResponse && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h5 className="font-medium mb-2">AI Response:</h5>
                        <div className="text-sm text-gray-700">
                          {aiResponse}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-3 text-xs text-gray-500">
                      Example questions: "What's the average value of [column]?", "Is there a trend in the data?", "What insights can you provide about [column]?"
                    </div>
                  </div>
                </div>
              )}

              {/* Data Preview Tab */}
              {activeTab === 'data-preview' && (
                <div>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                      <h3 className="text-lg font-semibold">Data Preview</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Showing {Math.min(previewRows, data.length)} out of {data.length} rows
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700">Show rows:</label>
                      <select
                        value={previewRows}
                        onChange={(e) => setPreviewRows(Number(e.target.value))}
                        className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      >
                        {rowOptions.map(option => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {columns.map(column => (
                            <th
                              key={column}
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {data.slice(0, previewRows).map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            {columns.map(column => (
                              <td key={column} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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
          </div>
        </div>
      )}
    </div>
  );
};
