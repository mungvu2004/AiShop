import { useStore } from '../store/useStore';
import { Settings, Play, Loader2 } from 'lucide-react';
import axios from 'axios';

export const SettingsPanel = () => {
  const { 
    modelType, setModelType, 
    prophetConfig, setProphetConfig, 
    lstmConfig, setLstmConfig,
    isTraining, setIsTraining,
    setMetrics, setChartData
  } = useStore();

  const handleTrain = async () => {
    setIsTraining(true);
    try {
      const endpoint = modelType === 'Prophet' ? '/train/prophet' : '/train/lstm';
      const payload = modelType === 'Prophet' ? prophetConfig : lstmConfig;
      
      const res = await axios.post(`http://localhost:8000${endpoint}`, payload);
      setMetrics(res.data.metrics);
      setChartData(res.data.data);
    } catch (error) {
      console.error("Training failed:", error);
      alert("Training failed. Check console for details.");
    } finally {
      setIsTraining(false);
    }
  };

  return (
    <div className="w-80 glass-panel m-4 p-6 flex flex-col overflow-y-auto">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="text-gray-600" />
        <h2 className="text-lg font-bold">Configuration</h2>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Model Selection</label>
        <div className="flex bg-white/50 p-1 rounded-lg border border-gray-200">
          <button 
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${modelType === 'Prophet' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
            onClick={() => setModelType('Prophet')}
          >
            Prophet
          </button>
          <button 
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${modelType === 'LSTM' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
            onClick={() => setModelType('LSTM')}
          >
            LSTM
          </button>
        </div>
      </div>

      <div className="flex-1">
        {modelType === 'Prophet' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Changepoint Prior Scale</label>
              <input type="number" step="0.01" value={prophetConfig.changepoint_prior_scale} onChange={e => setProphetConfig({changepoint_prior_scale: parseFloat(e.target.value)})} className="w-full bg-white/50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Seasonality Mode</label>
              <select value={prophetConfig.seasonality_mode} onChange={e => setProphetConfig({seasonality_mode: e.target.value})} className="w-full bg-white/50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="additive">Additive</option>
                <option value="multiplicative">Multiplicative</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Aggregation</label>
              <select value={prophetConfig.aggregation} onChange={e => setProphetConfig({aggregation: e.target.value})} className="w-full bg-white/50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="D">Daily</option>
                <option value="W">Weekly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Forecast Periods</label>
              <input type="number" value={prophetConfig.periods} onChange={e => setProphetConfig({periods: parseInt(e.target.value)})} className="w-full bg-white/50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Look Back (Window)</label>
              <input type="number" value={lstmConfig.look_back} onChange={e => setLstmConfig({look_back: parseInt(e.target.value)})} className="w-full bg-white/50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Epochs</label>
              <input type="number" value={lstmConfig.epochs} onChange={e => setLstmConfig({epochs: parseInt(e.target.value)})} className="w-full bg-white/50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Batch Size</label>
              <input type="number" value={lstmConfig.batch_size} onChange={e => setLstmConfig({batch_size: parseInt(e.target.value)})} className="w-full bg-white/50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Learning Rate</label>
              <input type="number" step="0.001" value={lstmConfig.learning_rate} onChange={e => setLstmConfig({learning_rate: parseFloat(e.target.value)})} className="w-full bg-white/50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Aggregation</label>
              <select value={lstmConfig.aggregation} onChange={e => setLstmConfig({aggregation: e.target.value})} className="w-full bg-white/50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="D">Daily</option>
                <option value="W">Weekly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Forecast Periods</label>
              <input type="number" value={lstmConfig.periods} onChange={e => setLstmConfig({periods: parseInt(e.target.value)})} className="w-full bg-white/50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        )}
      </div>

      <button 
        onClick={handleTrain}
        disabled={isTraining}
        className="mt-6 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
      >
        {isTraining ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
        {isTraining ? 'Training...' : 'Start Training'}
      </button>
    </div>
  );
};
