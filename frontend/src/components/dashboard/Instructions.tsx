/**
 * Instructions Component
 * Step-by-step guide for using the FraudGuard fraud detection simulator
 * Features collapsible sections, FAQs, and keyboard shortcuts reference
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface Step {
  id: number;
  title: string;
  description: string;
  icon: string;
  tips?: string[];
}

const steps: Step[] = [
  {
    id: 1,
    title: 'Start the Simulation',
    description: 'Click the "Start Simulation" button in the header to begin generating real-time transaction data. The system will create synthetic credit card transactions at your configured speed.',
    icon: '▶️',
    tips: [
      'Use the speed slider in the sidebar to control transaction rate',
      'Faster speeds generate more data but may be harder to follow',
      'Start slow (1-2 tx/sec) to understand the flow'
    ]
  },
  {
    id: 2,
    title: 'Monitor Transactions',
    description: 'Watch the Transaction Feed as new transactions appear. Each transaction shows amount, merchant, and risk assessment. Fraudulent transactions are highlighted in red.',
    icon: '📊',
    tips: [
      'Green = Safe transaction (low fraud probability)',
      'Yellow = Suspicious (medium risk, needs review)',
      'Red = Likely fraud (high probability detected)',
      'Click any transaction for detailed analysis'
    ]
  },
  {
    id: 3,
    title: 'Analyze with SHAP',
    description: 'Click on any transaction to see its SHAP (SHapley Additive exPlanations) breakdown. This shows exactly WHY the ML model flagged or approved the transaction.',
    icon: '🔬',
    tips: [
      'Red bars = features pushing toward fraud',
      'Blue bars = features pushing toward legitimate',
      'Longer bars = stronger influence on prediction',
      'Common fraud indicators: unusual amounts, late hours, high velocity'
    ]
  },
  {
    id: 4,
    title: 'Inject Test Fraud',
    description: 'Use the "Inject Fraud" button to manually insert a known fraudulent transaction. This helps you see how the model detects anomalies in real-time.',
    icon: '⚠️',
    tips: [
      'Injected fraud uses patterns from real fraud cases',
      'Watch how quickly the model flags the transaction',
      'Compare SHAP explanations between fraud and legitimate'
    ]
  },
  {
    id: 5,
    title: 'View Performance Metrics',
    description: 'The Metrics Dashboard shows real-time model performance including accuracy, precision, recall, and F1 score. Monitor these to understand detection effectiveness.',
    icon: '📈',
    tips: [
      'Accuracy = overall correct predictions',
      'Precision = of flagged fraud, how many were real',
      'Recall = of real fraud, how many were caught',
      'F1 Score = balanced measure of precision & recall'
    ]
  },
  {
    id: 6,
    title: 'Filter & Search',
    description: 'Use the sidebar filters to focus on specific transaction types. Filter by status (fraud/legitimate/all) or search by transaction ID, amount, or merchant.',
    icon: '🔍',
    tips: [
      'Filter by "Fraud Only" to study fraud patterns',
      'Search supports partial matches',
      'Combine filters for precise analysis'
    ]
  }
];

const faqs = [
  {
    question: 'What ML models are used?',
    answer: 'FraudGuard uses an ensemble of XGBoost (gradient boosting) and Isolation Forest (anomaly detection). XGBoost handles pattern recognition while Isolation Forest catches novel fraud patterns.'
  },
  {
    question: 'Is this using real transaction data?',
    answer: 'No, all transactions are synthetically generated based on statistical patterns from anonymized datasets. No real financial data is used.'
  },
  {
    question: 'What is SHAP?',
    answer: 'SHAP (SHapley Additive exPlanations) is a game-theoretic approach to explain ML predictions. It shows how each feature contributes to the final fraud probability score.'
  },
  {
    question: 'Why do some legitimate transactions get flagged?',
    answer: 'No fraud detection system is perfect. False positives occur when legitimate transactions share characteristics with fraud patterns. The goal is balancing fraud catch rate vs. customer friction.'
  },
  {
    question: 'Can I train my own model?',
    answer: 'Yes! The backend supports model versioning. You can upload new training data and retrain models via the API. See the API documentation for details.'
  }
];

export function Instructions() {
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [showQuickStart, setShowQuickStart] = useState(true);

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Quick Start Banner */}
      <AnimatePresence>
        {showQuickStart && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative"
          >
            <Card variant="gradient" className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
              <button
                onClick={() => setShowQuickStart(false)}
                className="absolute top-4 right-4 text-white/70 hover:text-white text-xl"
              >
                ✕
              </button>
              <div className="flex items-start gap-4">
                <span className="text-4xl">🚀</span>
                <div>
                  <h2 className="text-xl font-bold mb-2">Quick Start</h2>
                  <p className="text-white/90 mb-4">
                    New to FraudGuard? Here's the fastest way to get started:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-white/90">
                    <li>Click <Badge variant="safe" className="mx-1">Start Simulation</Badge> in the header</li>
                    <li>Watch transactions flow into the feed</li>
                    <li>Click any red transaction to see why it's fraud</li>
                    <li>Try <Badge variant="warning" className="mx-1">Inject Fraud</Badge> to test detection</li>
                  </ol>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Instructions Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          📖 How to Use FraudGuard
        </h1>
        <p className="text-slate-400">
          Your guide to understanding and using the fraud detection simulator
        </p>
      </div>

      {/* Step-by-Step Guide */}
      <Card padding="none">
        <CardHeader title="📋 Step-by-Step Guide" className="px-6 pt-6" />
        <div className="divide-y divide-slate-700/50">
          {steps.map((step) => (
            <motion.div
              key={step.id}
              className="cursor-pointer"
              onClick={() => setActiveStep(activeStep === step.id ? null : step.id)}
            >
              <div className="p-4 hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{step.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="info" size="sm">Step {step.id}</Badge>
                        <h3 className="font-medium text-white">
                          {step.title}
                        </h3>
                      </div>
                    </div>
                  </div>
                  <motion.span
                    animate={{ rotate: activeStep === step.id ? 180 : 0 }}
                    className="text-slate-400"
                  >
                    ▼
                  </motion.span>
                </div>
              </div>
              
              <AnimatePresence>
                {activeStep === step.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pl-16">
                      <p className="text-slate-400 mb-3">
                        {step.description}
                      </p>
                      {step.tips && (
                        <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-3">
                          <h4 className="text-sm font-medium text-blue-300 mb-2">
                            💡 Pro Tips:
                          </h4>
                          <ul className="text-sm text-blue-400 space-y-1">
                            {step.tips.map((tip, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-blue-500">•</span>
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Understanding the Interface */}
      <Card>
        <CardHeader title="🖥️ Understanding the Interface" />
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-800/50 rounded-lg">
            <h3 className="font-medium mb-2 flex items-center gap-2 text-white">
              <span className="text-blue-500">◀</span> Left Sidebar
            </h3>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• Speed control slider</li>
              <li>• Transaction filters</li>
              <li>• Performance metrics</li>
              <li>• Dataset information</li>
            </ul>
          </div>
          <div className="p-4 bg-slate-800/50 rounded-lg">
            <h3 className="font-medium mb-2 flex items-center gap-2 text-white">
              <span className="text-blue-500">▶</span> Right Panel
            </h3>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• Transaction details</li>
              <li>• SHAP explanations</li>
              <li>• Feature contributions</li>
              <li>• Risk breakdown</li>
            </ul>
          </div>
          <div className="p-4 bg-slate-800/50 rounded-lg">
            <h3 className="font-medium mb-2 flex items-center gap-2 text-white">
              <span className="text-blue-500">▲</span> Header Bar
            </h3>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• Start/Stop simulation</li>
              <li>• Inject fraud button</li>
              <li>• Load demo data</li>
              <li>• Connection status</li>
            </ul>
          </div>
          <div className="p-4 bg-slate-800/50 rounded-lg">
            <h3 className="font-medium mb-2 flex items-center gap-2 text-white">
              <span className="text-blue-500">■</span> Main Feed
            </h3>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• Real-time transaction list</li>
              <li>• Color-coded risk levels</li>
              <li>• Search functionality</li>
              <li>• Click for details</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* FAQ Section */}
      <Card padding="none">
        <CardHeader title="❓ Frequently Asked Questions" className="px-6 pt-6" />
        <div className="divide-y divide-slate-700/50">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              className="cursor-pointer"
              onClick={() => setActiveFaq(activeFaq === index ? null : index)}
            >
              <div className="p-4 hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-white">
                    {faq.question}
                  </h3>
                  <motion.span
                    animate={{ rotate: activeFaq === index ? 180 : 0 }}
                    className="text-slate-400"
                  >
                    ▼
                  </motion.span>
                </div>
              </div>
              
              <AnimatePresence>
                {activeFaq === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4">
                      <p className="text-slate-400">
                        {faq.answer}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Keyboard Shortcuts */}
      <Card>
        <CardHeader title="⌨️ Keyboard Shortcuts" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { key: 'Space', action: 'Start/Stop' },
            { key: 'F', action: 'Inject Fraud' },
            { key: 'D', action: 'Load Demo' },
            { key: 'Esc', action: 'Close Panel' },
            { key: '↑/↓', action: 'Navigate' },
            { key: 'Enter', action: 'Select' },
            { key: '/', action: 'Search' },
            { key: '?', action: 'Help' },
          ].map((shortcut) => (
            <div key={shortcut.key} className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-slate-700 rounded text-sm font-mono text-white">
                {shortcut.key}
              </kbd>
              <span className="text-sm text-slate-400">
                {shortcut.action}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Need More Help */}
      <Card variant="elevated" className="text-center">
        <span className="text-4xl mb-4 block">💬</span>
        <h3 className="text-lg font-semibold mb-2 text-white">Need More Help?</h3>
        <p className="text-slate-400 mb-4">
          Check out the documentation or open an issue on GitHub
        </p>
        <div className="flex justify-center gap-3">
          <Button variant="primary" size="sm">
            📚 View Docs
          </Button>
          <Button variant="outline" size="sm">
            🐛 Report Issue
          </Button>
        </div>
      </Card>
    </div>
  );
}
