// Customer Behavior Analytics Service - Real-time customer tracking and insights
export interface CustomerActivity {
  id: string;
  customerId: string;
  timestamp: string;
  action: 'view' | 'click' | 'purchase' | 'add_to_cart' | 'search' | 'login' | 'logout' | 'scroll' | 'hover';
  page: string;
  product?: string;
  category?: string;
  price?: number;
  quantity?: number;
  duration?: number;
  sessionId: string;
  device: 'mobile' | 'desktop' | 'tablet';
  location: string;
  referrer?: string;
}

export interface CustomerProfile {
  customerId: string;
  email?: string;
  name?: string;
  segment: 'new' | 'returning' | 'vip' | 'at_risk';
  totalPurchases: number;
  totalSpent: number;
  avgOrderValue: number;
  lastActivity: string;
  sessionCount: number;
  pageViews: number;
  conversionRate: number;
  favoriteCategories: string[];
  devices: string[];
  locations: string[];
  behaviorScore: number;
  churnRisk: number;
}

export interface BehaviorPattern {
  id: string;
  customerId: string;
  pattern: 'frequent_browser' | 'quick_buyer' | 'price_sensitive' | 'brand_loyal' | 'cart_abandoner' | 'night_shopper';
  confidence: number;
  description: string;
  detectedAt: string;
}

export interface ConversionFunnel {
  stage: 'awareness' | 'interest' | 'consideration' | 'intent' | 'purchase' | 'retention';
  customers: number;
  conversionRate: number;
  avgTimeInStage: number;
  dropOffReasons: string[];
}

class CustomerAnalyticsService {
  private activities: CustomerActivity[] = [];
  private profiles: Map<string, CustomerProfile> = new Map();
  private patterns: Map<string, BehaviorPattern[]> = new Map();
  private subscribers: Map<string, ((data: any) => void)[]> = new Map();
  private intervals: NodeJS.Timeout[] = [];

