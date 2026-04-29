import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  LineChart, BarChart, PieChart, Loader2, Download,
  Brain, Sparkles, AlertCircle, Search, Zap, Table,
  ChevronDown, ChevronUp, RefreshCw, FileDown
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
import { Line, Bar, Pie } from 'react-chartjs-2';
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
  // Main online AI provider for this project is called via backend endpoint /api/ai/chat.
  // Provider can be switched server-side (e.g., OpenRouter, Groq) without frontend code changes.
  const AI_PROVIDER = 'Online AI (via backend)';

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
  const [activeTab, setActiveTab] = useState('visualize');
  const [anomalies, setAnomalies] = useState<{ column: string, rows: number[] }[]>([]);
  const [recommendedCharts, setRecommendedCharts] = useState<string[]>([]);
  const [currentChartType, setCurrentChartType] = useState<'line' | 'bar' | 'pie'>('line');
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<Array<{
    id: string;
    type: 'add_column' | 'modify_data' | 'remove_rows' | 'transform';
    title: string;
    description: string;
    action: () => void;
  }>>([]);

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

  const generatePredictions = async () => {
    if (!selectedColumn) {
      toast.error('Please select a column first');
      return;
    }

    const values = data.map(row => parseFloat(row[selectedColumn])).filter(val => !isNaN(val));
    if (values.length < 3) {
      toast.error('Need at least 3 data points for accurate prediction');
      return;
    }

    setIsGeneratingInsights(true);
    try {
      // Enhanced trend analysis for better predictions
      const recentValues = values.slice(-10); // Use last 10 values for trend analysis
      const trend = calculateAdvancedTrend(recentValues);
      const seasonality = detectSeasonality(values);
      const volatility = calculateVolatility(recentValues);

      // Use Groq AI with enhanced context
      const contextData = {
        totalPoints: values.length,
        recentTrend: trend.direction,
        trendStrength: trend.strength,
        seasonality: seasonality.detected,
        volatility: volatility.level,
        lastValue: values[values.length - 1],
        average: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values)
      };

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: `Generate 5 accurate predictions for ${selectedColumn} based on this analysis:
Total data points: ${contextData.totalPoints}
Recent trend: ${contextData.recentTrend} (strength: ${contextData.trendStrength})
Seasonality: ${contextData.seasonality ? 'detected' : 'not detected'}
Volatility: ${contextData.volatility}
Current value: ${contextData.lastValue}
Historical range: ${contextData.min} to ${contextData.max}
Average: ${contextData.average.toFixed(2)}

Recent values: [${recentValues.join(', ')}]

Consider the trend strength, volatility, and patterns. Generate realistic next 5 values that follow the detected patterns. Return only 5 numbers separated by commas.`,
          dataSample: data.slice(-20), // Send last 20 rows for context
          columns: [selectedColumn],
          dataProfile: []
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.message || 'Failed to get AI predictions');
      }

      // Parse and validate AI predictions
      const aiPredictions = json.answer
        .split(',')
        .map((val: string) => parseFloat(val.trim()))
        .filter((val: number) => !isNaN(val))
        .slice(0, 5);

      if (aiPredictions.length === 5) {
        // Validate predictions are realistic
        const validatedPredictions = validatePredictions(aiPredictions, contextData);
        setPredictions(validatedPredictions);
        toast.success('✨ AI predictions generated with trend analysis!');
      } else {
        throw new Error('Invalid AI response format');
      }
    } catch (error) {
      console.error('AI prediction error:', error);
      
      // Enhanced fallback with multiple algorithms
      try {
        const enhancedPredictions = generateEnhancedPredictions(values);
        setPredictions(enhancedPredictions);
        toast.success('📈 Predictions generated using advanced trend analysis');
      } catch (fallbackError) {
        console.error('Fallback prediction error:', fallbackError);
        toast.error('❌ Failed to generate predictions');
      }
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  // Helper functions for enhanced prediction
  const calculateAdvancedTrend = (values: number[]) => {
    if (values.length < 2) return { direction: 'neutral', strength: 0 };
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const change = secondAvg - firstAvg;
    const strength = Math.abs(change / firstAvg);
    
    return {
      direction: change > 0.05 ? 'upward' : change < -0.05 ? 'downward' : 'neutral',
      strength: strength > 0.2 ? 'strong' : strength > 0.1 ? 'moderate' : 'weak'
    };
  };

  const detectSeasonality = (values: number[]) => {
    if (values.length < 8) return { detected: false, pattern: null };
    
    // Simple seasonality detection
    const patterns = [];
    for (let period = 2; period <= Math.min(8, Math.floor(values.length / 2)); period++) {
      const correlation = calculateSeasonalityCorrelation(values, period);
      if (correlation > 0.7) {
        patterns.push({ period, correlation });
      }
    }
    
    return {
      detected: patterns.length > 0,
      pattern: patterns.length > 0 ? patterns[0] : null
    };
  };

  const calculateSeasonalityCorrelation = (values: number[], period: number) => {
    if (values.length < period * 2) return 0;
    
    let correlation = 0;
    let count = 0;
    
    for (let i = 0; i < values.length - period; i++) {
      correlation += values[i] * values[i + period];
      count++;
    }
    
    return correlation / count;
  };

  const calculateVolatility = (values: number[]) => {
    if (values.length < 2) return { level: 'low', value: 0 };
    
    const returns = [];
    for (let i = 1; i < values.length; i++) {
      if (values[i - 1] !== 0) {
        returns.push((values[i] - values[i - 1]) / values[i - 1]);
      }
    }
    
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);
    
    return {
      level: volatility > 0.1 ? 'high' : volatility > 0.05 ? 'medium' : 'low',
      value: volatility
    };
  };

  const validatePredictions = (predictions: number[], context: any) => {
    const lastValue = context.lastValue;
    const validated = predictions.map((pred, index) => {
      // Ensure predictions are within reasonable bounds
      const maxChange = context.volatility === 'high' ? 0.3 : context.volatility === 'medium' ? 0.2 : 0.1;
      const minPred = lastValue * (1 - maxChange);
      const maxPred = lastValue * (1 + maxChange);
      
      return Math.max(minPred, Math.min(maxPred, pred));
    });
    
    return validated;
  };

  const generateEnhancedPredictions = (values: number[]) => {
    const trend = calculateAdvancedTrend(values.slice(-10));
    const volatility = calculateVolatility(values.slice(-10));
    const lastValue = values[values.length - 1];
    
    // Multiple prediction methods
    const linearPred = generateLinearPredictions(values);
    const exponentialPred = generateExponentialPredictions(values);
    const movingAvgPred = generateMovingAveragePredictions(values);
    
    // Weighted combination based on trend strength
    const weights = trend.strength === 'strong' ? [0.6, 0.3, 0.1] : 
                   trend.strength === 'moderate' ? [0.4, 0.4, 0.2] : [0.3, 0.3, 0.4];
    
    return linearPred.map((val, i) => {
      const weighted = val * weights[0] + exponentialPred[i] * weights[1] + movingAvgPred[i] * weights[2];
      return validatePredictions([weighted], { lastValue, volatility: volatility.level })[0];
    });
  };

  const generateLinearPredictions = (values: number[]) => {
    const n = values.length;
    const xValues = Array.from({ length: n }, (_, i) => i);
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((acc, x, i) => acc + x * values[i], 0);
    const sumXX = xValues.reduce((acc, x) => acc + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return Array.from({ length: 5 }, (_, i) => {
      const x = n + i;
      return slope * x + intercept;
    });
  };

  const generateExponentialPredictions = (values: number[]) => {
    const alpha = 0.3; // Smoothing factor
    let smoothed = values[0];
    
    for (let i = 1; i < values.length; i++) {
      smoothed = alpha * values[i] + (1 - alpha) * smoothed;
    }
    
    const trend = values[values.length - 1] - values[values.length - 2];
    
    return Array.from({ length: 5 }, (_, i) => {
      return smoothed + (i + 1) * trend;
    });
  };

  const generateMovingAveragePredictions = (values: number[]) => {
    const period = Math.min(5, Math.floor(values.length / 2));
    const recentAvg = values.slice(-period).reduce((a, b) => a + b, 0) / period;
    const trend = values.slice(-period).reduce((acc, val, i) => {
      if (i > 0) return acc + (val - values.slice(-period)[i - 1]);
      return acc;
    }, 0) / (period - 1);
    
    return Array.from({ length: 5 }, (_, i) => {
      return recentAvg + (i + 1) * trend;
    });
  };

  const getChartData = () => {
    if (!data.length || data.length === 0) return null;

    // Professional color palette
    const colors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
      '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384',
      '#8BC34A', '#FF5722', '#795548', '#607D8B', '#E91E63'
    ];

    if (currentChartType === 'pie') {
      // For pie chart, use selected column with accurate data processing
      const targetColumn = selectedColumn || columns[0];
      if (!targetColumn) return null;
      
      const values = data.map(row => row[targetColumn]);
      
      // Check if data is numeric for accurate pie chart
      const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
      
      if (numericValues.length > values.length * 0.5) {
        // Data is mostly numeric - create ranges for pie chart
        const min = Math.min(...numericValues);
        const max = Math.max(...numericValues);
        const range = max - min;
        const numRanges = 5;
        const rangeSize = range / numRanges;
        
        const rangeCounts: Record<string, number> = {};
        for (let i = 0; i < numRanges; i++) {
          const rangeMin = min + (i * rangeSize);
          const rangeMax = i === numRanges - 1 ? max : min + ((i + 1) * rangeSize);
          const rangeKey = `${rangeMin.toFixed(1)}-${rangeMax.toFixed(1)}`;
          rangeCounts[rangeKey] = 0;
        }
        
        numericValues.forEach(value => {
          const rangeIndex = Math.min(Math.floor((value - min) / rangeSize), numRanges - 1);
          const rangeMin = min + (rangeIndex * rangeSize);
          const rangeMax = rangeIndex === numRanges - 1 ? max : min + ((rangeIndex + 1) * rangeSize);
          const rangeKey = `${rangeMin.toFixed(1)}-${rangeMax.toFixed(1)}`;
          rangeCounts[rangeKey]++;
        });
        
        const pieLabels = Object.keys(rangeCounts);
        const pieData = Object.values(rangeCounts);
        const total = pieData.reduce((sum, val) => sum + val, 0);
        
        return {
          labels: pieLabels.map((label, index) => `${label} (${((pieData[index] / total) * 100).toFixed(1)}%)`),
          datasets: [
            {
              data: pieData,
              backgroundColor: colors.slice(0, pieLabels.length),
              borderWidth: 2,
              borderColor: '#fff',
              hoverBorderWidth: 3
            }
          ]
        };
      } else {
        // Data is categorical - count actual values
        const valueCounts: Record<string, number> = {};
        values.forEach(value => {
          const key = String(value || 'Unknown');
          valueCounts[key] = (valueCounts[key] || 0) + 1;
        });

        // Sort by count for better visualization
        const sortedEntries = Object.entries(valueCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10); // Limit to top 10 categories

        const pieLabels = sortedEntries.map(([label]) => label);
        const pieData = sortedEntries.map(([, count]) => count);
        const total = pieData.reduce((sum, val) => sum + val, 0);

        return {
          labels: pieLabels.map((label, index) => `${label} (${((pieData[index] / total) * 100).toFixed(1)}%)`),
          datasets: [
            {
              data: pieData,
              backgroundColor: colors.slice(0, pieLabels.length),
              borderWidth: 2,
              borderColor: '#fff',
              hoverBorderWidth: 3
            }
          ]
        };
      }
    } else {
      // For line/bar charts, use selected column
      if (!selectedColumn) return null;
      
      const values = data.map(row => parseFloat(row[selectedColumn])).filter(val => !isNaN(val));
      if (values.length === 0) return null;
      
      // Limit data points for cleaner visualization
      const maxDataPoints = 50;
      const displayValues = values.length > maxDataPoints 
        ? values.filter((_, index) => index % Math.ceil(values.length / maxDataPoints) === 0)
        : values;
      
      // Create clean, simple labels
      const labels = displayValues.map((_, index) => {
        if (displayValues.length <= 10) {
          return String(index + 1);
        } else {
          return index === 0 || index === displayValues.length - 1 
            ? String(index + 1) 
            : '';
        }
      });

      return {
        labels,
        datasets: [
          {
            label: selectedColumn,
            data: displayValues,
            borderColor: '#36A2EB',
            backgroundColor: currentChartType === 'bar' 
              ? '#36A2EB'
              : 'rgba(54, 162, 235, 0.1)',
            borderWidth: currentChartType === 'line' ? 3 : 1,
            tension: 0.2,
            fill: false,
            pointRadius: currentChartType === 'line' ? 4 : 0,
            pointHoverRadius: currentChartType === 'line' ? 6 : 0,
            pointBackgroundColor: '#36A2EB',
            pointBorderColor: '#fff',
            pointBorderWidth: 2
          }
        ]
      };
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false // Hide legend for cleaner look
      },
      title: {
        display: true,
        text: `${selectedColumn || 'Data'} Visualization`,
        font: {
          size: 16,
          weight: 'bold' as const
        },
        padding: {
          bottom: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: {
          size: 14
        },
        bodyFont: {
          size: 13
        },
        padding: 8,
        cornerRadius: 6,
        displayColors: false
      }
    },
    scales: currentChartType !== 'pie' ? {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.03)',
          drawBorder: false
        },
        ticks: {
          font: {
            size: 11
          },
          color: '#666'
        }
      },
      x: {
        grid: {
          display: false,
          drawBorder: false
        },
        ticks: {
          font: {
            size: 11
          },
          color: '#666',
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 10
        }
      }
    } : undefined
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          padding: 20,
          font: {
            size: 12
          }
        }
      },
      title: {
        display: true,
        text: 'Data Distribution',
        font: {
          size: 16,
          weight: 'bold' as const
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: {
          size: 14
        },
        bodyFont: {
          size: 13
        },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  const rowOptions = [5, 10, 25, 50, 100];

  // Generate AI suggestions that can modify the dataset
  const generateAISuggestions = async () => {
    if (!data.length) {
      toast.error('Please upload data first');
      return;
    }

    setIsGeneratingInsights(true);
    try {
      const suggestions = [];
      
      // Analyze data for suggestions
      const numericColumns = columns.filter(col => {
        const values = data.map(row => parseFloat(row[col])).filter(v => !isNaN(v));
        return values.length > data.length * 0.5;
      });

      // Suggestion 1: Add suggestions column
      suggestions.push({
        id: 'add_suggestions_column',
        type: 'add_column' as const,
        title: 'Add AI Suggestions Column',
        description: 'Add a column with AI-generated business insights for each row',
        action: () => addSuggestionsColumn()
      });

      // Suggestion 2: Add performance metrics
      if (numericColumns.length >= 2) {
        suggestions.push({
          id: 'add_performance_metrics',
          type: 'add_column' as const,
          title: 'Add Performance Metrics',
          description: `Calculate ratios using ${numericColumns[0]} and ${numericColumns[1]}`,
          action: () => addPerformanceMetrics(numericColumns[0], numericColumns[1])
        });
      }

      // Suggestion 3: Remove outliers
      numericColumns.forEach(col => {
        const values = data.map(row => parseFloat(row[col])).filter(v => !isNaN(v));
        if (values.length > 0) {
          const mean = values.reduce((a, b) => a + b, 0) / values.length;
          const stdDev = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length);
          const outliers = values.filter(v => Math.abs(v - mean) > 2 * stdDev);
          
          if (outliers.length > 0) {
            suggestions.push({
              id: `remove_outliers_${col}`,
              type: 'remove_rows' as const,
              title: `Remove Outliers from ${col}`,
              description: `Remove ${outliers.length} outlier rows for cleaner analysis`,
              action: () => removeOutliers(col)
            });
          }
        }
      });

      // Suggestion 4: Add trend analysis
      if (numericColumns.length > 0) {
        suggestions.push({
          id: 'add_trend_analysis',
          type: 'add_column' as const,
          title: 'Add Trend Analysis',
          description: 'Add trend indicators for numeric columns',
          action: () => addTrendAnalysis(numericColumns)
        });
      }

      setAiSuggestions(suggestions);
      toast.success(`Generated ${suggestions.length} AI suggestions`);
    } catch (error) {
      toast.error('Failed to generate suggestions');
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  // Add suggestions column with AI insights
  const addSuggestionsColumn = async () => {
    try {
      const suggestionsColumn = 'ai_suggestions';
      const updatedData = await Promise.all(data.map(async (row, index) => {
        const rowData = Object.entries(row).map(([key, value]) => `${key}: ${value}`).join(', ');
        
        try {
          // Smart sampling for AI suggestions to avoid 413 error
        const contextSample = data.slice(0, 30); // First 30 rows for context
        const response = await fetch('/api/ai/chat', {
            method: 'POST',
          headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: `Based on dataset analysis (${data.length} total rows) and this specific row: ${rowData}, provide a brief business insight in one sentence (max 15 words). Context from sample data provided.`,
              dataSample: contextSample,
              columns: columns,
              dataProfile: []
            }),
          });

          const json = await response.json();
          const insight = json.answer || 'Good performance';
          
          return {
            ...row,
            [suggestionsColumn]: insight
          };
        } catch (error) {
          return {
            ...row,
            [suggestionsColumn]: 'Needs review'
          };
        }
      }));

      setData(updatedData);
      if (!columns.includes(suggestionsColumn)) {
        setColumns([...columns, suggestionsColumn]);
      }
      toast.success('AI suggestions column added');
    } catch (error) {
      toast.error('Failed to add suggestions column');
    }
  };

  // Add performance metrics column
  const addPerformanceMetrics = (col1: string, col2: string) => {
    const metricsColumn = `${col1}_to_${col2}_ratio`;
    const updatedData = data.map(row => {
      const val1 = parseFloat(row[col1]);
      const val2 = parseFloat(row[col2]);
      const ratio = val2 !== 0 ? (val1 / val2).toFixed(2) : '0';
      return {
        ...row,
        [metricsColumn]: ratio
      };
    });

    setData(updatedData);
    if (!columns.includes(metricsColumn)) {
      setColumns([...columns, metricsColumn]);
    }
    toast.success(`Performance metrics column added: ${metricsColumn}`);
  };

  // Remove outliers from data
  const removeOutliers = (column: string) => {
    const values = data.map(row => parseFloat(row[column])).filter(v => !isNaN(v));
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / values.length);
    
    const cleanedData = data.filter(row => {
      const val = parseFloat(row[column]);
      return isNaN(val) || Math.abs(val - mean) <= 2 * stdDev;
    });

    setData(cleanedData);
    toast.success(`Removed outliers from ${column}. ${data.length - cleanedData.length} rows removed.`);
  };

  // Add trend analysis column
  const addTrendAnalysis = (numericColumns: string[]) => {
    const updatedData = data.map((row, index) => {
      const newRow = { ...row };
      
      numericColumns.forEach(col => {
        if (index > 0) {
          const currentValue = parseFloat(row[col]);
          const previousValue = parseFloat(data[index - 1][col]);
          const trend = currentValue > previousValue ? '📈 Up' : currentValue < previousValue ? '📉 Down' : '➡️ Stable';
          newRow[`${col}_trend`] = trend;
        } else {
          newRow[`${col}_trend`] = '📍 Baseline';
        }
      });

      return newRow;
    });

    const newColumns = numericColumns.map(col => `${col}_trend`);
    setData(updatedData);
    setColumns([...columns, ...newColumns]);
    toast.success('Trend analysis columns added');
  };

  // Generate "AI-like" insights locally (no external API)
  const generateAiInsights = async () => {
    if (!data.length) {
      toast.error('Please upload data first');
      return;
    }

    setIsGeneratingInsights(true);
    try {
      const dataSample = data.slice(0, Math.min(data.length, 100)); // Smart sampling to avoid 413 error

      const rowCount = data.length;
      const columnCount = columns.length;

      const numericColumns = columns.filter(column => {
        const numericValues = dataSample
          .map(row => parseFloat(row[column]))
          .filter(val => !isNaN(val));
        return numericValues.length > dataSample.length * 0.5;
      });

      const stats: string[] = [];
      numericColumns.forEach(column => {
        const values = dataSample
          .map(row => parseFloat(row[column]))
          .filter(val => !isNaN(val));
        if (!values.length) return;
        const min = Math.min(...values);
        const max = Math.max(...values);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        stats.push(
          `• ${column}: min ${min.toFixed(2)}, max ${max.toFixed(2)}, average ${mean.toFixed(2)}`
        );
      });

      const overview = [
        `This dataset contains ${rowCount} rows and ${columnCount} columns.`,
        numericColumns.length
          ? `Detected ${numericColumns.length} numeric column(s) suitable for basic statistical analysis.`
          : 'No strongly numeric columns were detected; most values look categorical/textual.',
      ].join('\n\n');

      const statsText = stats.length
        ? `Key numeric column summaries:\n${stats.join('\n')}`
        : 'No numeric summaries available because numeric columns could not be reliably detected.';

      const recommendations =
        'You can explore trends further by selecting a numeric column in the "Visualize" tab, ' +
        'or filtering rows in your source data to focus on specific segments (such as a date range or category).';

      setAiInsights(
        `${overview}\n\n${statsText}\n\nRecommendations:\n${recommendations}`
      );

      // Generate structured insights using local logic
      generateStructuredInsights(dataSample);

      toast.success('Analysis complete (local, no external AI)');
    } catch (error) {
      console.error('AI analysis error:', error);
      toast.error(
        'Failed to analyze data locally: ' +
          (error instanceof Error ? error.message : String(error))
      );
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
        const newAnomalies: { column: string, rows: number[] }[] = [];

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

  const askGroqViaBackend = async (
    question: string,
    columns: string[],
    dataSample: Record<string, unknown>[],
    dataProfile: Array<{ column: string; inferredType: string; nonNullCount: number; uniqueCount: number }>
  ): Promise<string> => {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        columns,
        dataSample,
        dataProfile,
      }),
    });

    const json = await response.json().catch(() => null);
    if (!response.ok) {
      const serverMessage =
        json?.message ||
        (typeof json?.details === 'string' ? json.details : '') ||
        `Server error (${response.status})`;
      throw new Error(serverMessage);
    }
    return json?.answer || 'No answer returned.';
  };

  
  const suggestNewColumns = async () => {
    if (!data.length) return;

    setLoading(true);
    try {
      const dataSample = data.slice(0, Math.min(data.length, 200));

      const suggestions: ColumnSuggestion[] = [];

      const hasDateColumn = columns.some(col =>
        /date|time|timestamp/i.test(col)
      );
      const numericColumns = columns.filter(column => {
        const numericValues = dataSample
          .map(row => parseFloat(row[column]))
          .filter(val => !isNaN(val));
        return numericValues.length > dataSample.length * 0.5;
      });

      if (hasDateColumn) {
        suggestions.push({
          name: 'day_of_week',
          type: 'string',
          description:
            'Day of the week extracted from your date column. Useful for seeing weekly seasonality or weekday/weekend patterns.',
        });
        suggestions.push({
          name: 'month',
          type: 'string',
          description:
            'Month name or number extracted from your date column. Helps identify monthly trends or seasonality.',
        });
      }

      if (numericColumns.length >= 2) {
        suggestions.push({
          name: `${numericColumns[0]}_to_${numericColumns[1]}_ratio`,
          type: 'number',
          description:
            `Ratio between "${numericColumns[0]}" and "${numericColumns[1]}". Useful for normalizing values and comparing relative scale.`,
        });
      }

      if (numericColumns.length) {
        suggestions.push({
          name: `${numericColumns[0]}_z_score`,
          type: 'number',
          description:
            `Standardized score (z-score) for "${numericColumns[0]}" to highlight unusually high or low values.`,
        });
      }

      if (!suggestions.length) {
        suggestions.push(
          {
            name: 'record_id',
            type: 'string',
            description:
              'Unique identifier for each row, useful when your original data does not contain a stable primary key.',
          },
          {
            name: 'group_label',
            type: 'string',
            description:
              'Manual grouping label you can use to tag records (e.g., segment, cohort, or category) for easier filtering.',
          }
        );
      }

      setColumnSuggestions(suggestions);
      toast.success('Column suggestions generated (local, no external AI)');
    } catch (error) {
      console.error('Error getting column suggestions:', error);
      toast.error(
        'Failed to get column suggestions locally: ' +
          (error instanceof Error ? error.message : String(error))
      );
    } finally {
      setLoading(false);
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
                  className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${activeTab === 'visualize'
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
                  className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${activeTab === 'ai-insights'
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
                  className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${activeTab === 'data-preview'
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
                          className={`p-2 rounded-lg ${currentChartType === 'line'
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                          <LineChart className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setCurrentChartType('bar')}
                          className={`p-2 rounded-lg ${currentChartType === 'bar'
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                          <BarChart className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setCurrentChartType('pie')}
                          className={`p-2 rounded-lg ${currentChartType === 'pie'
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

                  {getChartData() && (
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                      <h4 className="text-lg font-semibold mb-4">
                        {currentChartType === 'pie' ? 'Data Distribution' : `${selectedColumn || 'Data'} Visualization`}
                      </h4>
                      <div className="h-96">
                        {currentChartType === 'line' && <Line options={chartOptions} data={getChartData()!} />}
                        {currentChartType === 'bar' && <Bar options={chartOptions} data={getChartData()!} />}
                        {currentChartType === 'pie' && <Pie options={pieChartOptions} data={getChartData()!} />}
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
                      <button
                        onClick={generateAISuggestions}
                        disabled={isGeneratingInsights || !data.length}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {isGeneratingInsights ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Brain className="h-5 w-5" />
                        )}
                        AI Suggestions
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

                  {/* AI Suggestions Section */}
                  {aiSuggestions.length > 0 && (
                    <div className="bg-white rounded-lg p-6 shadow">
                      <h4 className="text-lg font-medium mb-4">🤖 AI-Powered Data Suggestions</h4>
                      <div className="space-y-3">
                        {aiSuggestions.map((suggestion) => (
                          <div key={suggestion.id} className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h5 className="font-medium text-purple-900 mb-1">{suggestion.title}</h5>
                                <p className="text-sm text-gray-600">{suggestion.description}</p>
                                <div className="mt-2">
                                  <span className={`px-2 py-1 text-xs rounded ${
                                    suggestion.type === 'add_column' ? 'bg-blue-100 text-blue-800' :
                                    suggestion.type === 'remove_rows' ? 'bg-red-100 text-red-800' :
                                    suggestion.type === 'modify_data' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-green-100 text-green-800'
                                  }`}>
                                    {suggestion.type.replace('_', ' ')}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={suggestion.action}
                                className="ml-4 px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors"
                              >
                                Apply
                              </button>
                            </div>
                          </div>
                        ))}
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
                            className={`p-4 rounded-lg ${insight.type === 'warning'
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
                                <h5 className={`font-medium ${insight.type === 'warning'
                                    ? 'text-yellow-800'
                                    : insight.type === 'success'
                                      ? 'text-green-800'
                                      : 'text-blue-800'
                                  }`}>
                                  {insight.title}
                                </h5>
                                <p className={`mt-1 text-sm ${insight.type === 'warning'
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
                              <div className={`px-3 py-1 rounded-full text-sm ${Math.abs(correlation.score) > 0.7
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

                  {/* AI Chat Interface */}
                  <div className="h-[600px]">
                    <AIChatInterface 
                      data={data}
                      columns={columns}
                      onSendMessage={async (message) => {
                        try {
                          const dataSample = data.slice(0, Math.min(data.length, 5));
                          const cleanedSample = dataSample
                            .map((row) => {
                              const cleanedRow: Record<string, unknown> = {};
                              columns.forEach((col) => {
                                const value = row[col];
                                if (value === null || value === undefined) {
                                  cleanedRow[col] = null;
                                } else if (typeof value === 'string') {
                                  const trimmed = value.trim();
                                  cleanedRow[col] = trimmed === '' ? null : trimmed;
                                } else {
                                  cleanedRow[col] = value;
                                }
                              });
                              return cleanedRow;
                            })
                            .filter((row) => Object.values(row).some((value) => value !== null));

                          const dataProfile = columns.map((column) => {
                            const values = cleanedSample.map((row: any) => row[column]).filter((value) => value !== null);
                            const numericValues = values
                              .map((value) => (typeof value === 'number' ? value : parseFloat(String(value))))
                              .filter((value) => !isNaN(value));
                            const uniqueCount = new Set(values.map((value) => String(value))).size;
                            const inferredType = numericValues.length > values.length * 0.6 ? 'numeric' : 'categorical/text';
                            return {
                              column,
                              inferredType,
                              nonNullCount: values.length,
                              uniqueCount,
                            };
                          });

                          const response = await fetch('/api/ai/chat', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              question: message,
                              columns,
                              dataSample: cleanedSample,
                              dataProfile,
                            }),
                          });

                          const json = await response.json();
                          if (!response.ok) {
                            throw new Error(json?.message || 'Failed to get AI response');
                          }
                          return json.answer || 'No response received.';
                        } catch (error) {
                          console.error('AI Error:', error);
                          throw error;
                        }
                      }}
                    />
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