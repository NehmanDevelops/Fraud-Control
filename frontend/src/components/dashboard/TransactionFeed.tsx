/**
 * TransactionFeed Component
 * Real-time transaction list with professional banking UI styling
 * Inspired by Wise/Revolut transaction feeds
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
  Search,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Card, Badge, RiskIndicator, SearchInput, Slider } from '../ui';
import { cn, formatCurrency, formatTime, formatRelativeTime, truncateId } from '../../lib/utils';
import type { Transaction } from '../../types';

interface TransactionFeedProps {
  transactions: Transaction[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelectTransaction: (transaction: Transaction) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  selectedTransactionId?: string;
  className?: string;
}

export function TransactionFeed({
  transactions,
  searchQuery,
  onSearchChange,
  onSelectTransaction,
  speed,
  onSpeedChange,
  selectedTransactionId,
  className,
}: TransactionFeedProps) {
  return (
    <Card variant="glass" padding="none" className={cn('flex flex-col overflow-hidden', className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800/80">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">Transaction Feed</h2>
            <p className="text-sm text-slate-500">
              {transactions.length} transactions • Click for details
            </p>
          </div>
          <LiveIndicator active={transactions.length > 0} />
        </div>
        
        <SearchInput
          placeholder="Search by ID or amount..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onClear={() => onSearchChange('')}
        />

        <div className="mt-3">
          <Slider
            label={`Stream Speed (${speed.toFixed(1)}s interval)`}
            value={speed}
            min={0.2}
            max={3}
            step={0.1}
            onChange={onSpeedChange}
          />
        </div>
      </div>

      {/* Transaction List */}
      <div className="flex-1 overflow-y-auto max-h-[70vh] sm:max-h-none scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
        {transactions.length === 0 ? (
          <EmptyState />
        ) : (
          <AnimatePresence initial={false}>
            {transactions.map((tx, index) => (
              <TransactionRow
                key={tx.id}
                transaction={tx}
                index={index}
                isSelected={tx.id === selectedTransactionId}
                onClick={() => onSelectTransaction(tx)}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </Card>
  );
}

/**
 * Transaction Row Component
 */
interface TransactionRowProps {
  transaction: Transaction;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}

function TransactionRow({ transaction, index, isSelected, onClick }: TransactionRowProps) {
  const { id, timestamp, amount, risk_score, risk_level, is_fraud, xgboost_score, isolation_forest_score } = transaction;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
      onClick={onClick}
      className={cn(
        'group flex items-center gap-4 px-6 py-4 cursor-pointer transition-all duration-200',
        'border-b border-slate-800/50 hover:bg-slate-800/30',
        isSelected && 'bg-blue-500/10 border-l-2 border-l-blue-500',
        is_fraud && !isSelected && 'bg-red-500/5'
      )}
    >
      {/* Status Icon */}
      <div
        className={cn(
          'flex-shrink-0 p-2.5 rounded-xl transition-colors',
          is_fraud
            ? 'bg-red-500/15 text-red-500'
            : risk_level === 'high'
            ? 'bg-amber-500/15 text-amber-500'
            : 'bg-emerald-500/15 text-emerald-500'
        )}
      >
        {is_fraud ? (
          <ShieldAlert size={20} />
        ) : risk_level === 'high' ? (
          <AlertTriangle size={20} />
        ) : (
          <ShieldCheck size={20} />
        )}
      </div>

      {/* Transaction Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-sm text-slate-300 truncate">
            {truncateId(id)}
          </span>
          {is_fraud && (
            <Badge variant="fraud" size="sm">
              FRAUD
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>{formatTime(timestamp)}</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            XGB: {Math.round(xgboost_score * 100)}%
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            IF: {Math.round(isolation_forest_score * 100)}%
          </span>
        </div>
      </div>

      {/* Amount */}
      <div className="flex-shrink-0 text-right">
        <div className="flex items-center gap-1 justify-end">
          <ArrowDownRight size={14} className="text-slate-500" />
          <span className="text-base font-bold text-white">
            {formatCurrency(Math.abs(amount))}
          </span>
        </div>
      </div>

      {/* Risk Score */}
      <div className="flex-shrink-0 w-32">
        <RiskIndicator score={risk_score} size="sm" />
      </div>

      {/* Arrow */}
      <ChevronRight
        size={18}
        className="flex-shrink-0 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-1 transition-all"
      />
    </motion.div>
  );
}

/**
 * Live Indicator
 */
function LiveIndicator({ active }: { active: boolean }) {
  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium',
      active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-500'
    )}>
      <span className={cn(
        'w-2 h-2 rounded-full',
        active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'
      )} />
      {active ? 'Live' : 'Idle'}
    </div>
  );
}

/**
 * Empty State
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center p-8">
      <div className="p-4 rounded-2xl bg-slate-800/50 mb-4">
        <Search size={32} className="text-slate-600" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">No Transactions Yet</h3>
      <p className="text-sm text-slate-500 max-w-xs">
        Click <strong>Start</strong> to begin the simulation or <strong>Load Demo</strong> for sample data
      </p>
    </div>
  );
}
