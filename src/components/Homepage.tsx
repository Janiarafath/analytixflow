import React, { useState } from 'react';
import { Database, BarChart2, Upload, Download, FileType, ArrowRight, Sparkles, Zap, BarChart, Play, ChevronRight, LineChart, Table, GitBranch, Workflow, X, Brain, Shield, Cpu } from 'lucide-react';

export const Homepage = () => {
  const [showVideoModal, setShowVideoModal] = useState(false);

  const VideoModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Product Demo</h3>
          <button onClick={() => setShowVideoModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="relative" style={{ paddingBottom: '56.25%' }}>
          <iframe
            className="absolute inset-0 w-full h-full rounded-lg"
            src="https://www.youtube.com/embed/dQw4w9WgXcQ"
            title="Product Demo"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">
      {/* Navbar */}
      <nav className="bg-white/10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <BarChart2 className="h-8 w-8 text-white absolute opacity-60 transform translate-x-1 translate-y-1" />
                  <Database className="h-8 w-8 text-white relative z-10" />
                </div>
                <span className="ml-2 text-white text-xl font-bold">AnalytixFlow</span>
              </div>
            </div>
            <div>
              <a
                href="/auth"
                className="px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-white/90 transition-colors font-medium"
              >
                Sign In
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-6">
            Transform Your Data with Intelligence and Precision
          </h1>
          <p className="text-xl text-white/80 mb-8">
            Powerful ETL tools and advanced data analysis capabilities in one platform.
            Extract, transform, and gain insights from your data with ease.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/auth"
              className="px-8 py-4 bg-white text-indigo-600 rounded-lg hover:bg-white/90 transition-colors flex items-center gap-2 text-lg font-semibold w-full sm:w-auto justify-center"
            >
              Get Started Free
              <ArrowRight className="h-5 w-5" />
            </a>
            <button
              onClick={() => setShowVideoModal(true)}
              className="px-8 py-4 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2 text-lg font-semibold w-full sm:w-auto justify-center"
            >
              <Play className="h-5 w-5" />
              Watch Demo
            </button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Workflow className="h-8 w-8 text-white" />}
            title="ETL Processing"
            description="Extract data from multiple sources, transform it with powerful tools, and load it anywhere."
          />
          <FeatureCard
            icon={<LineChart className="h-8 w-8 text-white" />}
            title="Advanced Analytics"
            description="Visualize trends, generate predictions, and gain valuable insights."
          />
          <FeatureCard
            icon={<Brain className="h-8 w-8 text-white" />}
            title="AI-Powered Insights"
            description="Leverage AI to automatically analyze your data and discover hidden patterns."
          />
          <FeatureCard
            icon={<GitBranch className="h-8 w-8 text-white" />}
            title="Data Pipeline"
            description="Create automated data pipelines with custom transformations."
          />
          <FeatureCard
            icon={<Shield className="h-8 w-8 text-white" />}
            title="Secure Processing"
            description="Your data is processed securely with enterprise-grade encryption and privacy controls."
          />
          <FeatureCard
            icon={<Cpu className="h-8 w-8 text-white" />}
            title="Smart Automation"
            description="Automate repetitive data tasks with intelligent workflows and scheduled processing."
          />
        </div>
      </div>

      {/* Premium Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-white/5 backdrop-blur-sm rounded-3xl my-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white">Premium Features</h2>
          <p className="mt-4 text-xl text-white/80">Unlock the full potential of your data</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Sparkles className="h-10 w-10 text-yellow-300 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Unlimited Uploads</h3>
            <p className="text-white/70">Process as much data as you need without any limitations.</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Brain className="h-10 w-10 text-blue-300 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Advanced AI Analysis</h3>
            <p className="text-white/70">Get deeper insights with our premium AI-powered data analysis tools.</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <Zap className="h-10 w-10 text-purple-300 mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Priority Support</h3>
            <p className="text-white/70">Get faster responses and dedicated assistance for your data needs.</p>
          </div>
        </div>

        <div className="text-center mt-12">
          <a
            href="/upgrade"
            className="inline-flex items-center px-8 py-4 bg-white text-indigo-600 rounded-lg hover:bg-white/90 transition-colors text-lg font-semibold"
          >
            Upgrade to Premium
            <ArrowRight className="ml-2 h-5 w-5" />
          </a>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white">How It Works</h2>
          <p className="mt-4 text-xl text-white/80">Simple steps to transform your data</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-white/10 backdrop-blur-md h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Upload className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">1. Upload Your Data</h3>
            <p className="text-white/70">Upload CSV, Excel files or connect to APIs to import your data.</p>
          </div>
          
          <div className="text-center">
            <div className="bg-white/10 backdrop-blur-md h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Workflow className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">2. Transform & Analyze</h3>
            <p className="text-white/70">Clean, transform, and analyze your data with our powerful tools.</p>
          </div>
          
          <div className="text-center">
            <div className="bg-white/10 backdrop-blur-md h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Download className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">3. Export Results</h3>
            <p className="text-white/70">Download your processed data in various formats or visualize insights.</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white/5 backdrop-blur-md py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-2 mb-2">
              <div className="relative">
                <BarChart2 className="h-6 w-6 text-white absolute opacity-60 transform translate-x-0.5 translate-y-0.5" />
                <Database className="h-6 w-6 text-white relative z-10" />
              </div>
              <span className="text-white text-lg font-bold">AnalytixFlow</span>
            </div>
            <p className="text-white/60 text-sm">
              Powered by{' '}
              <a
                href="https://fzno.in"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-white/90 transition-colors"
              >
                fzno.in
              </a>
            </p>
          </div>
        </div>
      </footer>

      {showVideoModal && <VideoModal />}
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/20">
    <div className="mb-4">{icon}</div>
    <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
    <p className="text-white/70">{description}</p>
  </div>
);