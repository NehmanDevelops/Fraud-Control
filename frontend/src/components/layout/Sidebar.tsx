/**
 * Sidebar Component
 * Control panel with simulator settings, filters, and performance metrics
 * Clean, spacious design inspired by professional dashboards
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Filter,
  Activity,
  Database,
  ShieldCheck,
  TrendingUp,
  Clock,
  Trash2,
} from 'lucide-react';
import { Card, CardHeader, Slider, Select, Toggle, Button, StatCard } from '../ui';
import { cn, formatNumber, formatPercentage } from '../../lib/utils';
import type { AppStats, FilterState } from '../../types';

interface SidebarProps {
  stats: AppStats;
  speed: number;
  filters: FilterState;
  onSpeedChange: (speed: number) => void;
  onFilterChange: (filters: Partial<FilterState>) => void;
  onFraudOnly: () => void;
  onClearTransactions: () => void;
  className?: string;
}

export function Sidebar({
  stats,
  speed,
  filters,
  onSpeedChange,
  onFilterChange,
  onFraudOnly,
  onClearTransactions,
  className,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        'w-80 border-r border-slate-800/80 bg-slate-950/50 flex flex-col overflow-hidden',
        className
      )}
    >
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Simulator Controls */}
        <section>
          <SectionHeader icon={<Settings size={16} />} title="Simulator Controls" />
          
          <Card variant="glass" padding="md" className="mt-4">
            <Slider
              label="Transaction Interval"
              value={speed}
              min={0.1}
              max={3}
              step={0.1}
              onChange={onSpeedChange}
              formatValue={(v) => `${v.toFixed(1)}s`}
            />
            
            <div className="mt-4 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Throughput</span>
                <span className="font-semibold text-white">
                  ~{Math.round(60 / speed)} tx/min
                </span>
              </div>
            </div>
          </Card>
        </section>

        {/* Filters */}
        <section>
          <SectionHeader icon={<Filter size={16} />} title="Filters" />
          
          <Card variant="glass" padding="md" className="mt-4 space-y-4">
            <Select
              label="Risk Level"
              value={filters.riskLevel}
              onChange={(e) => onFilterChange({ riskLevel: e.target.value as FilterState['riskLevel'] })}
              options={[
                { value: 'all', label: 'All Levels' },
                { value: 'high', label: '🔴 High Risk' },
                { value: 'medium', label: '🟡 Medium Risk' },
                { value: 'low', label: '🟢 Low Risk' },
              ]}
            />
            
            <Toggle
              label="Show Fraud Only"
              checked={filters.fraudOnly}
              onChange={(checked) => {
                onFilterChange({ fraudOnly: checked });
                if (checked) {
                  onFraudOnly();
                }
              }}
            />
            
            <div className="pt-4 border-t border-slate-800">
              <Slider
                label="Min Amount"
                value={filters.minAmount}
                min={0}
                max={5000}
                step={100}
                onChange={(v) => onFilterChange({ minAmount: v })}
                formatValue={(v) => `$${v}`}
              />
            </div>
            
            <Slider
              label="Max Amount"
              value={filters.maxAmount}
              min={0}
              max={10000}
              step={100}
              onChange={(v) => onFilterChange({ maxAmount: v })}
              formatValue={(v) => `$${v}`}
            />
            
            <Button
              variant="ghost"
              size="sm"
              fullWidth
              leftIcon={<Trash2 size={14} />}
              onClick={onClearTransactions}
              className="mt-2"
            >
              Clear Transactions
            </Button>
          </Card>
        </section>

        {/* Performance Metrics */}
        <section>
          <SectionHeader icon={<Activity size={16} />} title="Performance" />
          
          <div className="mt-4 space-y-3">
            <MetricRow
              label="Transactions"
              value={formatNumber(stats.transactions_processed)}
              icon={<TrendingUp size={14} className="text-blue-400" />}
            />
            <MetricRow
              label="Fraud Detected"
              value={formatNumber(stats.fraud_count)}
              icon={<ShieldCheck size={14} className="text-red-400" />}
              variant="danger"
            />
            <MetricRow
              label="Detection Rate"
              value={
                stats.transactions_processed > 0
                  ? formatPercentage(stats.fraud_count / stats.transactions_processed)
                  : '0%'
              }
              icon={<Activity size={14} className="text-emerald-400" />}
              variant="success"
            />
          </div>
        </section>

        {/* Dataset Info */}
        {stats.dataset_stats && (
          <section>
            <SectionHeader icon={<Database size={16} />} title="Dataset Info" />
            
            <Card
              variant="gradient"
              padding="md"
              className="mt-4 border-blue-500/20"
            >
              <div className="space-y-3 text-sm">
                <DataRow
                  label="Total Records"
                  value={formatNumber(stats.dataset_stats.total_transactions)}
                />
                <DataRow
                  label="Fraud Cases"
                  value={formatNumber(stats.dataset_stats.fraud_count)}
                />
                <DataRow
                  label="Fraud Rate"
                  value={`${stats.dataset_stats.fraud_percentage?.toFixed(3)}%`}
                />
                <DataRow
                  label="Features"
                  value={`${stats.dataset_stats.feature_count || 30} PCA`}
                />
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-800">
                <p className="text-xs text-slate-500 flex items-center gap-2">
                  <ShieldCheck size={12} className="text-blue-400" />
                  Kaggle Credit Card Dataset
                </p>
              </div>
            </Card>
          </section>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
          <span>FraudGuard v1.0</span>
          <span>•</span>
          <span>Powered by XGBoost + SHAP</span>
        </div>
      </div>
    </aside>
  );
}

/**
 * Section Header Component
 */
function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-blue-400">{icon}</span>
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
        {title}
      </h3>
    </div>
  );
}

/**
 * Metric Row Component
 */
interface MetricRowProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'danger';
}

function MetricRow({ label, value, icon, variant = 'default' }: MetricRowProps) {
  const valueColors = {
    default: 'text-white',
    success: 'text-emerald-400',
    danger: 'text-red-400',
  };

  return (
    <Card variant="glass" padding="sm" className="py-3 px-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm text-slate-400">{label}</span>
        </div>
        <span className={cn('text-lg font-bold tabular-nums', valueColors[variant])}>
          {value}
        </span>
      </div>
    </Card>
  );
}

/**
 * Data Row Component
 */
function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}
