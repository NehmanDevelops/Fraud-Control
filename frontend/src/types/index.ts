/**
 * Type definitions for the FraudGuard Simulator
 * Centralized type declarations for type safety across the application
 */

/**
 * Transaction data structure from the backend API
 */
export interface Transaction {
  id: string;
  timestamp: string;
  amount: number;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high';
  is_fraud: boolean;
  ground_truth: boolean;
  xgboost_score: number;
  isolation_forest_score: number;
  rule_based_score: number;
  features: number[];
  feature_count: number;
  stats: {
    total_processed: number;
    total_fraud: number;
  };
}

/**
 * Application statistics from the backend
 */
export interface AppStats {
  is_running: boolean;
  speed: number;
  fraud_rate: number;
  transactions_processed: number;
  fraud_count: number;
  models_ready: boolean;
  dataset_stats: DatasetStats | null;
}

/**
 * Dataset statistics
 */
export interface DatasetStats {
  total_transactions: number;
  fraud_count: number;
  legitimate_count: number;
  fraud_percentage: number;
  feature_count: number;
  features: string[];
}

/**
 * SHAP explanation feature contribution
 */
export interface ShapFeature {
  feature: string;
  value: number;
  contribution: number;
  direction: 'positive' | 'negative';
}

/**
 * SHAP explanation response
 */
export interface ShapExplanation {
  transaction_id: string;
  prediction: number;
  base_value: number;
  top_features: ShapFeature[];
}

/**
 * Simulator configuration options
 */
export interface SimulatorConfig {
  speed: number;
  fraud_rate: number;
  inject_fraud: boolean;
  use_demo_mode: boolean;
}

/**
 * Filter state for transaction feed
 */
export interface FilterState {
  searchQuery: string;
  riskLevel: 'all' | 'low' | 'medium' | 'high';
  fraudOnly: boolean;
  minAmount: number;
  maxAmount: number;
}

/**
 * Chart data point for risk timeline
 */
export interface TimelineDataPoint {
  name: string;
  time: string;
  risk: number;
  isFraud: boolean;
}

/**
 * Chart data point for distribution charts
 */
export interface DistributionDataPoint {
  name: string;
  value: number;
  color: string;
}

/**
 * Model performance metrics
 */
export interface ModelMetrics {
  name: string;
  recall: number;
  precision: number;
  f1Score: number;
  rocAuc: number;
}

/**
 * UI Theme type
 */
export type Theme = 'dark' | 'light';

/**
 * Notification type
 */
export interface Notification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: Date;
}

/**
 * Component size variants
 */
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Status indicator states
 */
export type Status = 'idle' | 'running' | 'loading' | 'error' | 'success';
