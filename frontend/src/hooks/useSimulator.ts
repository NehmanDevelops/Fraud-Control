/**
 * Custom hook for managing the fraud detection simulator
 * Handles WebSocket connections, API calls, and state management
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import type { Transaction, AppStats, ShapExplanation, SimulatorConfig } from '../types';

// API configuration
const API_BASE = 'http://localhost:8000';
const WS_BASE = 'ws://localhost:8000/ws/stream';

interface UseSimulatorReturn {
  // State
  transactions: Transaction[];
  stats: AppStats;
  isRunning: boolean;
  loading: boolean;
  error: string | null;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  
  // Actions
  startSimulation: () => Promise<void>;
  stopSimulation: () => Promise<void>;
  toggleSimulation: () => Promise<void>;
  updateSpeed: (speed: number) => Promise<void>;
  injectFraud: () => Promise<void>;
  loadDemoData: () => Promise<void>;
  clearTransactions: () => void;
  fetchExplanation: (features: number[]) => Promise<ShapExplanation | null>;
}

const defaultStats: AppStats = {
  is_running: false,
  speed: 1,
  fraud_rate: 0.01,
  transactions_processed: 0,
  fraud_count: 0,
  models_ready: false,
  dataset_stats: null,
};

export function useSimulator(): UseSimulatorReturn {
  // Core state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<AppStats>(defaultStats);
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');

  // WebSocket refs
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  /**
   * Fetch current simulator status from API
   */
  const fetchStatus = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE}/status`);
      setStats(response.data);
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('Status fetch error:', err);
      setLoading(false);
      setError(err instanceof Error ? err.message : 'Failed to connect to backend');
    }
  }, []);

  /**
   * Connect to WebSocket for real-time transaction streaming
   */
  const connectWebSocket = useCallback(() => {
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
    try {
      await axios.post(`${API_BASE}/control/start`);
      setIsRunning(true);
      connectWebSocket();
    } catch (err) {
      console.error('Failed to start simulation:', err);
      setError('Failed to start simulation');
    }
  }, [connectWebSocket]);

  /**
   * Stop the fraud simulation
   */
  const stopSimulation = useCallback(async () => {
    try {
      await axios.post(`${API_BASE}/control/stop`);
      setIsRunning(false);
      disconnectWebSocket();
    } catch (err) {
      console.error('Failed to stop simulation:', err);
      setError('Failed to stop simulation');
    }
  }, [disconnectWebSocket]);

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
  }, [stats.fraud_rate]);

  /**
   * Inject a fraudulent transaction
   */
  const injectFraud = useCallback(async () => {
    try {
      const config: SimulatorConfig = {
        speed: stats.speed,
        fraud_rate: stats.fraud_rate,
        inject_fraud: true,
        use_demo_mode: false,
      };
      await axios.post(`${API_BASE}/control/config`, config);
    } catch (err) {
      console.error('Failed to inject fraud:', err);
      setError('Failed to inject fraud');
    }
  }, [stats.speed, stats.fraud_rate]);

  /**
   * Load demo data for showcase
   */
  const loadDemoData = useCallback(async () => {
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
  }, []);

  /**
   * Clear all transactions
   */
  const clearTransactions = useCallback(() => {
    setTransactions([]);
  }, []);

  /**
   * Fetch SHAP explanation for a transaction
   */
  const fetchExplanation = useCallback(async (features: number[]): Promise<ShapExplanation | null> => {
    try {
      const response = await axios.post(`${API_BASE}/explain`, features);
      return response.data;
    } catch (err) {
      console.error('Failed to fetch explanation:', err);
      return null;
    }
  }, []);

  // Initial status fetch and polling
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    
    return () => {
      clearInterval(interval);
      disconnectWebSocket();
    };
  }, [fetchStatus, disconnectWebSocket]);

  // Connect WebSocket when running state changes
  useEffect(() => {
    if (isRunning && connectionStatus === 'disconnected') {
      connectWebSocket();
    }
  }, [isRunning, connectionStatus, connectWebSocket]);

  return {
    transactions,
    stats,
    isRunning,
    loading,
    error,
    connectionStatus,
    startSimulation,
    stopSimulation,
    toggleSimulation,
    updateSpeed,
    injectFraud,
    loadDemoData,
    clearTransactions,
    fetchExplanation,
  };
}
