/**
 * OnboardingCard Component
 * Welcome card for first-time users with feature highlights
 * Designed to make the simulator immediately understandable
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  Shield,
  Zap,
  Brain,
  LineChart,
  ChevronRight,
  Sparkles,
  X,
} from 'lucide-react';
import { Card, Button, IconButton } from '../ui';
import { cn } from '../../lib/utils';

interface OnboardingCardProps {
  onStart: () => void;
  onLoadDemo: () => void;
  onDismiss: () => void;
  isVisible: boolean;
  className?: string;
}

export function OnboardingCard({
  onStart,
  onLoadDemo,
  onDismiss,
  isVisible,
  className,
}: OnboardingCardProps) {
  if (!isVisible) return null;

  const features = [
    {
      icon: <Brain size={20} className="text-blue-400" />,
      title: 'Ensemble ML Models',
      description: 'XGBoost + Isolation Forest + Rule-based detection',
    },
    {
      icon: <Sparkles size={20} className="text-amber-400" />,
      title: 'SHAP Explanations',
      description: 'Understand why each prediction was made',
    },
    {
      icon: <Zap size={20} className="text-emerald-400" />,
      title: 'Real-Time Streaming',
      description: 'WebSocket-powered live transaction feed',
    },
    {
      icon: <LineChart size={20} className="text-purple-400" />,
      title: 'Visual Analytics',
      description: 'Interactive charts and risk visualizations',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn('relative', className)}
    >
      <Card variant="gradient" padding="none" className="overflow-hidden border-blue-500/20">
        {/* Background Decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative p-8">
          {/* Close Button */}
          <IconButton
            variant="ghost"
            size="sm"
            ariaLabel="Dismiss onboarding"
            onClick={onDismiss}
            className="absolute top-4 right-4"
          >
            <X size={18} />
          </IconButton>

          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <motion.div
              className="p-4 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg shadow-blue-500/25"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Shield size={32} className="text-white" />
            </motion.div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                Welcome to FraudGuard
              </h2>
              <p className="text-slate-400 mt-1">
                Real-time, explainable banking fraud detection
              </p>
            </div>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="flex items-start gap-3 p-4 rounded-xl bg-slate-800/30 border border-slate-700/50"
              >
                <div className="flex-shrink-0 p-2 rounded-lg bg-slate-800/50">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Button
              variant="primary"
              size="lg"
              leftIcon={<Play size={18} />}
              onClick={onStart}
              className="flex-1"
            >
              Start Simulation
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={onLoadDemo}
              className="flex-1"
            >
              Load Demo Data
            </Button>
          </div>

          {/* Tech Stack Badge */}
          <div className="mt-6 pt-6 border-t border-slate-800">
            <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
              <span className="px-2 py-1 rounded-md bg-slate-800/50">React + TypeScript</span>
              <span className="px-2 py-1 rounded-md bg-slate-800/50">FastAPI</span>
              <span className="px-2 py-1 rounded-md bg-slate-800/50">XGBoost</span>
              <span className="px-2 py-1 rounded-md bg-slate-800/50">SHAP</span>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

/**
 * Compact Feature Highlight
 * For showing in empty states or tips
 */
interface FeatureHighlightProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function FeatureHighlight({
  icon,
  title,
  description,
  action,
}: FeatureHighlightProps) {
  return (
    <Card variant="glass" padding="md" className="flex items-start gap-4">
      <div className="flex-shrink-0 p-3 rounded-xl bg-blue-500/10">
        {icon}
      </div>
      <div className="flex-1">
        <h4 className="font-semibold text-white">{title}</h4>
        <p className="text-sm text-slate-400 mt-1">{description}</p>
        {action && (
          <button
            onClick={action.onClick}
            className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 mt-2 transition-colors"
          >
            {action.label}
            <ChevronRight size={14} />
          </button>
        )}
      </div>
    </Card>
  );
}
