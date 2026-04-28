import { useState } from 'react';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import { Play, Loader2, Settings, TrendingDown, BarChart2 } from 'lucide-react';
import { useStore } from '../../store/useStore';

const inputCls =
  'w-full bg-white/50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const labelCls = 'block text-sm text-gray-600 mb-1';

export const TrainingTab = () => {
  const {
    modelType, setModelType,
    prophetConfig, setProphetConfig,
    lstmConfig, setLstmConfig,
    isTraining, setIsTraining,
    progress, setProgress,
    trainingHistory, clearTrainingHistory,
    prophetComponents,
    setMetrics, setChartData,
    setProphetComponents, setTrainedModelType,
    addToast,
  } = useStore();

  const [logs, setLogs] = useState<string[]>([]);

  const log = (msg: string) =>
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 99)]);

  const handleTrain = async () => {
    clearTrainingHistory();
    setProgress(0);
    setLogs([]);
    setIsTraining(true);
    log(`Starting ${modelType} training…`);

    try {
      const endpoint = modelType === 'Prophet' ? '/train/prophet' : '/train/lstm';
      const payload = modelType === 'Prophet' ? prophetConfig : lstmConfig;

      log(`Sending request to ${endpoint}`);
      const res = await axios.post(`http://localhost:8000${endpoint}`, payload, {
        timeout: 600_000,
      });

      setMetrics(res.data.metrics);
      setChartData(res.data.data);
      setTrainedModelType(modelType);

      if (res.data.training_history?.length) {
        // already populated via WebSocket, but set as fallback
      }
      if (res.data.prophet_components) {
        setProphetComponents(res.data.prophet_components);
      }

      const { mae, rmse, mape } = res.data.metrics;
      log(`Training complete — MAE: ${mae.toFixed(2)}, RMSE: ${rmse.toFixed(2)}, MAPE: ${mape.toFixed(2)}%`);
      addToast(`${modelType} training finished! MAE=${mae.toFixed(2)}, MAPE=${mape.toFixed(2)}%`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      log(`ERROR: ${msg}`);
      addToast(`Training failed: ${msg}`, 'error');
    } finally {
      setIsTraining(false);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left: Config panel */}
      <div className="w-72 glass-panel m-4 p-5 flex flex-col overflow-y-auto shrink-0">
        <div className="flex items-center gap-2 mb-5">
          <Settings className="w-5 h-5 text-gray-600" />
          <h2 className="text-base font-bold">Model Configuration</h2>
        </div>

        {/* Model toggle */}
        <div className="mb-5">
          <label className={labelCls}>Model</label>
          <div className="flex bg-white/50 p-1 rounded-lg border border-gray-200">
            {(['Prophet', 'LSTM'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setModelType(m)}
                disabled={isTraining}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors disabled:opacity-50
                  ${modelType === m ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-4">
          {modelType === 'Prophet' ? (
            <>
              <div>
                <label className={labelCls}>Changepoint Prior Scale</label>
                <input
                  type="number" step="0.01" min="0.001" max="0.5"
                  value={prophetConfig.changepoint_prior_scale}
                  onChange={(e) => setProphetConfig({ changepoint_prior_scale: parseFloat(e.target.value) })}
                  disabled={isTraining}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Seasonality Mode</label>
                <select
                  value={prophetConfig.seasonality_mode}
                  onChange={(e) => setProphetConfig({ seasonality_mode: e.target.value })}
                  disabled={isTraining}
                  className={inputCls}
                >
                  <option value="additive">Additive</option>
                  <option value="multiplicative">Multiplicative</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Aggregation</label>
                <select
                  value={prophetConfig.aggregation}
                  onChange={(e) => setProphetConfig({ aggregation: e.target.value })}
                  disabled={isTraining}
                  className={inputCls}
                >
                  <option value="D">Daily</option>
                  <option value="W">Weekly</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Forecast Periods</label>
                <input
                  type="number" min="1"
                  value={prophetConfig.periods}
                  onChange={(e) => setProphetConfig({ periods: parseInt(e.target.value) })}
                  disabled={isTraining}
                  className={inputCls}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className={labelCls}>Look Back Window</label>
                <input
                  type="number" min="1" max="60"
                  value={lstmConfig.look_back}
                  onChange={(e) => setLstmConfig({ look_back: parseInt(e.target.value) })}
                  disabled={isTraining}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Epochs</label>
                <input
                  type="number" min="1" max="200"
                  value={lstmConfig.epochs}
                  onChange={(e) => setLstmConfig({ epochs: parseInt(e.target.value) })}
                  disabled={isTraining}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Batch Size</label>
                <input
                  type="number" min="1"
                  value={lstmConfig.batch_size}
                  onChange={(e) => setLstmConfig({ batch_size: parseInt(e.target.value) })}
                  disabled={isTraining}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Learning Rate</label>
                <input
                  type="number" step="0.0001" min="0.0001" max="0.1"
                  value={lstmConfig.learning_rate}
                  onChange={(e) => setLstmConfig({ learning_rate: parseFloat(e.target.value) })}
                  disabled={isTraining}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Aggregation</label>
                <select
                  value={lstmConfig.aggregation}
                  onChange={(e) => setLstmConfig({ aggregation: e.target.value })}
                  disabled={isTraining}
                  className={inputCls}
                >
                  <option value="D">Daily</option>
                  <option value="W">Weekly</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Forecast Periods</label>
                <input
                  type="number" min="1"
                  value={lstmConfig.periods}
                  onChange={(e) => setLstmConfig({ periods: parseInt(e.target.value) })}
                  disabled={isTraining}
                  className={inputCls}
                />
              </div>
            </>
          )}
        </div>

        <button
          onClick={handleTrain}
          disabled={isTraining}
          className="mt-5 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
        >
          {isTraining ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
          {isTraining ? 'Training…' : 'Start Training'}
        </button>
      </div>

      {/* Right: Monitor */}
      <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto">
        {/* Progress bar */}
        {(isTraining || progress > 0) && (
          <div className="glass-panel p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">
                {isTraining ? 'Training in progress…' : 'Training complete'}
              </span>
              <span className="text-gray-500">{progress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            {trainingHistory.length > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                Epoch {trainingHistory[trainingHistory.length - 1].epoch} · loss:{' '}
                {trainingHistory[trainingHistory.length - 1].loss.toFixed(6)}
              </p>
            )}
          </div>
        )}

        {/* Loss chart (LSTM) */}
        {trainingHistory.length > 0 && (
          <div className="glass-panel p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="w-4 h-4 text-blue-500" />
              <h3 className="text-base font-semibold">Training Loss (MSE per Epoch)</h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trainingHistory} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="epoch" fontSize={11} stroke="#9ca3af" label={{ value: 'Epoch', position: 'insideBottom', offset: -4, fontSize: 11 }} />
                <YAxis fontSize={11} stroke="#9ca3af" width={65} tickFormatter={(v) => v.toExponential(1)} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  formatter={(v: unknown) => [typeof v === 'number' ? v.toFixed(6) : '—', 'Loss']}
                />
                <Area type="monotone" dataKey="loss" stroke="#4f46e5" fill="url(#lossGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Prophet components */}
        {prophetComponents && prophetComponents.length > 0 && <ProphetComponentsChart />}

        {/* Training logs */}
        <div className="glass-panel p-5 flex-1">
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 className="w-4 h-4 text-gray-500" />
            <h3 className="text-base font-semibold">Training Logs</h3>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs text-green-400 h-48 overflow-y-auto flex flex-col-reverse">
            {logs.length === 0 ? (
              <span className="text-gray-600">Waiting for training to start…</span>
            ) : (
              logs.map((l, i) => <div key={i}>{l}</div>)
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ProphetComponentsChart = () => {
  const components = useStore((s) => s.prophetComponents)!;
  const sample = components.length > 400 ? components.slice(-400) : components;

  return (
    <div className="glass-panel p-5">
      <h3 className="text-base font-semibold mb-3">Prophet Trend Component</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={sample} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="date" fontSize={10} stroke="#9ca3af" interval="preserveStartEnd" />
          <YAxis fontSize={10} stroke="#9ca3af" width={55} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="trend" stroke="#f59e0b" strokeWidth={2} dot={false} />
          {sample[0]?.yearly !== null && (
            <Line type="monotone" dataKey="yearly" stroke="#10b981" strokeWidth={1.5} dot={false} />
          )}
          {sample[0]?.weekly !== null && (
            <Line type="monotone" dataKey="weekly" stroke="#8b5cf6" strokeWidth={1.5} dot={false} />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
