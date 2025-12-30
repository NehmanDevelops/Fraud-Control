/**
 * TransactionDetail Component
 * Detailed view of a selected transaction with SHAP explanations
 * Professional design with clear visual hierarchy
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Brain,
  Activity,
  Clock,
  DollarSign,
  BarChart3,
  Lightbulb,
  ArrowRight,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Card, CardHeader, Button, IconButton, Badge, RiskIndicator } from '../ui';
import { cn, formatCurrency, formatTime, formatPercentage } from '../../lib/utils';
import type { Transaction, ShapExplanation } from '../../types';

interface TransactionDetailProps {
  transaction: Transaction | null;
  onClose: () => void;
  onFetchExplanation: (features: number[]) => Promise<ShapExplanation | null>;
  className?: string;
}

export function TransactionDetail({
  transaction,
  onClose,
  onFetchExplanation,
  className,
}: TransactionDetailProps) {
  const [explanation, setExplanation] = useState<ShapExplanation | null>(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);

  // Fetch SHAP explanation when transaction changes
  useEffect(() => {
    if (transaction?.features && transaction.features.length > 0) {
      setLoadingExplanation(true);
      onFetchExplanation(transaction.features)
        .then(setExplanation)
        .finally(() => setLoadingExplanation(false));
    } else {
      setExplanation(null);
    }
  }, [transaction?.id]);

  if (!transaction) return null;

  const {
    id,
    timestamp,
    amount,
    risk_score,
    risk_level,
    is_fraud,
    xgboost_score,
    isolation_forest_score,
    rule_based_score,
  } = transaction;

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className={cn(
          'w-[420px] border-l border-slate-800/80 bg-slate-950/95 backdrop-blur-xl',
          'flex flex-col overflow-hidden',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-800/80">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">Transaction Details</h2>
            <p className="text-xs font-mono text-slate-500">{id}</p>
          </div>
          <IconButton
            variant="ghost"
            size="sm"
            ariaLabel="Close panel"
            onClick={onClose}
          >
            <X size={20} />
          </IconButton>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status Banner */}
          <StatusBanner isFraud={is_fraud} riskLevel={risk_level} riskScore={risk_score} />

          {/* Key Metrics */}
          <Card variant="glass" padding="md">
            <div className="grid grid-cols-2 gap-4">
              <MetricItem
                icon={<DollarSign size={16} className="text-blue-400" />}
                label="Amount"
                value={formatCurrency(Math.abs(amount))}
              />
              <MetricItem
                icon={<Clock size={16} className="text-slate-400" />}
                label="Time"
                value={formatTime(timestamp)}
              />
              <MetricItem
                icon={<Activity size={16} className="text-emerald-400" />}
                label="Risk Score"
                value={formatPercentage(risk_score)}
                highlight
              />
              <MetricItem
                icon={<BarChart3 size={16} className="text-amber-400" />}
                label="Risk Level"
                value={risk_level.toUpperCase()}
              />
            </div>
          </Card>

          {/* Model Scores */}
          <section>
            <h3 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2">
              <Brain size={16} className="text-blue-400" />
              Model Ensemble Scores
            </h3>
            <Card variant="glass" padding="md" className="space-y-4">
              <ModelScoreBar
                name="XGBoost"
                score={xgboost_score}
                description="Gradient boosting classifier"
                color="blue"
              />
              <ModelScoreBar
                name="Isolation Forest"
                score={isolation_forest_score}
                description="Anomaly detection"
                color="purple"
              />
              <ModelScoreBar
                name="Rule-Based"
                score={rule_based_score}
                description="Heuristic flagging"
                color="amber"
              />
            </Card>
          </section>

          {/* SHAP Explanation */}
          <section>
            <h3 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2">
              <Lightbulb size={16} className="text-amber-400" />
              Why This Decision? (SHAP)
            </h3>
            
            {loadingExplanation ? (
              <Card variant="glass" padding="md">
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                  <span className="ml-3 text-sm text-slate-400">
                    Computing explanation...
                  </span>
                </div>
              </Card>
            ) : explanation?.top_features ? (
              <Card variant="glass" padding="md" className="space-y-3">
                {explanation.top_features.slice(0, 6).map((feature, index) => (
                  <ShapFeatureRow
                    key={feature.feature}
                    feature={feature.feature}
                    value={feature.value}
                    contribution={feature.contribution}
                    rank={index + 1}
                  />
                ))}
                
                <div className="pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Base prediction</span>
                    <span className="font-mono text-slate-300">
                      {formatPercentage(explanation.base_value)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-slate-500">Final prediction</span>
                    <span className={cn(
                      'font-mono font-bold',
                      explanation.prediction > 0.5 ? 'text-red-400' : 'text-emerald-400'
                    )}>
                      {formatPercentage(explanation.prediction)}
                    </span>
                  </div>
                </div>
              </Card>
            ) : (
              <Card variant="glass" padding="md">
                <p className="text-sm text-slate-500 text-center py-4">
                  SHAP explanation unavailable for this transaction
                </p>
              </Card>
            )}
          </section>

          {/* Explainable AI Note */}
          <Card
            variant="gradient"
            padding="md"
            className="border-blue-500/20 bg-blue-500/5"
          >
            <div className="flex gap-3">
              <div className="flex-shrink-0 p-2 rounded-lg bg-blue-500/10">
                <ShieldCheck size={20} className="text-blue-400" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-blue-400 mb-1">
                  Explainable AI
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Every prediction is backed by SHAP (SHapley Additive exPlanations),
                  providing transparent, auditable decision-making aligned with
                  responsible AI principles.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}

