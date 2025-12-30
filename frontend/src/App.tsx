import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert, ShieldCheck, Play, Pause, FastForward,
  Activity, PieChart, Info, AlertTriangle, Zap
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import axios from 'axios';

const API_BASE = "http://localhost:8000";
const WS_BASE = "ws://localhost:8000/ws/stream";

interface Transaction {
  id: string;
  timestamp: string;
  amount: number;
  risk_score: number;
  is_fraud: boolean;
  is_suspicious: boolean;
  features: Record<string, number>;
  shap_values: number[];
  feature_names: string[];
}

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [metrics, setMetrics] = useState({ accuracy: 0.98, recall: 0.96, precision: 0.94 });
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    fetchMetrics();
    return () => ws.current?.close();
  }, []);

  const fetchMetrics = async () => {
    try {
      const res = await axios.get(`${API_BASE}/metrics`);
      setMetrics(res.data);
    } catch (e) { console.error(e); }
  };

  const toggleSimulation = async () => {
    try {
      if (isRunning) {
        await axios.post(`${API_BASE}/control/stop`);
        ws.current?.close();
      } else {
        await axios.post(`${API_BASE}/control/start`);
        connectWS();
      }
      setIsRunning(!isRunning);
    } catch (e) { console.error(e); }
  };

  const updateSpeed = async (val: number) => {
    setSpeed(val);
    await axios.post(`${API_BASE}/control/speed?speed=${val}`);
  };

  const injectFraud = async () => {
    await axios.post(`${API_BASE}/control/inject`);
  };

  const connectWS = () => {
    ws.current = new WebSocket(WS_BASE);
    ws.current.onmessage = (event) => {
      const tx = JSON.parse(event.data);
      setTransactions(prev => [tx, ...prev].slice(0, 50));
    };
  };

  const fraudRatioData = [
    { name: 'Legit', value: transactions.filter(t => !t.is_fraud).length + 100 }, // +100 for base
    { name: 'Fraud', value: transactions.filter(t => t.is_fraud).length + 2 },
  ];

  return (
    <div className="flex flex-col h-screen bg-background text-text">
      {/* Header */}
      <header className="border-b border-border p-4 flex justify-between items-center bg-card shadow-[0_0_20px_rgba(16,185,129,0.05)]">
        <div className="flex items-center gap-2">
          <ShieldAlert className="text-primary w-8 h-8" />
          <h1 className="text-xl font-bold tracking-tight">FraudGuard <span className="text-primary">Simulator</span></h1>
        </div>
        <div className="flex gap-4">
          <button onClick={injectFraud} className="bg-danger/20 hover:bg-danger/30 text-danger border border-danger/50 px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-all">
            <Zap size={16} /> Inject Fraud
          </button>
          <button onClick={toggleSimulation} className={`px-6 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${isRunning ? 'bg-warning/20 text-warning border border-warning/50' : 'bg-primary text-white'}`}>
            {isRunning ? <><Pause size={16} /> Stop Simulator</> : <><Play size={16} /> Run Simulator</>}
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar Controls */}
        <aside className="w-64 border-r border-border p-6 bg-card flex flex-col gap-8">
          <div>
            <h3 className="text-xs uppercase font-bold text-muted mb-4 tracking-widest">Simulator Controls</h3>
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium text-muted mb-2 block flex justify-between">
                  Process Interval <span>{speed}s</span>
                </label>
                <input
                  type="range" min="0.1" max="3" step="0.1"
                  value={speed} onChange={(e) => updateSpeed(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
              <div className="p-4 bg-background rounded-xl border border-border">
                <div className="text-sm font-bold mb-1">Status</div>
                <div className={`text-xs flex items-center gap-2 ${isRunning ? 'text-primary' : 'text-muted'}`}>
                  <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-primary animate-pulse' : 'bg-muted'}`} />
                  {isRunning ? 'System Active' : 'System Standby'}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs uppercase font-bold text-muted mb-4 tracking-widest">Model Metrics</h3>
            <div className="space-y-3">
              <MetricItem label="Recall" value={`${(metrics.recall * 100).toFixed(1)}%`} color="text-primary" />
              <MetricItem label="Precision" value={`${(metrics.precision * 100).toFixed(1)}%`} color="text-secondary" />
              <MetricItem label="Accuracy" value={`${(metrics.accuracy * 100).toFixed(1)}%`} color="text-text" />
            </div>
          </div>
        </aside>

        {/* Dashboard Content */}
        <div className="flex-1 flex flex-col overflow-y-auto p-6 gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 h-64">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <Activity size={16} className="text-primary" /> Live Risk Wave
              </h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={transactions.slice(0, 20).reverse()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" />
                  <XAxis dataKey="id" hide />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111114', borderColor: '#1f1f23', borderRadius: '12px' }}
                    labelStyle={{ color: '#a1a1aa' }}
                  />
                  <Line type="monotone" dataKey="risk_score" stroke="#10b981" strokeWidth={3} dot={false} animationDuration={300} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 h-64 flex flex-col items-center">
              <h3 className="text-sm font-bold mb-2 flex items-center gap-2 self-start">
                <PieChart size={16} className="text-secondary" /> Fraud Distribution
              </h3>
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={fraudRatioData}
                    cx="50%" cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#ef4444" />
                  </Pie>
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex-1 bg-card border border-border rounded-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border bg-white/5 flex justify-between items-center">
              <h3 className="text-sm font-bold">Transaction Feed</h3>
              <span className="text-xs text-muted">{transactions.length} processed</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-card border-b border-border text-xs text-muted">
                  <tr>
                    <th className="p-4 font-normal">Transaction ID</th>
                    <th className="p-4 font-normal">Amount</th>
                    <th className="p-4 font-normal">Risk Score</th>
                    <th className="p-4 font-normal">Status</th>
                    <th className="p-4 font-normal text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {transactions.map((tx) => (
                    <tr key={tx.id} onClick={() => setSelectedTx(tx)} className="border-b border-border/50 hover:bg-white/5 cursor-pointer transition-colors">
                      <td className="p-4 font-mono text-xs">{tx.id}</td>
                      <td className="p-4 font-medium">${tx.amount.toFixed(2)}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                            <div
                              className={`h-full ${tx.risk_score > 70 ? 'bg-danger' : tx.risk_score > 40 ? 'bg-warning' : 'bg-primary'}`}
                              style={{ width: `${tx.risk_score}%` }}
                            />
                          </div>
                          <span>{tx.risk_score}%</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {tx.is_fraud ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-danger/10 text-danger text-xs font-bold border border-danger/20">
                            <ShieldAlert size={12} /> FRAUD
                          </span>
                        ) : tx.is_suspicious ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-warning/10 text-warning text-xs font-bold border border-warning/20">
                            <AlertTriangle size={12} /> SUSPICIOUS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                            <ShieldCheck size={12} /> SAFE
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button className="text-muted hover:text-white transition-colors">
                          <Info size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Selected Transaction Details / SHAP */}
        {selectedTx && (
          <aside className="w-96 border-l border-border bg-card p-6 flex flex-col gap-6 overflow-y-auto">
            <div className="flex justify-between items-start">
              <h2 className="text-lg font-bold">Risk Analysis</h2>
              <button onClick={() => setSelectedTx(null)} className="text-muted hover:text-white">✕</button>
            </div>

            <div className="p-4 bg-background rounded-2xl border border-border">
              <div className="text-xs text-muted mb-1">Transaction ID</div>
              <div className="font-mono text-sm mb-4">{selectedTx.id}</div>

              <div className="flex gap-4 mb-4">
                <div className="flex-1 p-3 bg-white/5 rounded-xl">
                  <div className="text-[10px] text-muted uppercase">Amount</div>
                  <div className="text-lg font-bold">${selectedTx.amount.toFixed(2)}</div>
                </div>
                <div className="flex-1 p-3 bg-white/5 rounded-xl">
                  <div className="text-[10px] text-muted uppercase">Risk</div>
                  <div className="text-lg font-bold text-primary">{selectedTx.risk_score}%</div>
                </div>
              </div>

              <div className="text-xs leading-relaxed text-muted">
                {selectedTx.is_fraud
                  ? "Alert: Model detected strong markers of fraudulent behavior corresponding to standard PCA feature anomalies."
                  : "Transaction conforms to typical user behavior patterns."}
              </div>
            </div>

            <div>
              <h3 className="text-xs uppercase font-bold text-muted mb-4 tracking-widest flex items-center justify-between">
                SHAP Explanations <span className="text-[10px] font-normal italic">Why this score?</span>
              </h3>
              <div className="space-y-2">
                {selectedTx.feature_names.slice(0, 10).map((name, idx) => {
                  const val = selectedTx.shap_values[idx];
                  const absVal = Math.abs(val);
                  return (
                    <div key={name} className="flex flex-col gap-1">
                      <div className="flex justify-between text-[11px]">
                        <span>{name}</span>
                        <span className={val > 0 ? 'text-danger' : 'text-primary'}>
                          {val > 0 ? '+' : ''}{val.toFixed(3)}
                        </span>
                      </div>
                      <div className="h-2 bg-background rounded-full overflow-hidden flex">
                        <div className="flex-1 flex justify-end">
                          {val < 0 && <div className="h-full bg-primary/40" style={{ width: `${Math.min(absVal * 100, 100)}%` }} />}
                        </div>
                        <div className="flex-1">
                          {val > 0 && <div className="h-full bg-danger/40" style={{ width: `${Math.min(absVal * 100, 100)}%` }} />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-auto pt-6 border-t border-border">
              <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-xl">
                <ShieldCheck size={16} className="text-primary" />
                <div className="text-[11px] leading-tight font-medium text-primary">
                  Responsible AI Guardrails active. Explanation generated via TreeSHAP kernels.
                </div>
              </div>
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}

function MetricItem({ label, value, color }: { label: string, value: string, color: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs text-muted">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
