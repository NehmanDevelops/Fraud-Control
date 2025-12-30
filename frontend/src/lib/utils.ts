/**
 * Utility functions for the FraudGuard Simulator
 * Provides helper functions for class names, formatting, and common operations
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with proper precedence
 * Combines clsx for conditional classes and tailwind-merge for deduplication
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency values with proper localization
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format percentage values
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format large numbers with proper separators
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Format timestamp to readable time
 */
export function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Format timestamp to relative time (e.g., "2 minutes ago")
 */
export function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diff = now.getTime() - date.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

/**
 * Get risk level color class based on score
 */
export function getRiskColor(score: number): {
  bg: string;
  text: string;
  border: string;
  gradient: string;
} {
  if (score >= 0.7) {
    return {
      bg: 'bg-red-500/10',
      text: 'text-red-500',
      border: 'border-red-500/30',
      gradient: 'from-red-500 to-red-600',
    };
  }
  if (score >= 0.4) {
    return {
      bg: 'bg-amber-500/10',
      text: 'text-amber-500',
      border: 'border-amber-500/30',
      gradient: 'from-amber-500 to-orange-500',
    };
  }
  return {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-500',
    border: 'border-emerald-500/30',
    gradient: 'from-emerald-500 to-green-500',
  };
}

/**
 * Get status badge styling based on fraud status
 */
export function getStatusStyle(isFraud: boolean, riskLevel: string): {
  label: string;
  icon: 'alert' | 'warning' | 'safe';
  className: string;
} {
  if (isFraud) {
    return {
      label: 'Fraud Detected',
      icon: 'alert',
      className: 'bg-red-500/15 text-red-500 border-red-500/30',
    };
  }
  if (riskLevel === 'high') {
    return {
      label: 'Suspicious',
      icon: 'warning',
      className: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
    };
  }
  return {
    label: 'Legitimate',
    icon: 'safe',
    className: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
  };
}

/**
 * Truncate transaction ID for display
 */
export function truncateId(id: string, length = 12): string {
  if (id.length <= length) return id;
  return `${id.substring(0, length)}...`;
}

/**
 * Generate unique key for React lists
 */
export function generateKey(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Calculate statistics from transaction array
 */
export function calculateStats(transactions: Array<{ is_fraud: boolean; risk_score: number }>) {
  const total = transactions.length;
  const fraudCount = transactions.filter(t => t.is_fraud).length;
  const avgRiskScore = total > 0 
    ? transactions.reduce((sum, t) => sum + t.risk_score, 0) / total 
    : 0;
  
  return {
    total,
    fraudCount,
    legitimateCount: total - fraudCount,
    fraudRate: total > 0 ? fraudCount / total : 0,
    avgRiskScore,
  };
}
