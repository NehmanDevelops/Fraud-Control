/**
 * Custom hook for managing the fraud detection simulator
 * Handles WebSocket connections, API calls, and state management
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import type { Transaction, AppStats, ShapExplanation, SimulatorConfig } from '../types';

// API configuration - use environment variables with fallback to localhost for development
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/stream';

// Demo mode flag - enabled in production without backend URL, or can be forced via env var
const FORCE_DEMO = import.meta.env.VITE_FORCE_DEMO === 'true';

interface UseSimulatorReturn {
  // State
  transactions: Transaction[];
  stats: AppStats;
  isRunning: boolean;
  loading: boolean;
  error: string | null;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  isDemoMode: boolean;
  
  // Actions
  startSimulation: () => Promise<void>;
  stopSimulation: () => Promise<void>;
  toggleSimulation: () => Promise<void>;
  updateSpeed: (speed: number) => Promise<void>;
  injectFraud: () => Promise<void>;
  loadDemoData: () => Promise<void>;
  clearTransactions: () => void;
  showFraudOnly: () => void;
  resetSimulator: () => Promise<void>;
  fetchExplanation: (features: number[]) => Promise<ShapExplanation | null>;
}

const defaultStats: AppStats = {
  is_running: false,
  speed: 3.0,
  fraud_rate: 0.01,
  transactions_processed: 0,
  fraud_count: 0,
  models_ready: true,
  dataset_stats: null,
};

// Generate a demo transaction for offline mode
function generateDemoTransaction(id: number, forceFraud = false): Transaction {
  const isFraud = forceFraud || Math.random() < 0.02;
  const riskScore = isFraud ? 0.7 + Math.random() * 0.3 : Math.random() * 0.4;
  const amount = isFraud ? 500 + Math.random() * 4500 : 10 + Math.random() * 500;
  
  return {
    id: `DEMO-${id}-${Date.now()}`,
    timestamp: new Date().toISOString(),
    amount: Math.round(amount * 100) / 100,
    risk_score: Math.round(riskScore * 1000) / 1000,
    risk_level: riskScore > 0.7 ? 'high' : riskScore > 0.4 ? 'medium' : 'low',
    is_fraud: isFraud,
    ground_truth: isFraud,
    xgboost_score: riskScore * (0.7 + Math.random() * 0.3),
    isolation_forest_score: riskScore * (0.5 + Math.random() * 0.5),
    rule_based_score: riskScore * (0.3 + Math.random() * 0.4),
    features: Array.from({ length: 30 }, () => Math.random() * 2 - 1),
    feature_count: 30,
    stats: { total_processed: id, total_fraud: Math.floor(id * 0.02) },
  };
}

export function useSimulator(): UseSimulatorReturn {
  // Core state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<AppStats>(defaultStats);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  
  // Dynamic demo mode - activated when backend is unavailable
  const [isDemoMode, setIsDemoMode] = useState(FORCE_DEMO || (import.meta.env.PROD && !import.meta.env.VITE_API_URL));

  // Demo mode interval ref
  const demoInterval = useRef<ReturnType<typeof setInterval>>();
  const transactionCounter = useRef(0);
  const speedRef = useRef(defaultStats.speed);
  
  // Keep speedRef in sync with stats.speed
  speedRef.current = stats.speed;

  // WebSocket refs
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  /**
   * Start demo mode simulation (generates fake transactions locally)
   */
  const startDemoMode = useCallback(() => {
    if (demoInterval.current) return;
    
    setConnectionStatus('connected');
    setIsRunning(true);
    
    // Use speedRef to get current speed value without dependency issues
    const intervalMs = Math.max(100, 1000 / speedRef.current);
    
    demoInterval.current = setInterval(() => {
      transactionCounter.current++;
      const tx = generateDemoTransaction(transactionCounter.current);
      setTransactions(prev => [tx, ...prev].slice(0, 200));
      setStats(prev => ({
        ...prev,
        is_running: true,
        transactions_processed: transactionCounter.current,
        fraud_count: tx.is_fraud ? prev.fraud_count + 1 : prev.fraud_count,
      }));
    }, intervalMs);
  }, []);

  /**
   * Stop demo mode simulation
   */
  const stopDemoMode = useCallback(() => {
    if (demoInterval.current) {
      clearInterval(demoInterval.current);
      demoInterval.current = undefined;
    }
    setIsRunning(false);
  }, []);

  /**
   * Fetch current simulator status from API
   */
  const fetchStatus = useCallback(async () => {
    // In demo mode, skip API calls
    if (isDemoMode) {
      setStats(prev => ({ ...prev, models_ready: true }));
      setLoading(false);
      setError(null);
      return;
    }
    
    try {
      const response = await axios.get(`${API_BASE}/status`);
      setStats(response.data);
      // sync running state with backend
      setIsRunning(response.data.is_running);
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('Status fetch error:', err);
      // Backend unavailable - switch to demo mode automatically
      console.log('Backend unavailable, switching to demo mode');
      setIsDemoMode(true);
      setStats(prev => ({ ...prev, models_ready: true }));
      setLoading(false);
      setError(null);
    }
  }, [isDemoMode]);

  /**
   * Connect to WebSocket for real-time transaction streaming
   */
  const connectWebSocket = useCallback(() => {
    // In demo mode, use local simulation instead
    if (isDemoMode) {
      setConnectionStatus('connected');
      return;
    }
    
    if (ws.current?.readyState === WebSocket.OPEN) return;

    try {
      setConnectionStatus('connecting');
      ws.current = new WebSocket(WS_BASE);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;
      };

      ws.current.onmessage = (event) => {
        try {
          const transaction: Transaction = JSON.parse(event.data);
          setTransactions(prev => [transaction, ...prev].slice(0, 200));
        } catch (err) {
          console.error('Failed to parse transaction:', err);
        }
      };

      ws.current.onerror = (event) => {
        console.error('WebSocket error:', event);
        setConnectionStatus('disconnected');
      };

      ws.current.onclose = () => {
        console.log('WebSocket disconnected');
        setConnectionStatus('disconnected');
        ws.current = null;

        // Attempt reconnection if still running
        if (isRunning && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
          reconnectAttempts.current++;
          reconnectTimeout.current = setTimeout(connectWebSocket, delay);
        }
      };
    } catch (err) {
      console.error('WebSocket connection error:', err);
      setConnectionStatus('disconnected');
    }
  }, [isRunning]);

  /**
   * Disconnect WebSocket
   */
  const disconnectWebSocket = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    setConnectionStatus('disconnected');
  }, []);

  /**
   * Start the fraud simulation
   */
  const startSimulation = useCallback(async () => {
    // Demo mode: use local simulation
    if (isDemoMode) {
      startDemoMode();
      return;
    }
    
    try {
      await axios.post(`${API_BASE}/control/start`);
      setIsRunning(true);
      connectWebSocket();
    } catch (err) {
      console.error('Failed to start simulation:', err);
      setError('Failed to start simulation');
    }
  }, [connectWebSocket, startDemoMode, isDemoMode]);

  /**
   * Stop the fraud simulation
   */
  const stopSimulation = useCallback(async () => {
    // Demo mode: stop local simulation
    if (isDemoMode) {
      stopDemoMode();
      return;
    }
    
    try {
      await axios.post(`${API_BASE}/control/stop`);
      setIsRunning(false);
      disconnectWebSocket();
    } catch (err) {
      console.error('Failed to stop simulation:', err);
      setError('Failed to stop simulation');
    }
  }, [disconnectWebSocket, stopDemoMode, isDemoMode]);

  /**
   * Toggle simulation state
   */
  const toggleSimulation = useCallback(async () => {
    if (isRunning) {
      await stopSimulation();
    } else {
      await startSimulation();
    }
  }, [isRunning, startSimulation, stopSimulation]);

  /**
   * Update transaction streaming speed
   */
  const updateSpeed = useCallback(async (speed: number) => {
    // Demo mode: just update local state
    if (isDemoMode) {
      setStats(prev => ({ ...prev, speed }));
      // Restart demo interval with new speed if running
      if (isRunning && demoInterval.current) {
        stopDemoMode();
        setTimeout(() => startDemoMode(), 50);
      }
      return;
    }
    
    try {
      const config: SimulatorConfig = {
        speed,
        fraud_rate: stats.fraud_rate,
        inject_fraud: false,
        use_demo_mode: false,
      };
      await axios.post(`${API_BASE}/control/config`, config);
      setStats(prev => ({ ...prev, speed }));
    } catch (err) {
      console.error('Failed to update speed:', err);
    }
  }, [stats.fraud_rate, isRunning, startDemoMode, stopDemoMode, isDemoMode]);

  /**
   * Inject a fraudulent transaction - stops simulation and shows fraud at TOP
   */
  const injectFraud = useCallback(async () => {
    // Demo mode: generate a fraud transaction locally
    if (isDemoMode) {
      stopDemoMode();
      transactionCounter.current++;
      const fraudTx = generateDemoTransaction(transactionCounter.current, true);
      setTransactions(prev => [fraudTx, ...prev].slice(0, 200));
      setStats(prev => ({
        ...prev,
        transactions_processed: transactionCounter.current,
        fraud_count: prev.fraud_count + 1,
      }));
      return;
    }
    
    try {
      // FIRST: Stop the stream immediately so no more transactions come in
      setIsRunning(false);
      disconnectWebSocket();
      
      // Call the dedicated inject-fraud endpoint that returns the transaction
      const response = await axios.post(`${API_BASE}/inject-fraud`);
      const fraudTransaction: Transaction = response.data;
      
      // Add the fraud transaction at the TOP of the feed (it will be first)
      setTransactions(prev => [fraudTransaction, ...prev].slice(0, 200));
      
      // Update local stats
      setStats(prev => ({
        ...prev,
        transactions_processed: fraudTransaction.stats?.total_processed || prev.transactions_processed + 1,
        fraud_count: fraudTransaction.stats?.total_fraud || prev.fraud_count + 1,
      }));
    } catch (err) {
      console.error('Failed to inject fraud:', err);
      setError('Failed to inject fraud');
    }
  }, [disconnectWebSocket, isDemoMode, stopDemoMode]);

  /**
   * Filter current feed to fraud-only (used when toggling Show Fraud Only)
   * Only shows transactions that are actually flagged as fraud (is_fraud === true)
   * Also stops the stream so filtered view stays visible
   */
  const showFraudOnly = useCallback(() => {
    // Stop streaming first so new transactions don't come in
    setIsRunning(false);
    if (isDemoMode) {
      stopDemoMode();
    } else {
      disconnectWebSocket();
    }
    
    // Filter to only fraud transactions
    setTransactions((prev) => {
      const fraudOnly = prev.filter((tx) => tx.is_fraud === true);
      console.log(`Filtering to fraud only: ${fraudOnly.length} fraud out of ${prev.length} total`);
      return fraudOnly;
    });
  }, [disconnectWebSocket, stopDemoMode, isDemoMode]);

  /**
   * Load demo data for showcase
   */
  const loadDemoData = useCallback(async () => {
    // Demo mode: generate demo data locally
    if (isDemoMode) {
      const demoTransactions: Transaction[] = Array.from({ length: 100 }, (_, i) => 
        generateDemoTransaction(i + 1, i % 50 === 0) // ~2% fraud rate
      );
      setTransactions(demoTransactions);
      transactionCounter.current = 100;
      setStats(prev => ({
        ...prev,
        transactions_processed: 100,
        fraud_count: demoTransactions.filter(t => t.is_fraud).length,
      }));
      return;
    }
    
    try {
      const response = await axios.get(`${API_BASE}/demo-data?limit=100`);
      if (Array.isArray(response.data)) {
        // Transform demo data to match Transaction interface
        const demoTransactions: Transaction[] = response.data.map((item: any, index: number) => ({
          id: item.id || `DEMO-${index}`,
          timestamp: item.timestamp || new Date().toISOString(),
          amount: Math.abs(item.amount || item.features?.[0] || Math.random() * 1000),
          risk_score: item.risk_score || 0,
          risk_level: item.risk_score > 0.7 ? 'high' : item.risk_score > 0.4 ? 'medium' : 'low',
          is_fraud: item.is_fraud || false,
          ground_truth: item.is_fraud || false,
          xgboost_score: item.risk_score * 0.8 || 0,
          isolation_forest_score: item.risk_score * 0.6 || 0,
          rule_based_score: item.risk_score * 0.4 || 0,
          features: item.features || [],
          feature_count: item.features?.length || 30,
          stats: {
            total_processed: 100,
            total_fraud: Math.floor(response.data.filter((t: any) => t.is_fraud).length),
          },
        }));
        setTransactions(demoTransactions);
      }
    } catch (err) {
      console.error('Failed to load demo data:', err);
      setError('Failed to load demo data');
    }
  }, [isDemoMode]);

  /**
   * Clear all transactions
   */
  const clearTransactions = useCallback(() => {
    setTransactions([]);
  }, []);

  /**
   * Reset simulator - clear transactions and reset backend counters
   */
  const resetSimulator = useCallback(async () => {
    // Demo mode: reset locally
    if (isDemoMode) {
      stopDemoMode();
      setTransactions([]);
      transactionCounter.current = 0;
      setStats(prev => ({ ...prev, transactions_processed: 0, fraud_count: 0, is_running: false }));
      return;
    }
    
    try {
      await axios.post(`${API_BASE}/control/reset`);
      setTransactions([]);
      setIsRunning(false);
      setStats(prev => ({ ...prev, transactions_processed: 0, fraud_count: 0, is_running: false }));
      disconnectWebSocket();
    } catch (err) {
      console.error('Failed to reset simulator:', err);
      setError('Failed to reset simulator');
    }
  }, [disconnectWebSocket, stopDemoMode, isDemoMode]);

  /**
   * Fetch SHAP explanation for a transaction
   */
  const fetchExplanation = useCallback(async (features: number[]): Promise<ShapExplanation | null> => {
    // Demo mode: return mock SHAP explanation
    if (isDemoMode) {
      const topFeatures = ['V1', 'V2', 'V3', 'V4', 'V5'].map((name, i) => ({
        feature: name,
        value: features[i] || Math.random() * 2 - 1,
        contribution: (Math.random() - 0.5) * 0.2,
        direction: (Math.random() > 0.5 ? 'positive' : 'negative') as 'positive' | 'negative',
      }));
      return {
        transaction_id: `DEMO-${Date.now()}`,
        prediction: features.reduce((a, b) => a + b, 0) > 0 ? 0.7 : 0.3,
        base_value: 0.5,
        top_features: topFeatures,
      };
    }
    
    try {
      const response = await axios.post(`${API_BASE}/explain`, features);
      return response.data;
    } catch (err) {
      console.error('Failed to fetch explanation:', err);
      return null;
    }
  }, [isDemoMode]);

  // Initial status fetch and WebSocket connection
  useEffect(() => {
    fetchStatus();
    // always try to connect websocket on mount (or set demo mode connected)
    connectWebSocket();
    
    // Only poll for status if not in demo mode
    if (!isDemoMode) {
      const interval = setInterval(fetchStatus, 5000);
      return () => {
        clearInterval(interval);
        disconnectWebSocket();
      };
    }
    
    return () => {
      stopDemoMode();
    };
  }, [fetchStatus, disconnectWebSocket, connectWebSocket, stopDemoMode, isDemoMode]);

  // Reconnect WebSocket if disconnected while running (skip in demo mode)
  useEffect(() => {
    if (!isDemoMode && isRunning && connectionStatus === 'disconnected') {
      connectWebSocket();
    }
  }, [isRunning, connectionStatus, connectWebSocket, isDemoMode]);

  return {
    transactions,
    stats,
    isRunning,
    loading,
    error,
    connectionStatus,
    isDemoMode,
    startSimulation,
    stopSimulation,
    toggleSimulation,
    updateSpeed,
    injectFraud,
    loadDemoData,
    clearTransactions,
    showFraudOnly,
    resetSimulator,
    fetchExplanation,
  };
}
