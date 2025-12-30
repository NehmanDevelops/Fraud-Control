/**
 * Badge Component
 * Status indicators and labels with semantic coloring
 * Used for transaction status, risk levels, and notifications
 */

import React from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface BadgeProps {
  variant: 'fraud' | 'safe' | 'warning' | 'info' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  pulse?: boolean;
  children: React.ReactNode;
  className?: string;
}

const variantStyles = {
  fraud: {
    base: 'bg-red-500/15 text-red-400 border-red-500/30',
    icon: ShieldAlert,
  },
  safe: {
    base: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    icon: ShieldCheck,
  },
  warning: {
    base: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    icon: AlertTriangle,
  },
  info: {
    base: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    icon: Info,
  },
  neutral: {
    base: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    icon: CheckCircle,
  },
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-2.5 py-1 text-xs gap-1.5',
  lg: 'px-3 py-1.5 text-sm gap-2',
};

const iconSizes = {
  sm: 10,
  md: 12,
  lg: 14,
};

export function Badge({
  variant,
  size = 'md',
  showIcon = true,
  pulse = false,
  children,
  className,
}: BadgeProps) {
  const Icon = variantStyles[variant].icon;

  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold rounded-full border transition-colors',
        variantStyles[variant].base,
        sizeStyles[size],
        className
      )}
    >
      {showIcon && (
        <Icon size={iconSizes[size]} className={cn(pulse && 'animate-pulse')} />
      )}
      {children}
    </span>
  );
}

/**
 * Status Dot - Minimal status indicator
 */
interface StatusDotProps {
  status: 'online' | 'offline' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  label?: string;
  className?: string;
}

const statusColors = {
  online: 'bg-emerald-500',
  offline: 'bg-slate-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
};

const dotSizes = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
};

export function StatusDot({
  status,
  size = 'md',
  pulse = false,
  label,
  className,
}: StatusDotProps) {
  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <span className="relative flex">
        <span
          className={cn(
            'rounded-full',
            statusColors[status],
            dotSizes[size],
            pulse && 'animate-ping absolute inline-flex h-full w-full opacity-75'
          )}
        />
        <span
          className={cn(
            'relative rounded-full',
            statusColors[status],
            dotSizes[size]
          )}
        />
      </span>
      {label && (
        <span className="text-sm text-slate-400">{label}</span>
      )}
    </div>
  );
}

/**
 * Risk Level Indicator
 */
interface RiskIndicatorProps {
  score: number;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function RiskIndicator({
  score,
  showPercentage = true,
  size = 'md',
  className,
}: RiskIndicatorProps) {
  const percentage = Math.round(score * 100);
  
  let color = 'emerald';
  let label = 'Low';
  
  if (score >= 0.7) {
    color = 'red';
    label = 'High';
  } else if (score >= 0.4) {
    color = 'amber';
    label = 'Medium';
  }

  const barHeights = { sm: 'h-1', md: 'h-1.5', lg: 'h-2' };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className={cn('flex-1 rounded-full bg-slate-800 overflow-hidden', barHeights[size])}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            color === 'red' && 'bg-gradient-to-r from-red-500 to-red-600',
            color === 'amber' && 'bg-gradient-to-r from-amber-500 to-orange-500',
            color === 'emerald' && 'bg-gradient-to-r from-emerald-500 to-green-500'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showPercentage && (
        <span className={cn(
          'text-sm font-semibold tabular-nums',
          color === 'red' && 'text-red-400',
          color === 'amber' && 'text-amber-400',
          color === 'emerald' && 'text-emerald-400'
        )}>
          {percentage}%
        </span>
      )}
    </div>
  );
}
