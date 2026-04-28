import { useState, useMemo } from 'react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Download, Filter, BarChart2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { HelpTooltip } from '../HelpTooltip';

type ViewFilter = 'all' | 'historical' | 'future';

const FILTER_LABEL: Record<ViewFilter, string> = {
  all: 'Tất cả',
  historical: 'Lịch sử',
  future: 'Tương lai',
};

const TARGET_LABEL: Record<string, string> = {
  quantity: 'Số lượng',
  sales: 'Doanh thu',
  profit: 'Lợi nhuận',
};

export const InferenceTab = () => {
  const { chartData, metrics, trainedModelType, trainedTargetColumn } = useStore();
  const [filter, setFilter] = useState<ViewFilter>('all');
  const [searchDate, setSearchDate] = useState('');

  const filtered = useMemo(() => {
    let data = chartData;
    if (filter === 'historical') data = data.filter((d) => d.actual !== null);
    if (filter === 'future') data = data.filter((d) => d.actual === null && d.predicted !== null);
    if (searchDate) data = data.filter((d) => d.date.includes(searchDate));
    return data;
  }, [chartData, filter, searchDate]);

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
    a.download = `du_bao_${trainedModelType ?? 'model'}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (chartData.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400 p-8">
        <BarChart2 className="w-12 h-12 opacity-30" />
        <p className="text-sm">Chưa có kết quả dự báo. Hãy huấn luyện mô hình ở tab Huấn luyện trước.</p>
      </div>
    );
  }

  const futureCount = chartData.filter((d) => d.actual === null && d.predicted !== null).length;
  const historicalCount = chartData.filter((d) => d.actual !== null).length;
  const targetLabel = TARGET_LABEL[trainedTargetColumn ?? 'quantity'] ?? 'Số lượng';

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-1">
            <h2 className="text-2xl font-bold">Kiểm thử và khai thác dự báo</h2>
            <HelpTooltip text="Tab này giúp kiểm tra chất lượng dự báo, lọc từng nhóm điểm dữ liệu và xuất kết quả ra CSV." />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {trainedModelType} · {targetLabel} · {historicalCount.toLocaleString()} điểm lịch sử · {futureCount.toLocaleString()} kỳ tương lai
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
        >
          <Download className="w-4 h-4" /> Xuất CSV
        </button>
      </div>

      {metrics && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {[
            {
              label: 'MAE',
              value: metrics.mae.toFixed(2),
              tooltip: 'Sai số tuyệt đối trung bình giữa giá trị thực và dự báo.',
            },
            {
              label: 'RMSE',
              value: metrics.rmse.toFixed(2),
              tooltip: 'Phạt mạnh hơn các điểm dự báo lệch lớn.',
            },
            {
              label: 'MAPE',
              value: `${metrics.mape.toFixed(2)}%`,
              tooltip: 'Sai số trung bình theo tỷ lệ phần trăm.',
            },
          ].map((m) => (
            <div key={m.label} className="glass-panel p-4">
              <div className="flex items-center gap-1">
                <p className="text-xs text-gray-500">{m.label}</p>
                <HelpTooltip text={m.tooltip} />
              </div>
              <p className="text-xl font-bold text-gray-800 mt-1">{m.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="glass-panel p-5">
        <div className="flex items-center gap-1 mb-1">
          <h3 className="text-base font-semibold">Tổng quan dự báo</h3>
          <HelpTooltip text="Biểu đồ này đặt chuỗi thực tế và chuỗi dự báo trên cùng một trục để so sánh hình dạng và độ lệch." />
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Chỉ hiển thị tối đa 600 điểm cuối để đảm bảo giao diện mượt khi dữ liệu lớn.
        </p>
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
            <Line type="monotone" dataKey="actual" name="Thực tế" stroke="#1f2937" strokeWidth={2} dot={false} connectNulls={false} />
            <Line type="monotone" dataKey="predicted" name="Dự báo" stroke="#4f46e5" strokeWidth={2} dot={false} connectNulls={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {residuals.length > 0 && (
        <div className="glass-panel p-5">
          <div className="flex items-center gap-1 mb-1">
            <h3 className="text-base font-semibold">Phân tích phần dư</h3>
            <HelpTooltip text="Residual = thực tế - dự báo. Dương nghĩa là mô hình dự báo thấp hơn thực tế; âm nghĩa là dự báo cao hơn." />
          </div>
          <p className="text-xs text-gray-400 mb-3">
            Lý tưởng nhất là dao động quanh 0 và không tạo thành xu hướng có hệ thống.
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

      <div className="glass-panel p-5">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400" />
          <div className="flex bg-white/50 rounded-lg border border-gray-200 p-0.5">
            {(['all', 'historical', 'future'] as ViewFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs rounded-md transition-colors font-medium
                  ${filter === f ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
              >
                {FILTER_LABEL[f]}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Lọc theo ngày, ví dụ 2018 hoặc 2018-03"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white/50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 w-64"
          />
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <span>{filtered.length.toLocaleString()} dòng</span>
            <HelpTooltip text="Bảng hiển thị tối đa 500 dòng đầu tiên của tập đã lọc. Dùng nút Xuất CSV để lấy toàn bộ dữ liệu." />
          </div>
        </div>

        <div className="overflow-auto max-h-80 rounded-lg border border-gray-100">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 font-semibold text-gray-600">Ngày</th>
                <th className="px-4 py-2 font-semibold text-gray-600">Thực tế</th>
                <th className="px-4 py-2 font-semibold text-gray-600">Dự báo</th>
                <th className="px-4 py-2 font-semibold text-gray-600">Cận dưới</th>
                <th className="px-4 py-2 font-semibold text-gray-600">Cận trên</th>
                <th className="px-4 py-2 font-semibold text-gray-600">Residual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.slice(0, 500).map((row) => {
                const residualValue =
                  row.actual !== null && row.predicted !== null ? row.actual - row.predicted : null;
                const residualText = residualValue !== null ? residualValue.toFixed(1) : '—';
                const isFuture = row.actual === null;
                return (
                  <tr
                    key={`${row.date}-${row.actual ?? 'na'}-${row.predicted ?? 'na'}`}
                    className={`hover:bg-blue-50/50 transition-colors ${isFuture ? 'text-indigo-600' : ''}`}
                  >
                    <td className="px-4 py-1.5 font-mono">
                      {row.date}
                      {isFuture && (
                        <span className="ml-1 text-[10px] bg-indigo-100 text-indigo-600 px-1 rounded">tương lai</span>
                      )}
                    </td>
                    <td className="px-4 py-1.5">{row.actual?.toFixed(1) ?? '—'}</td>
                    <td className="px-4 py-1.5">{row.predicted?.toFixed(1) ?? '—'}</td>
                    <td className="px-4 py-1.5">{row.lower_bound?.toFixed(1) ?? '—'}</td>
                    <td className="px-4 py-1.5">{row.upper_bound?.toFixed(1) ?? '—'}</td>
                    <td className={`px-4 py-1.5 ${residualValue === null ? '' : residualValue > 0 ? 'text-orange-500' : residualValue < 0 ? 'text-green-600' : ''}`}>
                      {residualText}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length > 500 && (
            <p className="text-xs text-gray-400 p-3 text-center">
              Đang hiển thị 500 dòng đầu trong tổng số {filtered.length.toLocaleString()} dòng đã lọc. Hãy xuất CSV nếu cần toàn bộ.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
