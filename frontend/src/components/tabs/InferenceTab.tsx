import { useState, useMemo } from 'react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Download, Filter, BarChart2 } from 'lucide-react';
import { useStore } from '../../store/useStore';

type ViewFilter = 'all' | 'historical' | 'future';

export const InferenceTab = () => {
  const { chartData, metrics, trainedModelType } = useStore();
  const [filter, setFilter] = useState<ViewFilter>('all');
  const [searchDate, setSearchDate] = useState('');

  const filtered = useMemo(() => {
    let data = chartData;
    if (filter === 'historical') data = data.filter((d) => d.actual !== null);
    if (filter === 'future') data = data.filter((d) => d.actual === null && d.predicted !== null);
    if (searchDate) data = data.filter((d) => d.date.includes(searchDate));
    return data;
  }, [chartData, filter, searchDate]);

  // Residuals (only where we have both actual and predicted)
  const residuals = useMemo(() =>
    chartData
      .filter((d) => d.actual !== null && d.predicted !== null)
      .map((d) => ({
        date: d.date,
        residual: (d.actual as number) - (d.predicted as number),
      })),
    [chartData]
  );

  const exportCSV = () => {
    const header = 'date,actual,predicted,lower_bound,upper_bound';
    const rows = filtered.map((d) =>
      [d.date, d.actual ?? '', d.predicted ?? '', d.lower_bound ?? '', d.upper_bound ?? ''].join(',')
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forecast_${trainedModelType ?? 'model'}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (chartData.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400 p-8">
        <BarChart2 className="w-12 h-12 opacity-30" />
        <p className="text-sm">No forecast available. Train a model first on the Training tab.</p>
      </div>
    );
  }

  const futureCount = chartData.filter((d) => d.actual === null && d.predicted !== null).length;
  const historicalCount = chartData.filter((d) => d.actual !== null).length;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Inference Explorer</h2>
          <p className="text-sm text-gray-500 mt-1">
            {trainedModelType} · {historicalCount} historical · {futureCount} future periods
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Metrics summary */}
      {metrics && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'MAE', value: metrics.mae.toFixed(2) },
            { label: 'RMSE', value: metrics.rmse.toFixed(2) },
            { label: 'MAPE', value: `${metrics.mape.toFixed(2)}%` },
          ].map((m) => (
            <div key={m.label} className="glass-panel p-4">
              <p className="text-xs text-gray-500">{m.label}</p>
              <p className="text-xl font-bold text-gray-800 mt-1">{m.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Forecast comparison chart */}
      <div className="glass-panel p-5">
        <h3 className="text-base font-semibold mb-3">Forecast Overview</h3>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart
            data={chartData.length > 600 ? chartData.slice(-600) : chartData}
            margin={{ top: 5, right: 20, left: 10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="date" fontSize={10} stroke="#9ca3af" interval="preserveStartEnd" tickMargin={6} />
            <YAxis fontSize={10} stroke="#9ca3af" width={55} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`)} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: unknown) => [typeof v === 'number' ? v.toFixed(1) : '—']} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="actual" name="Actual" stroke="#1f2937" strokeWidth={2} dot={false} connectNulls={false} />
            <Line type="monotone" dataKey="predicted" name="Predicted" stroke="#4f46e5" strokeWidth={2} dot={false} connectNulls={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Residuals chart */}
      {residuals.length > 0 && (
        <div className="glass-panel p-5">
          <h3 className="text-base font-semibold mb-1">Residual Analysis (Actual − Predicted)</h3>
          <p className="text-xs text-gray-400 mb-3">
            Positive = under-predicted, negative = over-predicted. Ideally centred around 0.
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart
              data={residuals.length > 500 ? residuals.slice(-500) : residuals}
              margin={{ top: 5, right: 20, left: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="date" fontSize={10} stroke="#9ca3af" interval="preserveStartEnd" />
              <YAxis fontSize={10} stroke="#9ca3af" width={55} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`)} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: unknown) => [typeof v === 'number' ? v.toFixed(1) : '—', 'Residual']} />
              <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="4 4" />
              <Bar dataKey="residual" name="Residual" fill="#4f46e5" fillOpacity={0.6} radius={[2, 2, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filter + table */}
      <div className="glass-panel p-5">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400" />
          <div className="flex bg-white/50 rounded-lg border border-gray-200 p-0.5">
            {(['all', 'historical', 'future'] as ViewFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs rounded-md transition-colors font-medium capitalize
                  ${filter === f ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
              >
                {f}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Filter by date (e.g. 2018)"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 w-48"
          />
          <span className="text-xs text-gray-400">{filtered.length} rows</span>
        </div>

        <div className="overflow-auto max-h-80 rounded-lg border border-gray-100">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 font-semibold text-gray-600">Date</th>
                <th className="px-4 py-2 font-semibold text-gray-600">Actual</th>
                <th className="px-4 py-2 font-semibold text-gray-600">Predicted</th>
                <th className="px-4 py-2 font-semibold text-gray-600">Lower 95%</th>
                <th className="px-4 py-2 font-semibold text-gray-600">Upper 95%</th>
                <th className="px-4 py-2 font-semibold text-gray-600">Residual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.slice(0, 500).map((row) => {
                const residual =
                  row.actual !== null && row.predicted !== null
                    ? (row.actual - row.predicted).toFixed(1)
                    : '—';
                const isFuture = row.actual === null;
                return (
                  <tr
                    key={row.date}
                    className={`hover:bg-blue-50/50 transition-colors ${isFuture ? 'text-indigo-600' : ''}`}
                  >
                    <td className="px-4 py-1.5 font-mono">
                      {row.date}
                      {isFuture && (
                        <span className="ml-1 text-[10px] bg-indigo-100 text-indigo-600 px-1 rounded">future</span>
                      )}
                    </td>
                    <td className="px-4 py-1.5">{row.actual?.toFixed(1) ?? '—'}</td>
                    <td className="px-4 py-1.5">{row.predicted?.toFixed(1) ?? '—'}</td>
                    <td className="px-4 py-1.5">{row.lower_bound?.toFixed(1) ?? '—'}</td>
                    <td className="px-4 py-1.5">{row.upper_bound?.toFixed(1) ?? '—'}</td>
                    <td className={`px-4 py-1.5 ${parseFloat(residual) > 0 ? 'text-orange-500' : parseFloat(residual) < 0 ? 'text-green-600' : ''}`}>
                      {residual}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length > 500 && (
            <p className="text-xs text-gray-400 p-3 text-center">
              Showing first 500 of {filtered.length} rows. Export CSV for full data.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
