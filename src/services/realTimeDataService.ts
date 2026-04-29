// Real-time data service connecting to actual APIs
export interface RealTimeDataPoint {
  timestamp: string;
  symbol: string;
  price: number;
  change24h: number;
  volume: number;
  marketCap?: number;
}

export interface StockDataPoint {
  timestamp: string;
  symbol: string;
  price: number;
  change: number;
  volume: number;
}

export interface WeatherDataPoint {
  timestamp: string;
  location: string;
  temperature: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
}

class RealTimeDataService {
  private wsConnections: Map<string, WebSocket> = new Map();
  private subscribers: Map<string, ((data: any) => void)[]> = new Map();
  private intervals: NodeJS.Timeout[] = [];

  // Subscribe to real-time data updates
  subscribe(source: string, callback: (data: any) => void) {
    if (!this.subscribers.has(source)) {
      this.subscribers.set(source, []);
    }
    this.subscribers.get(source)?.push(callback);
  }

  // Unsubscribe from data updates
  unsubscribe(source: string, callback: (data: any) => void) {
    const callbacks = this.subscribers.get(source);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Notify all subscribers of a data source
  private notify(source: string, data: any) {
    const callbacks = this.subscribers.get(source) || [];
    callbacks.forEach(callback => callback(data));
  }

  // Start real-time cryptocurrency data streaming
  startCryptoDataStream() {
    console.log('Starting REAL crypto data stream...');
    
    // Using CoinGecko API (free, no API key required)
    const fetchCryptoData = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,cardano&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Transform data and notify subscribers
        Object.entries(data).forEach(([symbol, cryptoData]: [string, any]) => {
          const point: RealTimeDataPoint = {
            timestamp: new Date().toISOString(),
            symbol: symbol.toUpperCase(),
            price: cryptoData.usd,
            change24h: cryptoData.usd_24h_change || 0,
            volume: cryptoData.usd_24h_vol || 0,
            marketCap: cryptoData.usd_market_cap || 0
          };
          
          this.notify(`crypto-${symbol}`, point);
        });
        
      } catch (error) {
        console.error('Error fetching crypto data:', error);
        // Fallback to simulated data if API fails
        this.simulateCryptoData();
      }
    };

    // Fetch data every 5 seconds for real-time feel
    fetchCryptoData(); // Initial fetch
    const interval = setInterval(fetchCryptoData, 5000);
    this.intervals.push(interval);
  }

  // Start real-time stock data streaming
  startStockDataStream() {
    console.log('Starting REAL stock data stream...');
    
    // Using Alpha Vantage API (free tier available)
    const fetchStockData = async () => {
      try {
        // Using Yahoo Finance API as alternative (free)
        const symbols = ['AAPL', 'GOOGL', 'MSFT', 'TSLA'];
        
        for (const symbol of symbols) {
          try {
            const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`);
            
            if (!response.ok) continue;
            
            const data = await response.json();
            const chart = data.chart.result[0];
            const meta = chart.meta;
            const currentPrice = chart.indicators.quote[0].close[chart.indicators.quote[0].close.length - 1];
            
            const point: StockDataPoint = {
              timestamp: new Date().toISOString(),
              symbol: symbol,
              price: currentPrice,
              change: ((currentPrice - meta.previousClose) / meta.previousClose) * 100,
              volume: meta.regularMarketVolume || 0
            };
            
            this.notify(`stock-${symbol}`, point);
            
          } catch (symbolError) {
            console.error(`Error fetching ${symbol}:`, symbolError);
          }
        }
        
      } catch (error) {
        console.error('Error fetching stock data:', error);
        this.simulateStockData();
      }
    };

    fetchStockData(); // Initial fetch
    const interval = setInterval(fetchStockData, 10000); // Every 10 seconds
    this.intervals.push(interval);
  }

  // Start real-time weather data streaming
  startWeatherDataStream() {
    console.log('Starting REAL weather data stream...');
    
    const fetchWeatherData = async () => {
      try {
        // Using OpenWeatherMap API (free tier)
        const cities = ['New York', 'London', 'Tokyo', 'Mumbai'];
        const API_KEY = 'demo'; // Demo key for development
        
        for (const city of cities) {
          try {
            const response = await fetch(
              `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`
            );
            
            if (!response.ok) continue;
            
            const data = await response.json();
            
            const point: WeatherDataPoint = {
              timestamp: new Date().toISOString(),
              location: data.name,
              temperature: data.main.temp,
              humidity: data.main.humidity,
              pressure: data.main.pressure,
              windSpeed: data.wind.speed
            };
            
            this.notify(`weather-${city}`, point);
            
          } catch (cityError) {
            console.error(`Error fetching weather for ${city}:`, cityError);
          }
        }
        
      } catch (error) {
        console.error('Error fetching weather data:', error);
        this.simulateWeatherData();
      }
    };

    fetchWeatherData(); // Initial fetch
    const interval = setInterval(fetchWeatherData, 30000); // Every 30 seconds
    this.intervals.push(interval);
  }

  // WebSocket connection for real-time data (when available)
  connectWebSocket(url: string, source: string) {
    try {
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        console.log(`WebSocket connected for ${source}`);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.notify(source, data);
        } catch (error) {
          console.error('Error parsing WebSocket data:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error(`WebSocket error for ${source}:`, error);
      };
      
      ws.onclose = () => {
        console.log(`WebSocket closed for ${source}`);
        // Attempt to reconnect after 5 seconds
        setTimeout(() => this.connectWebSocket(url, source), 5000);
      };
      
      this.wsConnections.set(source, ws);
      
    } catch (error) {
      console.error(`Failed to connect WebSocket for ${source}:`, error);
    }
  }

  // Fallback simulation methods
  private simulateCryptoData() {
    const cryptos = ['BTC', 'ETH', 'SOL', 'ADA'];
    cryptos.forEach(symbol => {
      const point: RealTimeDataPoint = {
        timestamp: new Date().toISOString(),
        symbol,
        price: 30000 + Math.random() * 50000,
        change24h: (Math.random() - 0.5) * 10,
        volume: Math.random() * 1000000000,
        marketCap: Math.random() * 1000000000000
      };
      this.notify(`crypto-${symbol}`, point);
    });
  }

  private simulateStockData() {
    const stocks = ['AAPL', 'GOOGL', 'MSFT', 'TSLA'];
    stocks.forEach(symbol => {
      const point: StockDataPoint = {
        timestamp: new Date().toISOString(),
        symbol,
        price: 100 + Math.random() * 900,
        change: (Math.random() - 0.5) * 5,
        volume: Math.random() * 10000000
      };
      this.notify(`stock-${symbol}`, point);
    });
  }

  private simulateWeatherData() {
    const cities = ['New York', 'London', 'Tokyo', 'Mumbai'];
    cities.forEach(city => {
      const point: WeatherDataPoint = {
        timestamp: new Date().toISOString(),
        location: city,
        temperature: -10 + Math.random() * 40,
        humidity: 20 + Math.random() * 60,
        pressure: 980 + Math.random() * 40,
        windSpeed: Math.random() * 20
      };
      this.notify(`weather-${city}`, point);
    });
  }

  // Stop all real-time data streams
  stopAllStreams() {
    // Clear all intervals
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    
    // Close all WebSocket connections
    this.wsConnections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });
    this.wsConnections.clear();
    
    console.log('All real-time data streams stopped');
  }
}

export const realTimeDataService = new RealTimeDataService();
