/**
 * Header Component
 * Main navigation header with branding, controls, and system status
 * Inspired by professional banking dashboards (RBC, Wise)
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  RotateCcw,
  X,
  Trash2,
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
  onReset: () => void;
  onClear: () => void;
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
  onReset,
  onClear,
  className,
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications] = useState([
    { id: 1, message: 'System initialized successfully', time: '2m ago', type: 'success' },
    { id: 2, message: 'ML models loaded and ready', time: '2m ago', type: 'info' },
  ]);

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

            {/* Notifications */}
            <div className="relative">
              <IconButton
                variant="ghost"
                size="sm"
                ariaLabel="View notifications"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell size={18} />
                {notifications.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </IconButton>
              
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50"
                  >
                    <div className="p-3 border-b border-slate-700 flex items-center justify-between">
                      <span className="text-sm font-medium text-white">Notifications</span>
                      <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-white">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.map((n) => (
                        <div key={n.id} className="p-3 border-b border-slate-800 last:border-0 hover:bg-slate-800/50">
                          <p className="text-sm text-slate-300">{n.message}</p>
                          <p className="text-xs text-slate-500 mt-1">{n.time}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="w-px h-8 bg-slate-800 mx-1" />

            {/* Reset Button */}
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<RotateCcw size={16} />}
              onClick={onReset}
              title="Reset simulator counters"
            >
              <span className="hidden sm:inline">Reset</span>
            </Button>

            {/* Clear Feed Button */}
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Trash2 size={16} />}
              onClick={onClear}
              title="Clear transaction feed"
            >
              <span className="hidden sm:inline">Clear</span>
            </Button>

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
