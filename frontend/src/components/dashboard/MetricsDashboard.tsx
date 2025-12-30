/**
 * MetricsDashboard Component
 * Real-time charts and visualizations for fraud detection metrics
 * Professional styling inspired by Google Cloud Vertex AI and H2O.ai
 */

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Area,
  AreaChart,
} from 'recharts';
import {
  Activity,
  PieChart as PieChartIcon,
  BarChart3,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardHeader, StatCard } from '../ui';
import { cn, formatNumber, formatPercentage } from '../../lib/utils';
import type { Transaction, AppStats } from '../../types';

interface MetricsDashboardProps {
  transactions: Transaction[];
  stats: AppStats;
  className?: string;
}

// Chart colors
const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  purple: '#8b5cf6',
  slate: '#475569',
};

export function MetricsDashboard({
  transactions,
  stats,
  className,
}: MetricsDashboardProps) {
  // Calculate chart data
  const timelineData = useMemo(() => {
    return transactions.slice(0, 30).reverse().map((tx, i) => ({
      name: `T${i + 1}`,
      risk: Math.round(tx.risk_score * 100),
      xgb: Math.round(tx.xgboost_score * 100),
      iforest: Math.round(tx.isolation_forest_score * 100),
      isFraud: tx.is_fraud,
    }));
  }, [transactions]);

  const distributionData = useMemo(() => {
    const fraud = stats.fraud_count;
    const legit = stats.transactions_processed - fraud;
    return [
      { name: 'Legitimate', value: Math.max(legit, 0), color: COLORS.success },
      { name: 'Fraud', value: fraud, color: COLORS.danger },
    ];
  }, [stats]);

  const riskLevelData = useMemo(() => {
    const low = transactions.filter(t => t.risk_level === 'low').length;
    const medium = transactions.filter(t => t.risk_level === 'medium').length;
    const high = transactions.filter(t => t.risk_level === 'high').length;
    return [
      { name: 'Low', value: low, color: COLORS.success },
      { name: 'Medium', value: medium, color: COLORS.warning },
      { name: 'High', value: high, color: COLORS.danger },
    ];
  }, [transactions]);

  const modelComparisonData = useMemo(() => {
    if (transactions.length === 0) return [];
    
    const recent = transactions.slice(0, 20);
    const avgXgb = recent.reduce((s, t) => s + t.xgboost_score, 0) / recent.length;
    const avgIF = recent.reduce((s, t) => s + t.isolation_forest_score, 0) / recent.length;
    const avgRule = recent.reduce((s, t) => s + t.rule_based_score, 0) / recent.length;
    
    return [
      { name: 'XGBoost', score: Math.round(avgXgb * 100), color: COLORS.primary },
      { name: 'Isolation Forest', score: Math.round(avgIF * 100), color: COLORS.purple },
      { name: 'Rule-Based', score: Math.round(avgRule * 100), color: COLORS.warning },
    ];
  }, [transactions]);

  const detectionRate = stats.transactions_processed > 0
    ? (stats.fraud_count / stats.transactions_processed * 100).toFixed(2)
    : '0.00';

  return (
    <div className={cn('space-y-6', className)}>
      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Processed"
          value={formatNumber(stats.transactions_processed)}
          icon={<Activity size={20} className="text-blue-400" />}
          iconBg="bg-blue-500/10"
        />
        <StatCard
          label="Fraud Detected"
          value={formatNumber(stats.fraud_count)}
          icon={<ShieldAlert size={20} className="text-red-400" />}
          iconBg="bg-red-500/10"
        />
        <StatCard
          label="Detection Rate"
          value={`${detectionRate}%`}
          icon={<TrendingUp size={20} className="text-emerald-400" />}
          iconBg="bg-emerald-500/10"
        />
        <StatCard
          label="Models Active"
          value={stats.models_ready ? '3 / 3' : 'Loading...'}
          icon={<ShieldCheck size={20} className="text-purple-400" />}
          iconBg="bg-purple-500/10"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Timeline */}
        <Card variant="glass" padding="md" className="lg:col-span-2">
          <CardHeader
            title="Risk Score Timeline"
            subtitle="Real-time ensemble predictions"
            icon={<Activity size={18} className="text-blue-400" />}
          />
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="name"
                  stroke="#475569"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                />
                <YAxis
                  stroke="#475569"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                  }}
                  labelStyle={{ color: '#94a3b8' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Area
                  type="monotone"
                  dataKey="risk"
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  fill="url(#riskGradient)"
                  name="Risk %"
                />
                <Line
                  type="monotone"
                  dataKey="xgb"
                  stroke={COLORS.success}
                  strokeWidth={1.5}
                  dot={false}
                  strokeDasharray="5 5"
                  name="XGBoost %"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Fraud Distribution */}
        <Card variant="glass" padding="md">
          <CardHeader
            title="Classification"
            subtitle="Fraud vs Legitimate"
            icon={<PieChartIcon size={18} className="text-emerald-400" />}
          />
          <div className="h-64 mt-4 flex items-center justify-center">
            {stats.transactions_processed > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #1e293b',
                      borderRadius: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-500">
                <PieChartIcon size={48} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No data yet</p>
              </div>
            )}
          </div>
          {stats.transactions_processed > 0 && (
            <div className="flex justify-center gap-6 mt-2">
              <LegendItem color={COLORS.success} label="Legitimate" />
              <LegendItem color={COLORS.danger} label="Fraud" />
            </div>
          )}
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Level Distribution */}
        <Card variant="glass" padding="md">
          <CardHeader
            title="Risk Level Distribution"
            subtitle="Transactions by severity"
            icon={<BarChart3 size={18} className="text-amber-400" />}
          />
          <div className="h-56 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskLevelData} layout="vertical" barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" stroke="#475569" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={70}
                  stroke="#475569"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #1e293b',
                    borderRadius: '12px',
                  }}
                  cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {riskLevelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Model Performance Comparison */}
        <Card variant="glass" padding="md">
          <CardHeader
            title="Model Comparison"
            subtitle="Average scores (last 20 transactions)"
            icon={<TrendingUp size={18} className="text-purple-400" />}
          />
          <div className="h-56 mt-4">
            {modelComparisonData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modelComparisonData} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="name"
                    stroke="#475569"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                  />
                  <YAxis
                    stroke="#475569"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #1e293b',
                      borderRadius: '12px',
                    }}
                    cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                  />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]} name="Avg Score %">
                    {modelComparisonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <BarChart3 size={48} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Process transactions to see comparison</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

/**
 * Legend Item Component
 */
function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-sm text-slate-400">{label}</span>
    </div>
  );
}
