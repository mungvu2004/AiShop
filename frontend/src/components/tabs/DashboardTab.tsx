import { TrendingDown, TrendingUp, Activity } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Chart } from '../Chart';

const MetricCard = ({
  title,
  value,
  subtitle,
  good,
}: {
  title: string;
  value: string;
  subtitle: string;
  good?: boolean;
}) => (
  <div className="glass-panel p-5 flex flex-col gap-1">
    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</span>
    <div className="flex items-end gap-2 mt-1">
      <span className="text-2xl font-bold text-gray-800">{value}</span>
      {good !== undefined &&
        (good ? (
          <TrendingDown className="w-4 h-4 text-green-500 mb-1" />
        ) : (
          <TrendingUp className="w-4 h-4 text-red-400 mb-1" />
        ))}
    </div>
    <span className="text-xs text-gray-400">{subtitle}</span>
  </div>
);

export const DashboardTab = () => {
  const { metrics, chartData, trainedModelType } = useStore();

  const hasForecast = chartData.length > 0;
  const futurePts = chartData.filter((d) => d.actual === null && d.predicted !== null);

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto gap-6">
      <div>
        <h2 className="text-2xl font-bold">Demand Forecasting Dashboard</h2>
        <p className="text-gray-500 text-sm mt-1">
          {trainedModelType
            ? `Last trained: ${trainedModelType} model · ${futurePts.length} future periods forecasted`
            : 'No model trained yet — head to Training tab'}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          title="Mean Absolute Error"
          value={metrics?.mae !== undefined ? metrics.mae.toFixed(2) : '—'}
          subtitle="Lower is better"
          good={metrics ? metrics.mae < 100 : undefined}
        />
        <MetricCard
          title="Root Mean Squared Error"
          value={metrics?.rmse !== undefined ? metrics.rmse.toFixed(2) : '—'}
          subtitle="Penalises large errors"
          good={metrics ? metrics.rmse < 150 : undefined}
        />
        <MetricCard
          title="Mean Abs. % Error"
          value={metrics?.mape !== undefined ? `${metrics.mape.toFixed(2)}%` : '—'}
          subtitle="Percentage deviation"
          good={metrics ? metrics.mape < 15 : undefined}
        />
      </div>

      {/* Forecast summary row */}
      {hasForecast && (
        <div className="grid grid-cols-3 gap-4">
          <div className="glass-panel p-4 flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-xs text-gray-500">Data points</p>
              <p className="text-lg font-bold">{chartData.length.toLocaleString()}</p>
            </div>
          </div>
          <div className="glass-panel p-4 flex items-center gap-3">
            <Activity className="w-8 h-8 text-indigo-500" />
            <div>
              <p className="text-xs text-gray-500">Future forecast</p>
              <p className="text-lg font-bold">{futurePts.length} periods</p>
            </div>
          </div>
          <div className="glass-panel p-4 flex items-center gap-3">
            <Activity className="w-8 h-8 text-violet-500" />
            <div>
              <p className="text-xs text-gray-500">Model</p>
              <p className="text-lg font-bold">{trainedModelType ?? '—'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Forecast Chart */}
      <Chart />
    </div>
  );
};
