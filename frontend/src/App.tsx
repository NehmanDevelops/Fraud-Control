import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert, ShieldCheck, Play, Pause, Zap, Activity, PieChart as PieChartIcon,
  Info, AlertTriangle, Download, Moon, Sun
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
  risk_level: 'low' | 'medium' | 'high';
  is_fraud: boolean;
  ground_truth: boolean;
  xgboost_score: number;
  isolation_forest_score: number;
  rule_based_score: number;
  features: number[];
  feature_count: number;
  stats: {
    total_processed: number;
    total_fraud: number;
  };
}

interface AppStats {
  is_running: boolean;
  speed: number;
  fraud_rate: number;
  transactions_processed: number;
  fraud_count: number;
  models_ready: boolean;
  dataset_stats: any;
}

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [stats, setStats] = useState<AppStats>({
    is_running: false,
    speed: 1,
    fraud_rate: 0.01,
    transactions_processed: 0,
    fraud_count: 0,
    models_ready: false,
    dataset_stats: null
  });
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [darkMode, setDarkMode] = useState(true);
  const [useDemoMode, setUseDemoMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const ws = useRef<WebSocket | null>(null);
  const wsReconnectRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    fetchStatus();
    const statusInterval = setInterval(fetchStatus, 3000);
    
    return () => {
      clearInterval(statusInterval);
      if (wsReconnectRef.current) clearTimeout(wsReconnectRef.current);
      ws.current?.close();
    };
  }, []);

  useEffect(() => {
    if (isRunning && !ws.current) {
      connectWS();
    }
  }, [isRunning]);

  const fetchStatus = async () => {
    try {
      const res = await axios.get(`${API_BASE}/status`);
      setStats(res.data);
      setLoading(false);
    } catch (e) {
      console.error('Status fetch error:', e);
    }
  };

  const toggleSimulation = async () => {
    try {
      if (isRunning) {
        await axios.post(`${API_BASE}/control/stop`);
        ws.current?.close();
        ws.current = null;
      } else {
        await axios.post(`${API_BASE}/control/start`);
        connectWS();
      }
      setIsRunning(!isRunning);
    } catch (e) {
      console.error('Toggle simulation error:', e);
    }
  };

  const loadDemoData = async () => {
    try {
      setUseDemoMode(!useDemoMode);
      const res = await axios.get(`${API_BASE}/demo-data?limit=100`);
      if (Array.isArray(res.data)) {
        setTransactions(res.data);
      }
    } catch (e) {
      console.error('Demo data load error:', e);
    }
  };

  const updateSpeed = async (val: number) => {
    setSpeed(val);
    try {
      await axios.post(`${API_BASE}/control/config`, {
        speed: val,
        fraud_rate: stats.fraud_rate,
        inject_fraud: false,
        use_demo_mode: false
      });
    } catch (e) {
      console.error('Speed update error:', e);
    }
  };

  const injectFraud = async () => {
    try {
      await axios.post(`${API_BASE}/control/config`, {
        speed: speed,
        fraud_rate: stats.fraud_rate,
        inject_fraud: true,
        use_demo_mode: false
      });
    } catch (e) {
      console.error('Inject fraud error:', e);
    }
  };

  const connectWS = () => {
    try {
      ws.current = new WebSocket(WS_BASE);
      ws.current.onmessage = (event) => {
        try {
          const tx = JSON.parse(event.data);
          setTransactions(prev => [tx, ...prev].slice(0, 100));
        } catch (e) {
          console.error('Parse error:', e);
        }
      };
      ws.current.onerror = () => {
        console.error('WebSocket error');
        scheduleReconnect();
      };
      ws.current.onclose = () => {
        ws.current = null;
        if (isRunning) {
          scheduleReconnect();
        }
      };
    } catch (e) {
      console.error('WebSocket connection error:', e);
      scheduleReconnect();
    }
  };

  const scheduleReconnect = () => {
    if (wsReconnectRef.current) clearTimeout(wsReconnectRef.current);
    wsReconnectRef.current = setTimeout(connectWS, 3000);
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-screen ${darkMode ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'}`}>
        <div className="text-center">
          <ShieldAlert className="w-12 h-12 mb-4 mx-auto animate-pulse text-emerald-500" />
          <p className="text-lg font-semibold">Initializing FraudGuard...</p>
          <p className="text-sm text-gray-500 mt-2">Loading models and dataset</p>
        </div>
      </div>
    );
  }

  const fraudRatioData = [
    { name: 'Legitimate', value: stats.transactions_processed - stats.fraud_count },
    { name: 'Fraud', value: stats.fraud_count },
  ];

  const riskDistribution = [
    { name: 'Low Risk', value: transactions.filter(t => t.risk_level === 'low').length },
    { name: 'Medium Risk', value: transactions.filter(t => t.risk_level === 'medium').length },
    { name: 'High Risk', value: transactions.filter(t => t.risk_level === 'high').length },
  ];

  const chartData = transactions.slice(0, 30).reverse().map((t, i) => ({
    name: `T${i}`,
    risk: parseFloat((t.risk_score * 100).toFixed(1))
  }));

  return (
    <div className={`flex flex-col h-screen ${darkMode ? 'bg-slate-950 text-white' : 'bg-gray-50 text-slate-900'}`}>
      {/* Header */}
      <header className={`border-b ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'} p-4 flex justify-between items-center shadow-sm`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <ShieldAlert className="text-emerald-500 w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">FraudGuard <span className="text-emerald-500">Simulator</span></h1>
            <p className="text-xs text-gray-500">Real-time Fraud Detection Dashboard</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-gray-100 border-gray-300 hover:bg-gray-200'}`}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          <button
            onClick={loadDemoData}
            className={`px-4 py-2 rounded-lg border flex items-center gap-2 text-sm font-medium transition-all ${
              useDemoMode
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                : darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-gray-100 border-gray-300'
            }`}
          >
            <Download size={16} /> {useDemoMode ? 'Demo Active' : 'Load Demo'}
          </button>

          <button
            onClick={injectFraud}
            className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 text-sm font-medium flex items-center gap-2 transition-all"
          >
            <Zap size={16} /> Inject Fraud
          </button>

          <button
            onClick={toggleSimulation}
            className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
              isRunning
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                : 'bg-emerald-500 text-white hover:bg-emerald-600'
            }`}
          >
            {isRunning ? <><Pause size={16} /> Stop</> : <><Play size={16} /> Start</>}
          </button>
        </div>
      </header>

      <main className={`flex-1 flex overflow-hidden ${darkMode ? 'bg-slate-950' : 'bg-gray-50'}`}>
        {/* Sidebar */}
        <aside className={`w-72 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'} border-r p-6 flex flex-col gap-8 overflow-y-auto`}>
          <div>
            <h3 className="text-xs uppercase font-bold text-gray-500 mb-4 tracking-widest">Simulator Controls</h3>
            <div className="space-y-6">
              <div>
                <label className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-2 block flex justify-between`}>
                  Transaction Interval <span className="font-bold text-white">{speed.toFixed(1)}s</span>
                </label>
                <input
                  type="range" min="0.1" max="3" step="0.1"
                  value={speed} onChange={(e) => updateSpeed(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-100 border-gray-300'}`}>
                <div className="text-sm font-bold mb-2">System Status</div>
                <div className={`text-xs flex items-center gap-2 ${isRunning ? 'text-emerald-400' : 'text-gray-500'}`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`} />
                  {isRunning ? 'Running' : 'Idle'}
                </div>
                <div className="text-xs text-gray-500 mt-2">Models: {stats.models_ready ? '✓ Ready' : '✗ Loading'}</div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs uppercase font-bold text-gray-500 mb-4 tracking-widest">Performance</h3>
            <div className="space-y-3">
              <StatItem label="Transactions" value={stats.transactions_processed.toString()} darkMode={darkMode} />
              <StatItem label="Fraud Detected" value={stats.fraud_count.toString()} darkMode={darkMode} color="text-red-400" />
              <StatItem label="Detection Rate" value={stats.transactions_processed > 0 ? ((stats.fraud_count / stats.transactions_processed * 100).toFixed(2) + '%') : '0%'} darkMode={darkMode} color="text-blue-400" />
            </div>
          </div>

          {stats.dataset_stats && (
            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'}`}>
              <h4 className="text-xs font-bold mb-3 flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-500" /> Dataset Info
              </h4>
              <div className="text-xs space-y-1">
                <div>Total: {stats.dataset_stats.total_transactions?.toLocaleString() || 'N/A'}</div>
                <div>Fraud: {stats.dataset_stats.fraud_count?.toLocaleString() || 'N/A'}</div>
                <div>Rate: {stats.dataset_stats.fraud_percentage?.toFixed(2) || 'N/A'}%</div>
              </div>
            </div>
          )}
        </aside>

        {/* Main Dashboard */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Charts Section */}
          <div className="grid grid-cols-3 gap-4 p-6 pb-0">
            <div className={`rounded-xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'} p-6 h-80`}>
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <Activity size={16} className="text-emerald-500" /> Risk Timeline
              </h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e5e7eb'} />
                  <XAxis dataKey="name" stroke={darkMode ? '#64748b' : '#9ca3af'} style={{ fontSize: '12px' }} />
                  <YAxis stroke={darkMode ? '#64748b' : '#9ca3af'} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: darkMode ? '#1e293b' : '#f3f4f6',
                      border: `1px solid ${darkMode ? '#334155' : '#e5e7eb'}`,
                      borderRadius: '8px'
                    }}
                  />
                  <Line type="monotone" dataKey="risk" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className={`rounded-xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'} p-6 h-80 flex flex-col`}>
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <PieChartIcon size={16} className="text-blue-500" /> Overall Distribution
              </h3>
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie data={fraudRatioData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={2}>
                    <Cell fill="#10b981" />
                    <Cell fill="#ef4444" />
                  </Pie>
                </RePieChart>
              </ResponsiveContainer>
            </div>

            <div className={`rounded-xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'} p-6 h-80`}>
              <h3 className="text-sm font-bold mb-4">Risk Breakdown</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e5e7eb'} />
                  <XAxis type="number" stroke={darkMode ? '#64748b' : '#9ca3af'} style={{ fontSize: '12px' }} />
                  <YAxis dataKey="name" type="category" width={80} stroke={darkMode ? '#64748b' : '#9ca3af'} style={{ fontSize: '11px' }} />
                  <Bar dataKey="value" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Transaction Table */}
          <div className={`flex-1 ${darkMode ? 'bg-slate-900' : 'bg-white'} m-6 mt-4 rounded-xl border ${darkMode ? 'border-slate-800' : 'border-gray-200'} flex flex-col overflow-hidden`}>
            <div className={`px-6 py-4 border-b ${darkMode ? 'border-slate-800 bg-slate-800/30' : 'border-gray-200 bg-gray-50'} flex justify-between items-center`}>
              <h3 className="text-sm font-bold">Transaction Feed ({transactions.length})</h3>
              <span className="text-xs text-gray-500">Latest First</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {transactions.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <p>No transactions yet</p>
                    <p className="text-xs mt-2">Click "Start" to begin simulation</p>
                  </div>
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className={`sticky top-0 ${darkMode ? 'bg-slate-800' : 'bg-gray-100'} text-xs text-gray-500 font-semibold`}>
                    <tr>
                      <th className="p-4">ID</th>
                      <th className="p-4">Time</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Risk</th>
                      <th className="p-4">XGB</th>
                      <th className="p-4">IF</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr
                        key={tx.id}
                        onClick={() => setSelectedTx(tx)}
                        className={`border-t ${darkMode ? 'border-slate-800 hover:bg-slate-800/50' : 'border-gray-200 hover:bg-gray-50'} cursor-pointer transition-colors`}
                      >
                        <td className="p-4 font-mono text-xs">{tx.id.substring(0, 10)}</td>
                        <td className="p-4 text-xs text-gray-500">{new Date(tx.timestamp).toLocaleTimeString()}</td>
                        <td className="p-4 font-semibold">${tx.amount.toFixed(2)}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-12 h-1.5 rounded overflow-hidden ${darkMode ? 'bg-slate-700' : 'bg-gray-300'}`}>
                              <div
                                className={`h-full ${
                                  tx.risk_score > 0.7 ? 'bg-red-500' : tx.risk_score > 0.4 ? 'bg-yellow-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${tx.risk_score * 100}%` }}
                              />
                            </div>
                            <span className="w-8 text-right text-xs">{(tx.risk_score * 100).toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="p-4 text-xs">{(tx.xgboost_score * 100).toFixed(0)}%</td>
                        <td className="p-4 text-xs">{(tx.isolation_forest_score * 100).toFixed(0)}%</td>
                        <td className="p-4">
                          {tx.is_fraud ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/30">
                              <ShieldAlert size={12} /> FRAUD
                            </span>
                          ) : tx.risk_level === 'high' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-semibold border border-yellow-500/30">
                              <AlertTriangle size={12} /> SUSPICIOUS
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/30">
                              <ShieldCheck size={12} /> SAFE
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <button className={`${darkMode ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-slate-900'} transition-colors`}>
                            <Info size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Transaction Details Sidebar */}
        {selectedTx && (
          <aside className={`w-96 border-l ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-200'} p-6 flex flex-col gap-6 overflow-y-auto`}>
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold">Transaction Details</h2>
                <p className="text-xs text-gray-500 mt-1">{selectedTx.id}</p>
              </div>
              <button
                onClick={() => setSelectedTx(null)}
                className={`p-1 rounded hover:${darkMode ? 'bg-slate-800' : 'bg-gray-200'}`}
              >
                ✕
              </button>
            </div>

            <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-100 border-gray-300'}`}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Amount</div>
                  <div className="text-xl font-bold">${selectedTx.amount.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Risk Score</div>
                  <div className={`text-xl font-bold ${selectedTx.risk_score > 0.7 ? 'text-red-400' : selectedTx.risk_score > 0.4 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                    {(selectedTx.risk_score * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs uppercase font-bold text-gray-500 mb-3">Model Scores</h3>
              <div className="space-y-3">
                <ScoreBar label="XGBoost" value={selectedTx.xgboost_score} darkMode={darkMode} />
                <ScoreBar label="Isolation Forest" value={selectedTx.isolation_forest_score} darkMode={darkMode} />
                <ScoreBar label="Rule-Based" value={selectedTx.rule_based_score} darkMode={darkMode} />
              </div>
            </div>

            <div>
              <h3 className="text-xs uppercase font-bold text-gray-500 mb-3">Prediction</h3>
              <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-100 border-gray-300'}`}>
                {selectedTx.is_fraud ? (
                  <div>
                    <div className="flex items-center gap-2 text-red-400 font-semibold mb-2">
                      <ShieldAlert size={16} /> FRAUD DETECTED
                    </div>
                    <p className="text-xs text-gray-500">This transaction exhibits strong markers of fraudulent behavior based on ensemble model consensus.</p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-2">
                      <ShieldCheck size={16} /> LEGITIMATE
                    </div>
                    <p className="text-xs text-gray-500">This transaction aligns with typical customer behavior patterns.</p>
                  </div>
                )}
              </div>
            </div>

            <div className={`p-3 rounded-lg border ${darkMode ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'} text-xs text-gray-500`}>
              <div className="flex items-start gap-2">
                <ShieldCheck size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-emerald-400 mb-1">Explainable AI</div>
                  <p>Predictions powered by ensemble of XGBoost, Isolation Forest, and rule-based detection with TreeSHAP explanations.</p>
                </div>
              </div>
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}

function StatItem({ label, value, darkMode, color = 'text-emerald-400' }: {
  label: string;
  value: string;
  darkMode: boolean;
  color?: string;
}) {
  return (
    <div className={`p-3 rounded-lg border ${darkMode ? 'bg-slate-800/30 border-slate-700' : 'bg-gray-100 border-gray-300'}`}>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}

function ScoreBar({ label, value, darkMode }: { label: string; value: number; darkMode: boolean }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="font-semibold">{(value * 100).toFixed(1)}%</span>
      </div>
      <div className={`w-full h-2 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-gray-300'}`}>
        <div
          className={`h-full ${value > 0.7 ? 'bg-red-500' : value > 0.4 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
          style={{ width: `${value * 100}%` }}
        />
      </div>
    </div>
  );
}
