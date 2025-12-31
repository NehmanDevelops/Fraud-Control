/**
 * FraudGuard Simulator - Main Application
 * 
 * A production-ready, real-time banking fraud detection dashboard
 * featuring ensemble ML models, SHAP explainability, and professional UI
 * 
 * Inspired by: RBC NOMI Insights, CIBC Fraud Alerts, Wise/Revolut
 * 
 * @author FraudGuard Team
 * @version 2.0.0
 */

import React, { useState, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import {
  TransactionFeed,
  TransactionDetail,
  MetricsDashboard,
  OnboardingCard,
  Instructions,
} from './components/dashboard';
import { useSimulator } from './hooks/useSimulator';
import { useTheme } from './hooks/useTheme';
import { cn } from './lib/utils';
import type { Transaction, FilterState } from './types';

// Loading Screen Component
function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-slate-950">
      <div className="text-center">
        <motion.div
          className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/25"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        </motion.div>
        <h2 className="text-xl font-bold text-white mb-2">Initializing FraudGuard</h2>
        <p className="text-slate-500 text-sm">Loading ML models and dataset...</p>
        <div className="mt-6 flex justify-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-blue-500"
              animate={{ y: [0, -8, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.1,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Error Screen Component
function ErrorScreen({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-center h-screen bg-slate-950">
      <div className="text-center max-w-md p-8">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-500/10 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Connection Error</h2>
        <p className="text-slate-400 text-sm mb-6">{error}</p>
        <button
          onClick={onRetry}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
        >
          Retry Connection
        </button>
        <p className="text-slate-500 text-xs mt-4">
          Make sure the backend server is running on port 8000
        </p>
      </div>
    </div>
  );
}

// Main App Component
export default function App() {
  // Hooks
  const { theme, isDark, toggleTheme } = useTheme();
  const {
    transactions,
    stats,
    isRunning,
    loading,
    error,
    connectionStatus,
    toggleSimulation,
    updateSpeed,
    injectFraud,
    loadDemoData,
    clearTransactions,
    resetSimulator,
    fetchExplanation,
  } = useSimulator();

  // Local state
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [activeView, setActiveView] = useState<'dashboard' | 'feed' | 'instructions'>('dashboard');
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    riskLevel: 'all',
    fraudOnly: false,
    minAmount: 0,
    maxAmount: 10000,
  });

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch =
        filters.searchQuery === '' ||
        tx.id.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
        tx.amount.toString().includes(filters.searchQuery);

      const matchesRisk =
        filters.riskLevel === 'all' || tx.risk_level === filters.riskLevel;

      const matchesFraud = !filters.fraudOnly || tx.is_fraud;

      const matchesAmount =
        Math.abs(tx.amount) >= filters.minAmount &&
        Math.abs(tx.amount) <= filters.maxAmount;

      return matchesSearch && matchesRisk && matchesFraud && matchesAmount;
    });
  }, [transactions, filters]);

  // Handlers
  const handleFilterChange = useCallback((changes: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...changes }));
  }, []);

  const handleSelectTransaction = useCallback((tx: Transaction) => {
    setSelectedTransaction(tx);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedTransaction(null);
  }, []);

  const handleStart = useCallback(() => {
    toggleSimulation();
    setShowOnboarding(false);
  }, [toggleSimulation]);

  const handleLoadDemo = useCallback(() => {
    loadDemoData();
    setShowOnboarding(false);
  }, [loadDemoData]);

  // Loading state
  if (loading) {
    return <LoadingScreen />;
  }

  // Error state
  if (error && !stats.models_ready) {
    return <ErrorScreen error={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className={cn('flex flex-col h-screen bg-slate-950 text-white', isDark && 'dark')}>
      {/* Header */}
      <Header
        isRunning={isRunning}
        isDark={isDark}
        modelsReady={stats.models_ready}
        connectionStatus={connectionStatus}
        onToggleSimulation={toggleSimulation}
        onInjectFraud={injectFraud}
        onLoadDemo={handleLoadDemo}
        onToggleTheme={toggleTheme}
        onReset={resetSimulator}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          stats={stats}
          speed={stats.speed}
          filters={filters}
          onSpeedChange={updateSpeed}
          onFilterChange={handleFilterChange}
          onClearTransactions={clearTransactions}
          className="hidden lg:flex"
        />

        {/* Main Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* View Toggle - Tab Navigation */}
          <div className="flex items-center gap-2 p-4 border-b border-slate-800">
            <button
              onClick={() => setActiveView('dashboard')}
              className={cn(
                'py-2 px-4 rounded-lg text-sm font-medium transition-colors',
                activeView === 'dashboard'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              )}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setActiveView('feed')}
              className={cn(
                'py-2 px-4 rounded-lg text-sm font-medium transition-colors',
                activeView === 'feed'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              )}
            >
              💳 Transactions
            </button>
            <button
              onClick={() => setActiveView('instructions')}
              className={cn(
                'py-2 px-4 rounded-lg text-sm font-medium transition-colors',
                activeView === 'instructions'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              )}
            >
              📖 Instructions
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden p-6">
            <AnimatePresence mode="wait">
              {/* Onboarding Card */}
              {showOnboarding && transactions.length === 0 && (
                <motion.div
                  key="onboarding"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mb-6"
                >
                  <OnboardingCard
                    onStart={handleStart}
                    onLoadDemo={handleLoadDemo}
                    onDismiss={() => setShowOnboarding(false)}
                    isVisible={showOnboarding}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Instructions View */}
            {activeView === 'instructions' ? (
              <div className="overflow-y-auto h-full">
                <Instructions />
              </div>
            ) : (
              <>
                {/* Desktop Layout */}
                <div className="hidden lg:grid lg:grid-cols-5 gap-6 h-full">
                  {/* Metrics Dashboard - 3 columns */}
                  <div className="col-span-3 overflow-y-auto pr-2">
                    <MetricsDashboard transactions={filteredTransactions} stats={stats} />
                  </div>

                  {/* Transaction Feed - 2 columns */}
                  <div className="col-span-2 h-full">
                    <TransactionFeed
                      transactions={filteredTransactions}
                      searchQuery={filters.searchQuery}
                      onSearchChange={(query) => handleFilterChange({ searchQuery: query })}
                      onSelectTransaction={handleSelectTransaction}
                      selectedTransactionId={selectedTransaction?.id}
                      className="h-full"
                    />
                  </div>
                </div>

                {/* Mobile Layout */}
                <div className="lg:hidden h-full">
                  {activeView === 'dashboard' ? (
                    <div className="overflow-y-auto h-full">
                      <MetricsDashboard transactions={filteredTransactions} stats={stats} />
                    </div>
                  ) : (
                    <TransactionFeed
                      transactions={filteredTransactions}
                      searchQuery={filters.searchQuery}
                      onSearchChange={(query) => handleFilterChange({ searchQuery: query })}
                      onSelectTransaction={handleSelectTransaction}
                      selectedTransactionId={selectedTransaction?.id}
                      className="h-full"
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </main>

        {/* Transaction Detail Sidebar */}
        <AnimatePresence>
          {selectedTransaction && (
            <TransactionDetail
              transaction={selectedTransaction}
              onClose={handleCloseDetail}
              onFetchExplanation={fetchExplanation}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
