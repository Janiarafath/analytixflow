import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Copy, ThumbsUp, ThumbsDown, RefreshCw, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
}

interface AIChatInterfaceProps {
  data: any[];
  columns: string[];
  onSendMessage?: (message: string) => Promise<string>;
}

export const AIChatInterface: React.FC<AIChatInterfaceProps> = ({ 
  data, 
  columns, 
  onSendMessage 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Only scroll to bottom when user sends a new message, never during AI typing
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'user') {
        scrollToBottom();
      }
    }
  }, [messages]);

  const formatAIResponse = (content: string) => {
    // Convert markdown-style formatting to JSX
    let formatted = content;
    
    // Bold text
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic text
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Bullet points
    formatted = formatted.replace(/^- (.+)$/gm, '• $1');
    
    // Numbered lists
    formatted = formatted.replace(/^\d+\. (.+)$/gm, '$1');
    
    // Headers
    formatted = formatted.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>');
    formatted = formatted.replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>');
    formatted = formatted.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>');
    
    // Line breaks
    formatted = formatted.replace(/\n\n/g, '<br /><br />');
    
    return formatted;
  };

  // Fast rule-based response function
  const getRuleBasedResponse = (question: string, currentRows: any[], columns: string[]) => {
    const q = question.toLowerCase();
    
    // If no data, return generic response
    if (!currentRows.length) {
      return "I don't see any data to analyze. Please upload some data first.";
    }

    // Get numeric columns for analysis
    const numericColumns = columns.filter(col => {
      const values = currentRows.map(row => parseFloat(row[col])).filter(v => !isNaN(v));
      return values.length > 0;
    });

    // Sales/Revenue questions
    if (q.includes('sales') || q.includes('revenue') || q.includes('income')) {
      const salesCol = numericColumns.find(col => col.toLowerCase().includes('sale')) || numericColumns[0];
      if (salesCol) {
        const values = currentRows.map(row => parseFloat(row[salesCol])).filter(v => !isNaN(v));
        if (values.length > 0) {
          const latest = values[values.length - 1];
          const previous = values[values.length - 2] || values[0];
          const trend = latest > previous ? 'increasing' : latest < previous ? 'decreasing' : 'stable';
          return `Your sales are ${trend} with the latest value at ${latest.toFixed(2)}.`;
        }
      }
    }

    // Performance questions
    if (q.includes('performance') || q.includes('how') || q.includes('doing')) {
      const firstNumericCol = numericColumns[0];
      if (firstNumericCol) {
        const values = currentRows.map(row => parseFloat(row[firstNumericCol])).filter(v => !isNaN(v));
        if (values.length > 0) {
          const avg = values.reduce((a, b) => a + b, 0) / values.length;
          const latest = values[values.length - 1];
          const status = latest > avg ? 'above average' : 'below average';
          return `Performance is ${status} with current value ${latest.toFixed(2)} against average ${avg.toFixed(2)}.`;
        }
      }
    }

    // Trend questions
    if (q.includes('trend') || q.includes('pattern') || q.includes('direction')) {
      const firstNumericCol = numericColumns[0];
      if (firstNumericCol && currentRows.length >= 2) {
        const values = currentRows.map(row => parseFloat(row[firstNumericCol])).filter(v => !isNaN(v));
        if (values.length >= 2) {
          const first = values[0];
          const last = values[values.length - 1];
          const change = ((last - first) / first * 100).toFixed(1);
          const direction = last > first ? 'upward' : 'downward';
          return `Showing ${direction} trend with ${change}% change from ${first.toFixed(2)} to ${last.toFixed(2)}.`;
        }
      }
    }

    // Prediction questions
    if (q.includes('predict') || q.includes('forecast') || q.includes('next')) {
      const firstNumericCol = numericColumns[0];
      if (firstNumericCol && currentRows.length >= 2) {
        const values = currentRows.map(row => parseFloat(row[firstNumericCol])).filter(v => !isNaN(v));
        if (values.length >= 2) {
          const last = values[values.length - 1];
          const secondLast = values[values.length - 2];
          const trend = last - secondLast;
          const prediction = (last + trend).toFixed(2);
          return `Based on recent trend, next value predicted around ${prediction}.`;
        }
      }
    }

    // City frequency questions
    if (q.includes('city') && (q.includes('more') || q.includes('appeared') || q.includes('frequent') || q.includes('times'))) {
      const cityColumn = columns.find(col => col.toLowerCase().includes('city'));
      if (cityColumn) {
        const cityCounts: Record<string, number> = {};
        currentRows.forEach(row => {
          const city = row[cityColumn];
          if (city) {
            cityCounts[city] = (cityCounts[city] || 0) + 1;
          }
        });
        
        const sortedCities = Object.entries(cityCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5);
        
        if (sortedCities.length > 0) {
          const topCity = sortedCities[0];
          const totalCities = sortedCities.reduce((sum, [, count]) => sum + count, 0);
          const percentage = ((topCity[1] / totalCities) * 100).toFixed(1);
          
          let response = `🏙️ **${topCity[0]}** appears most frequently (${topCity[1]} times, ${percentage}% of records).`;
          
          if (sortedCities.length > 1) {
            response += `\n\n**Top cities by frequency:**`;
            sortedCities.forEach(([city, count], index) => {
              const cityPercentage = ((count / totalCities) * 100).toFixed(1);
              response += `\n${index + 1}. ${city}: ${count} times (${cityPercentage}%)`;
            });
          }
          
          return response;
        }
      }
      return "I couldn't find a 'City' column in the current data.";
    }

    // Branch frequency questions
    if (q.includes('branch') && (q.includes('more') || q.includes('appeared') || q.includes('frequent') || q.includes('times'))) {
      const branchColumn = columns.find(col => col.toLowerCase().includes('branch'));
      if (branchColumn) {
        const branchCounts: Record<string, number> = {};
        currentRows.forEach(row => {
          const branch = row[branchColumn];
          if (branch) {
            branchCounts[branch] = (branchCounts[branch] || 0) + 1;
          }
        });
        
        const sortedBranches = Object.entries(branchCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5);
        
        if (sortedBranches.length > 0) {
          const topBranch = sortedBranches[0];
          const totalBranches = sortedBranches.reduce((sum, [, count]) => sum + count, 0);
          const percentage = ((topBranch[1] / totalBranches) * 100).toFixed(1);
          
          let response = `🏢 **${topBranch[0]}** appears most frequently (${topBranch[1]} times, ${percentage}% of records).`;
          
          if (sortedBranches.length > 1) {
            response += `\n\n**Top branches by frequency:**`;
            sortedBranches.forEach(([branch, count], index) => {
              const branchPercentage = ((count / totalBranches) * 100).toFixed(1);
              response += `\n${index + 1}. ${branch}: ${count} times (${branchPercentage}%)`;
            });
          }
          
          return response;
        }
      }
      return "I couldn't find a 'Branch' column in the current data.";
    }

    // Gender analysis questions
    if (q.includes('female') || q.includes('male') || q.includes('gender')) {
      // Look for gender-related columns
      const genderColumns = columns.filter(col => 
        col.toLowerCase().includes('gender') || 
        col.toLowerCase().includes('sex') || 
        col.toLowerCase().includes('male') || 
        col.toLowerCase().includes('female')
      );
      
      if (genderColumns.length > 0) {
        const genderColumn = genderColumns[0];
        const genderCounts: Record<string, number> = {};
        
        currentRows.forEach(row => {
          const gender = String(row[genderColumn]).toLowerCase().trim();
          if (gender) {
            // Normalize gender values
            let normalizedGender = gender;
            if (gender.includes('f') || gender.includes('female') || gender.includes('woman')) {
              normalizedGender = 'female';
            } else if (gender.includes('m') || gender.includes('male') || gender.includes('man')) {
              normalizedGender = 'male';
            }
            
            genderCounts[normalizedGender] = (genderCounts[normalizedGender] || 0) + 1;
          }
        });
        
        const totalGender = Object.values(genderCounts).reduce((sum, count) => sum + count, 0);
        const femaleCount = genderCounts['female'] || 0;
        const maleCount = genderCounts['male'] || 0;
        
        if (q.includes('female')) {
          const femalePercentage = ((femaleCount / totalGender) * 100).toFixed(1);
          let response = `👩 **Female customers: ${femaleCount} (${femalePercentage}%)**`;
          
          if (q.includes('branch')) {
            // Female customers by branch
            const branchGenderData: Record<string, { female: number; total: number }> = {};
            const branchColumn = columns.find(col => col.toLowerCase().includes('branch'));
            
            if (branchColumn) {
              currentRows.forEach(row => {
                const branch = row[branchColumn];
                const gender = String(row[genderColumn]).toLowerCase().trim();
                const isFemale = gender.includes('f') || gender.includes('female') || gender.includes('woman');
                
                if (branch) {
                  if (!branchGenderData[branch]) {
                    branchGenderData[branch] = { female: 0, total: 0 };
                  }
                  branchGenderData[branch].total++;
                  if (isFemale) {
                    branchGenderData[branch].female++;
                  }
                }
              });
              
              const sortedBranches = Object.entries(branchGenderData)
                .sort(([, a], [, b]) => b.female - a.female)
                .slice(0, 5);
              
              if (sortedBranches.length > 0) {
                response += `\n\n**Female customers by branch:**`;
                sortedBranches.forEach(([branch, data], index) => {
                  const femalePercentage = data.total > 0 ? ((data.female / data.total) * 100).toFixed(1) : '0.0';
                  response += `\n${index + 1}. ${branch}: ${data.female} female customers (${femalePercentage}%)`;
                });
              }
            }
          }
          
          return response;
        } else if (q.includes('male')) {
          const malePercentage = ((maleCount / totalGender) * 100).toFixed(1);
          return `👨 **Male customers: ${maleCount} (${malePercentage}%)**`;
        } else {
          return `👥 **Gender distribution:** Female: ${femaleCount} (${((femaleCount / totalGender) * 100).toFixed(1)}%), Male: ${maleCount} (${((maleCount / totalGender) * 100).toFixed(1)}%)`;
        }
      }
      
      return "I couldn't find any gender-related columns in the current data.";
    }

    // Summary questions
    if (q.includes('summary') || q.includes('overview') || q.includes('analyze')) {
      const rowCount = currentRows.length;
      const colCount = columns.length;
      const numColCount = numericColumns.length;
      return `Dataset shows ${rowCount} recent rows with ${colCount} columns including ${numColCount} numeric fields for analysis.`;
    }

    // Default response
    return `Based on the current data, I can see ${currentRows.length} recent records with columns like ${columns.slice(0, 3).join(', ')}. What specific aspect would you like me to analyze?`;
  };

  const simulateTypingEffect = async (content: string, messageId: string) => {
    const words = content.split(' ');
    let displayedContent = '';
    
    for (let i = 0; i < words.length; i++) {
      displayedContent += (i > 0 ? ' ' : '') + words[i];
      
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: displayedContent }
          : msg
      ));
      
      // Don't auto-scroll during typing - let user control scrolling
      
      await new Promise(resolve => setTimeout(resolve, 30));
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
      status: 'sent'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Add placeholder for AI response
    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: Message = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      status: 'sending'
    };

    setMessages(prev => [...prev, aiMessage]);

    try {
      let response = '';
      
      if (onSendMessage) {
        response = await onSendMessage(inputValue);
      } else {
        // Fast rule-based analysis using current three rows
        const currentRows = data.slice(-3);
        response = getRuleBasedResponse(inputValue, currentRows, columns);
        
        // Try Groq AI only if rule-based response is generic
        // Always try AI first, fallback to rule-based if AI fails
        try {
          const res = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: inputValue,
              dataSample: currentRows,
              columns,
              dataProfile: []
            }),
          });
          const json = await res.json();
          if (res.ok && json.answer) {
            response = json.answer;
          } else {
            // AI failed, use rule-based response
            console.log('AI failed, using rule-based response');
          }
        } catch (aiError) {
          console.log('AI failed, using rule-based response:', aiError);
        }
      }

      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, content: response, status: 'sent' }
          : msg
      ));

      // Start typing effect
      await simulateTypingEffect(response, aiMessageId);

    } catch (error) {
      console.error('Error sending message:', error);
      // Always provide rule-based fallback
      const currentRows = data.slice(-3);
      const fallbackResponse = getRuleBasedResponse(inputValue, currentRows, columns);
      
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, content: fallbackResponse, status: 'sent' }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Message copied to clipboard');
  };

  const regenerateResponse = async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message || message.role !== 'assistant') return;

    setIsLoading(true);
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, content: '', status: 'sending' }
        : msg
    ));

    try {
      const userMessage = messages[messages.indexOf(message) - 1];
      if (!userMessage) return;

      let response = '';
      
      if (onSendMessage) {
        response = await onSendMessage(userMessage.content);
      } else {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: userMessage.content,
            dataSample: data.slice(0, 10),
            columns,
            dataProfile: []
          }),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || 'Failed to get response');
        response = json.answer || 'No response received.';
      }

      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: response, status: 'sent' }
          : msg
      ));

      await simulateTypingEffect(response, messageId);

    } catch (error) {
      console.error('Error regenerating response:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to regenerate';
      
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: `Failed to regenerate: ${errorMessage}`, status: 'error' }
          : msg
      ));
      
      toast.error('Failed to regenerate response');
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedQuestions = [
    "What are the key insights from this data?",
    "How can I increase my revenue?",
    "What trends do you notice in the data?",
    "Which metrics should I focus on improving?",
    "Can you identify any anomalies or outliers?"
  ];

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg min-h-0">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI Data Analyst</h3>
            <p className="text-sm text-gray-500">Professional insights powered by AI</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Welcome to AI Data Analysis</h3>
            <p className="text-gray-600 mb-4">Ask me anything about your data and I'll provide professional insights</p>
            
            <div className="max-w-md mx-auto">
              <p className="text-sm text-gray-500 mb-3">Suggested questions:</p>
              <div className="grid grid-cols-1 gap-2">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => setInputValue(question)}
                    className="text-left p-3 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
            )}
            
            <div className={`max-w-2xl ${message.role === 'user' ? 'order-first' : ''}`}>
              <div
                className={`rounded-lg p-4 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {message.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                ) : (
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: formatAIResponse(message.content) }}
                  />
                )}
              </div>
              
              {/* Message actions */}
              <div className="flex items-center gap-2 mt-2 px-2">
                <span className="text-xs text-gray-500">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                
                {message.role === 'assistant' && message.status === 'sent' && (
                  <>
                    <button
                      onClick={() => copyMessage(message.content)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                      title="Copy message"
                    >
                      <Copy className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => regenerateResponse(message.id)}
                      disabled={isLoading}
                      className="p-1 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
                      title="Regenerate response"
                    >
                      <RefreshCw className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                      title="Good response"
                    >
                      <ThumbsUp className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                      title="Bad response"
                    >
                      <ThumbsDown className="w-4 h-4 text-gray-500" />
                    </button>
                  </>
                )}
                
                {message.status === 'sending' && (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    <span className="text-xs text-gray-500">Thinking...</span>
                  </div>
                )}
                
                {message.status === 'error' && (
                  <span className="text-xs text-red-500">Failed to send</span>
                )}
              </div>
            </div>
            
            {message.role === 'user' && (
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 order-first">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your data..."
            className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
};