  // Subscribe to real-time updates
  subscribe(event: string, callback: (data: any) => void) {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }
    this.subscribers.get(event)!.push(callback);
  }

  // Notify subscribers
  private notify(event: string, data: any) {
    const callbacks = this.subscribers.get(event) || [];
    callbacks.forEach(callback => callback(data));
  }

  // Generate realistic customer activities
  generateCustomerActivity(): CustomerActivity {
    const customers = ['cust_001', 'cust_002', 'cust_003', 'cust_004', 'cust_005'];
    const actions: CustomerActivity['action'][] = ['view', 'click', 'purchase', 'add_to_cart', 'search', 'login', 'scroll', 'hover'];
    const pages = ['/home', '/products', '/cart', '/checkout', '/profile', '/search?q=laptop', '/products/electronics'];
    const products = ['Laptop Pro', 'Wireless Mouse', 'USB-C Hub', 'Mechanical Keyboard', '4K Monitor'];
    const categories = ['Electronics', 'Accessories', 'Computers', 'Gaming'];
    const devices: CustomerActivity['device'][] = ['mobile', 'desktop', 'tablet'];
    const locations = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'];

    const customerId = customers[Math.floor(Math.random() * customers.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const page = pages[Math.floor(Math.random() * pages.length)];
    const device = devices[Math.floor(Math.random() * devices.length)];
    const location = locations[Math.floor(Math.random() * locations.length)];

    const activity: CustomerActivity = {
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      customerId,
      timestamp: new Date().toISOString(),
      action,
      page,
      sessionId: `session_${customerId}_${Date.now()}`,
      device,
      location
    };

    // Add contextual data based on action
    if (action === 'view' || action === 'click' || action === 'add_to_cart') {
      activity.product = products[Math.floor(Math.random() * products.length)];
      activity.category = categories[Math.floor(Math.random() * categories.length)];
      if (action === 'purchase') {
        activity.price = 50 + Math.random() * 1000;
        activity.quantity = Math.floor(Math.random() * 3) + 1;
      }
    }

    if (action === 'scroll' || action === 'hover') {
      activity.duration = Math.floor(Math.random() * 300) + 10; // 10-310 seconds
    }

    return activity;
  }

  // Start real-time customer tracking
  startCustomerTracking() {
    console.log('🎯 Starting real-time customer behavior tracking...');

    // Generate activities every 2-5 seconds
    const generateActivities = () => {
      const numActivities = Math.floor(Math.random() * 3) + 1; // 1-3 activities
      
      for (let i = 0; i < numActivities; i++) {
        setTimeout(() => {
          const activity = this.generateCustomerActivity();
          this.activities.push(activity);
          
          // Keep only last 1000 activities
          if (this.activities.length > 1000) {
            this.activities = this.activities.slice(-1000);
          }

          // Update customer profile
          this.updateCustomerProfile(activity);
          
          // Detect behavior patterns
          this.detectBehaviorPatterns(activity.customerId);
          
          // Notify subscribers
          this.notify('customer_activity', activity);
          this.notify('metrics_update', this.calculateMetrics());
        }, i * 500);
      }
    };

    generateActivities(); // Initial burst
    const interval = setInterval(generateActivities, 3000 + Math.random() * 2000); // Every 3-5 seconds
    this.intervals.push(interval);

    console.log('🎯 Customer tracking started - monitoring real-time behavior');
  }

  // Update customer profile based on activity
  private updateCustomerProfile(activity: CustomerActivity) {
    let profile = this.profiles.get(activity.customerId);
    
    if (!profile) {
      profile = {
        customerId: activity.customerId,
        totalPurchases: 0,
        totalSpent: 0,
        avgOrderValue: 0,
        lastActivity: activity.timestamp,
        sessionCount: 1,
        pageViews: 0,
        conversionRate: 0,
        favoriteCategories: [],
        devices: [],
        locations: [],
        behaviorScore: 50,
        churnRisk: 50,
        segment: 'new'
      };
      this.profiles.set(activity.customerId, profile);
    }

    // Update profile metrics
    profile.lastActivity = activity.timestamp;
    profile.pageViews++;
    
    if (!profile.devices.includes(activity.device)) {
      profile.devices.push(activity.device);
    }
    
    if (!profile.locations.includes(activity.location)) {
      profile.locations.push(activity.location);
    }

    if (activity.category && !profile.favoriteCategories.includes(activity.category)) {
      profile.favoriteCategories.push(activity.category);
    }

    if (activity.action === 'purchase') {
      profile.totalPurchases++;
      profile.totalSpent += activity.price || 0;
      profile.avgOrderValue = profile.totalSpent / profile.totalPurchases;
      profile.segment = profile.totalPurchases > 10 ? 'vip' : profile.totalPurchases > 3 ? 'returning' : 'new';
    }

    // Update behavior score and churn risk
    this.updateBehaviorScore(profile);
  }

  // Calculate behavior score and churn risk
  private updateBehaviorScore(profile: CustomerProfile) {
    let score = 50; // Base score
    
    // Positive factors
    if (profile.totalPurchases > 0) score += 20;
    if (profile.totalPurchases > 5) score += 15;
    if (profile.avgOrderValue > 100) score += 10;
    if (profile.devices.length > 1) score += 5;
    if (profile.favoriteCategories.length > 2) score += 5;
    
    // Negative factors
    const daysSinceLastActivity = (Date.now() - new Date(profile.lastActivity).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastActivity > 30) score -= 20;
    if (daysSinceLastActivity > 14) score -= 10;
    
    profile.behaviorScore = Math.max(0, Math.min(100, score));
    profile.churnRisk = Math.max(0, Math.min(100, 100 - profile.behaviorScore));
    
    // Update segment based on churn risk
    if (profile.churnRisk > 70) {
      profile.segment = 'at_risk';
    } else if (profile.churnRisk < 30 && profile.totalPurchases > 5) {
      profile.segment = 'vip';
    }
  }

  // Detect behavior patterns
  private detectBehaviorPatterns(customerId: string) {
    const customerActivities = this.activities.filter(a => a.customerId === customerId);
    const patterns: BehaviorPattern[] = [];
    
    if (customerActivities.length < 5) return; // Not enough data

    // Analyze patterns
    const viewActions = customerActivities.filter(a => a.action === 'view').length;
    const purchaseActions = customerActivities.filter(a => a.action === 'purchase').length;
    const cartActions = customerActivities.filter(a => a.action === 'add_to_cart').length;
    const searchActions = customerActivities.filter(a => a.action === 'search').length;

    // Frequent browser pattern
    if (viewActions > 10 && purchaseActions === 0) {
      patterns.push({
        id: `pattern_${customerId}_${Date.now()}`,
        customerId,
        pattern: 'frequent_browser',
        confidence: 0.8,
        description: 'Customer browses frequently but doesn\'t purchase',
        detectedAt: new Date().toISOString()
      });
    }

    // Quick buyer pattern
    if (purchaseActions > 0 && viewActions < 3) {
      patterns.push({
        id: `pattern_${customerId}_${Date.now()}`,
        customerId,
        pattern: 'quick_buyer',
        confidence: 0.9,
        description: 'Customer makes quick purchasing decisions',
        detectedAt: new Date().toISOString()
      });
    }

    // Cart abandoner pattern
    if (cartActions > purchaseActions * 2) {
      patterns.push({
        id: `pattern_${customerId}_${Date.now()}`,
        customerId,
        pattern: 'cart_abandoner',
        confidence: 0.7,
        description: 'Customer frequently adds to cart but doesn\'t complete purchase',
        detectedAt: new Date().toISOString()
      });
    }

    // Price sensitive pattern (based on search behavior)
    if (searchActions > 5) {
      patterns.push({
        id: `pattern_${customerId}_${Date.now()}`,
        customerId,
        pattern: 'price_sensitive',
        confidence: 0.6,
        description: 'Customer searches frequently, possibly comparing prices',
        detectedAt: new Date().toISOString()
      });
    }

    this.patterns.set(customerId, patterns);
    this.notify('behavior_patterns', { customerId, patterns });
  }

  // Calculate real-time metrics
  calculateMetrics() {
    const now = new Date();
    const last5Minutes = new Date(now.getTime() - 5 * 60 * 1000);
    const recentActivities = this.activities.filter(a => new Date(a.timestamp) > last5Minutes);

    const activeUsers = new Set(recentActivities.map(a => a.customerId)).size;
    const totalPageViews = recentActivities.filter(a => a.action === 'view').length;
    const purchases = recentActivities.filter(a => a.action === 'purchase').length;
    const addToCarts = recentActivities.filter(a => a.action === 'add_to_cart').length;
    const totalRevenue = recentActivities
      .filter(a => a.action === 'purchase')
      .reduce((sum, a) => sum + (a.price || 0), 0);

    const conversionRate = totalPageViews > 0 ? (purchases / totalPageViews) * 100 : 0;
    const cartAbandonRate = addToCarts > 0 ? ((addToCarts - purchases) / addToCarts) * 100 : 0;

    // Device breakdown
    const deviceBreakdown = recentActivities.reduce((acc, activity) => {
      acc[activity.device] = (acc[activity.device] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Top locations
    const locationBreakdown = recentActivities.reduce((acc, activity) => {
      acc[activity.location] = (acc[activity.location] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      activeUsers,
      totalPageViews,
      purchases,
      addToCarts,
      totalRevenue,
      conversionRate,
      cartAbandonRate,
      deviceBreakdown,
      locationBreakdown,
      timestamp: now.toISOString()
    };
  }

  // Get customer profiles
  getCustomerProfiles(): CustomerProfile[] {
    return Array.from(this.profiles.values());
  }

  // Get behavior patterns
  getBehaviorPatterns(customerId?: string): BehaviorPattern[] {
    if (customerId) {
      return this.patterns.get(customerId) || [];
    }
    return Array.from(this.patterns.values()).flat();
  }

  // Get conversion funnel data
  getConversionFunnel(): ConversionFunnel[] {
    const totalCustomers = this.profiles.size;
    
    return [
      {
        stage: 'awareness',
        customers: totalCustomers,
        conversionRate: 100,
        avgTimeInStage: 30,
        dropOffReasons: []
      },
      {
        stage: 'interest',
        customers: Math.floor(totalCustomers * 0.8),
        conversionRate: 80,
        avgTimeInStage: 120,
        dropOffReasons: ['Not interested', 'Price too high']
      },
      {
        stage: 'consideration',
        customers: Math.floor(totalCustomers * 0.5),
        conversionRate: 62.5,
        avgTimeInStage: 300,
        dropOffReasons: ['Found better alternative', 'Complex checkout']
      },
      {
        stage: 'intent',
        customers: Math.floor(totalCustomers * 0.3),
        conversionRate: 60,
        avgTimeInStage: 180,
        dropOffReasons: ['Shipping costs', 'Payment issues']
      },
      {
        stage: 'purchase',
        customers: Math.floor(totalCustomers * 0.18),
        conversionRate: 60,
        avgTimeInStage: 240,
        dropOffReasons: []
      },
      {
        stage: 'retention',
        customers: Math.floor(totalCustomers * 0.12),
        conversionRate: 66.7,
        avgTimeInStage: 720,
        dropOffReasons: ['Poor experience', 'Better competitor']
      }
    ];
  }

  // Stop tracking
  stopTracking() {
    console.log('🛑 Stopping customer tracking...');
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
  }

  // Get recent activities
  getRecentActivities(limit: number = 50): CustomerActivity[] {
    return this.activities.slice(-limit).reverse();
  }

  // Get customer journey
  getCustomerJourney(customerId: string): CustomerActivity[] {
    return this.activities
      .filter(a => a.customerId === customerId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }
}

// Global instance
export const customerAnalyticsService = new CustomerAnalyticsService();
