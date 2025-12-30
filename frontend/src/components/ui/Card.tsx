/**
 * Card Component
 * Versatile container component with various styles
 * Provides consistent spacing and visual hierarchy
 */

import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'elevated' | 'outline' | 'gradient';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const variantStyles = {
  default: 'bg-slate-900/80 border border-slate-800/80',
  glass: 'bg-slate-900/40 backdrop-blur-xl border border-slate-700/50',
  elevated: 'bg-slate-900 border border-slate-800 shadow-xl shadow-black/20',
  outline: 'bg-transparent border-2 border-slate-700',
  gradient: 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-slate-700/50',
};

export function Card({
  children,
  className,
  variant = 'default',
  padding = 'md',
  hover = false,
  onClick,
}: CardProps) {
  const isInteractive = !!onClick || hover;

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl transition-all duration-300',
        variantStyles[variant],
        paddingStyles[padding],
        isInteractive && 'cursor-pointer hover:border-slate-600 hover:shadow-lg hover:shadow-blue-500/5',
        onClick && 'active:scale-[0.99]',
        className
      )}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}

/**
 * Card Header
 */
interface CardHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function CardHeader({ title, subtitle, icon, action, className }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between mb-4', className)}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex-shrink-0 p-2 rounded-xl bg-slate-800/50">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-base font-semibold text-white">{title}</h3>
          {subtitle && (
            <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

/**
 * Stat Card - For displaying metrics
 */
interface StatCardProps {
  label: string;
  value: string | number;
  change?: { value: number; isPositive: boolean };
  icon?: React.ReactNode;
  iconBg?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  change,
  icon,
  iconBg = 'bg-blue-500/10',
  className,
}: StatCardProps) {
  return (
    <Card variant="glass" padding="md" className={className}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-400 mb-1">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {change && (
            <div className={cn(
              'flex items-center gap-1 mt-2 text-sm font-medium',
              change.isPositive ? 'text-emerald-400' : 'text-red-400'
            )}>
              <span>{change.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(change.value)}%</span>
              <span className="text-slate-500 font-normal">vs last period</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={cn('p-3 rounded-xl', iconBg)}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Feature Card - For highlighting features/capabilities
 */
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  iconBg?: string;
  className?: string;
}

export function FeatureCard({
  icon,
  title,
  description,
  iconBg = 'bg-blue-500/10',
  className,
}: FeatureCardProps) {
  return (
    <Card variant="glass" padding="md" className={className}>
      <div className={cn('inline-flex p-3 rounded-xl mb-4', iconBg)}>
        {icon}
      </div>
      <h4 className="text-lg font-semibold text-white mb-2">{title}</h4>
      <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
    </Card>
  );
}
