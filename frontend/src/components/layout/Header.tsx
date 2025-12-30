/**
 * Header Component
 * Main navigation header with branding, controls, and system status
 * Inspired by professional banking dashboards (RBC, Wise)
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Play,
  Pause,
  Zap,
  Moon,
  Sun,
  Download,
  Settings,
  Bell,
  Activity,
} from 'lucide-react';
import { Button, IconButton, StatusDot } from '../ui';
import { cn } from '../../lib/utils';

interface HeaderProps {
  isRunning: boolean;
  isDark: boolean;
  modelsReady: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  onToggleSimulation: () => void;
  onInjectFraud: () => void;
  onLoadDemo: () => void;
  onToggleTheme: () => void;
  className?: string;
}

export function Header({
  isRunning,
  isDark,
  modelsReady,
  connectionStatus,
  onToggleSimulation,
  onInjectFraud,
  onLoadDemo,
  onToggleTheme,
  className,
}: HeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b border-slate-800/80 backdrop-blur-xl bg-slate-950/80',
        className
      )}
    >
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Logo & Branding */}
          <div className="flex items-center gap-4">
            <motion.div
              className="relative"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg shadow-blue-500/25">
                <Shield className="w-6 h-6 text-white" />
              </div>
              {/* Glow effect */}
              <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full -z-10" />
            </motion.div>
            
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                FraudGuard
                <span className="text-sm font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">
                  AI
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                Real-Time Fraud Detection Simulator
              </p>
            </div>
          </div>

          {/* Center: System Status */}
          <div className="hidden md:flex items-center gap-6">
            <StatusIndicator
              label="System"
              status={isRunning ? 'online' : 'offline'}
              value={isRunning ? 'Active' : 'Idle'}
            />
            <div className="w-px h-8 bg-slate-800" />
            <StatusIndicator
              label="Models"
              status={modelsReady ? 'online' : 'warning'}
              value={modelsReady ? 'Ready' : 'Loading'}
            />
            <div className="w-px h-8 bg-slate-800" />
            <StatusIndicator
              label="WebSocket"
              status={
                connectionStatus === 'connected'
                  ? 'online'
                  : connectionStatus === 'connecting'
                  ? 'warning'
                  : 'offline'
              }
              value={
                connectionStatus === 'connected'
                  ? 'Connected'
                  : connectionStatus === 'connecting'
                  ? 'Connecting...'
                  : 'Disconnected'
              }
            />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <IconButton
              variant="ghost"
              size="sm"
              ariaLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={onToggleTheme}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </IconButton>

            {/* Notifications - Placeholder */}
            <IconButton
              variant="ghost"
              size="sm"
              ariaLabel="View notifications"
              className="relative"
            >
              <Bell size={18} />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
            </IconButton>

            <div className="w-px h-8 bg-slate-800 mx-1" />

            {/* Demo Data Button */}
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download size={16} />}
              onClick={onLoadDemo}
            >
              <span className="hidden sm:inline">Load Demo</span>
            </Button>

            {/* Inject Fraud Button */}
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Zap size={16} />}
              onClick={onInjectFraud}
              disabled={!isRunning}
            >
              <span className="hidden sm:inline">Inject Fraud</span>
            </Button>

            {/* Start/Stop Button */}
            <Button
              variant={isRunning ? 'warning' : 'primary'}
              size="sm"
              leftIcon={isRunning ? <Pause size={16} /> : <Play size={16} />}
              onClick={onToggleSimulation}
            >
              {isRunning ? 'Stop' : 'Start'}
            </Button>
          </div>
        </div>
      </div>

      {/* Running indicator bar */}
      {isRunning && (
        <motion.div
          className="h-0.5 bg-gradient-to-r from-blue-500 via-emerald-500 to-blue-500 bg-[length:200%_100%]"
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            backgroundPosition: ['0% 0%', '200% 0%'],
          }}
          transition={{
            backgroundPosition: {
              duration: 2,
              repeat: Infinity,
              ease: 'linear',
            },
          }}
        />
      )}
    </header>
  );
}

/**
 * Status Indicator Mini-Component
 */
interface StatusIndicatorProps {
  label: string;
  status: 'online' | 'offline' | 'warning' | 'error';
  value: string;
}

function StatusIndicator({ label, status, value }: StatusIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <StatusDot status={status} pulse={status === 'online'} size="sm" />
      <div className="text-left">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm font-medium text-white">{value}</p>
      </div>
    </div>
  );
}