/**
 * Status Banner
 */
function StatusBanner({
  isFraud,
  riskLevel,
  riskScore,
}: {
  isFraud: boolean;
  riskLevel: string;
  riskScore: number;
}) {
  if (isFraud) {
    return (
      <Card
        variant="gradient"
        padding="md"
        className="border-red-500/30 bg-gradient-to-r from-red-500/10 to-red-600/5"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-red-500/15">
            <ShieldAlert size={24} className="text-red-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-red-400 text-lg">Fraud Detected</h3>
            <p className="text-sm text-slate-400 mt-1">
              High-confidence fraudulent activity identified
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-red-400">
              {Math.round(riskScore * 100)}%
            </div>
            <div className="text-xs text-slate-500">Risk Score</div>
          </div>
        </div>
      </Card>
    );
  }

  if (riskLevel === 'high') {
    return (
      <Card
        variant="gradient"
        padding="md"
        className="border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/5"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-500/15">
            <AlertTriangle size={24} className="text-amber-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-amber-400 text-lg">Suspicious Activity</h3>
            <p className="text-sm text-slate-400 mt-1">
              Elevated risk indicators warrant review
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-amber-400">
              {Math.round(riskScore * 100)}%
            </div>
            <div className="text-xs text-slate-500">Risk Score</div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      variant="gradient"
      padding="md"
      className="border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-green-500/5"
    >
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-emerald-500/15">
          <ShieldCheck size={24} className="text-emerald-500" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-emerald-400 text-lg">Legitimate</h3>
          <p className="text-sm text-slate-400 mt-1">
            Transaction aligns with expected patterns
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-emerald-400">
            {Math.round(riskScore * 100)}%
          </div>
          <div className="text-xs text-slate-500">Risk Score</div>
        </div>
      </div>
    </Card>
  );
}

/**
 * Metric Item
 */
function MetricItem({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-slate-800/50">{icon}</div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className={cn('font-semibold', highlight ? 'text-white text-lg' : 'text-slate-300')}>
          {value}
        </div>
      </div>
    </div>
  );
}

/**
 * Model Score Bar
 */
function ModelScoreBar({
  name,
  score,
  description,
  color,
}: {
  name: string;
  score: number;
  description: string;
  color: 'blue' | 'purple' | 'amber';
}) {
  const colors = {
    blue: { bar: 'from-blue-500 to-blue-600', text: 'text-blue-400' },
    purple: { bar: 'from-purple-500 to-purple-600', text: 'text-purple-400' },
    amber: { bar: 'from-amber-500 to-orange-500', text: 'text-amber-400' },
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-sm font-medium text-white">{name}</span>
          <span className="text-xs text-slate-500 ml-2">{description}</span>
        </div>
        <span className={cn('text-sm font-bold tabular-nums', colors[color].text)}>
          {formatPercentage(score)}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={cn('h-full rounded-full bg-gradient-to-r', colors[color].bar)}
        />
      </div>
    </div>
  );
}

/**
 * SHAP Feature Row
 */
function ShapFeatureRow({
  feature,
  value,
  contribution,
  rank,
}: {
  feature: string;
  value: number;
  contribution: number;
  rank: number;
}) {
  const isPositive = contribution > 0;
  const absContribution = Math.abs(contribution);
  const maxWidth = 60; // percentage

  return (
    <div className="flex items-center gap-3">
      <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-500 flex-shrink-0">
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-slate-300 truncate">{feature}</span>
          <span className="text-xs text-slate-500 font-mono flex-shrink-0 ml-2">
            {value.toFixed(3)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-px h-full bg-slate-700" />
            </div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(absContribution * 100, maxWidth)}%` }}
              transition={{ duration: 0.3 }}
              className={cn(
                'absolute top-0 h-full rounded-full',
                isPositive
                  ? 'right-1/2 bg-gradient-to-l from-red-500 to-red-600 origin-right'
                  : 'left-1/2 bg-gradient-to-r from-emerald-500 to-green-500 origin-left'
              )}
            />
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 w-16 justify-end">
            {isPositive ? (
              <TrendingUp size={12} className="text-red-400" />
            ) : (
              <TrendingDown size={12} className="text-emerald-400" />
            )}
            <span className={cn(
              'text-xs font-mono',
              isPositive ? 'text-red-400' : 'text-emerald-400'
            )}>
              {isPositive ? '+' : ''}{contribution.toFixed(3)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
