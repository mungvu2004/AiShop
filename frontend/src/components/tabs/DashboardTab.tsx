import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { TrendingDown, TrendingUp, Activity, CalendarRange, Target, GitCompareArrows } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, LineChart, Line } from 'recharts';
import { useStore } from '../../store/useStore';
import { Chart } from '../Chart';
import { HelpTooltip } from '../HelpTooltip';

const TARGET_LABEL: Record<string, string> = {
  quantity: 'Số lượng',
  sales: 'Doanh thu',
  profit: 'Lợi nhuận',
};

const MetricCard = ({
  title,
  tooltip,
  value,
  subtitle,
  good,
}: {
  title: string;
  tooltip: string;
  value: string;
  subtitle: string;
  good?: boolean;
}) => (
  <div className="glass-panel p-5 flex flex-col gap-1">
    <div className="flex items-center gap-1">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</span>
      <HelpTooltip text={tooltip} />
    </div>
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
  const { metrics, chartData, trainedModelType, trainedTargetColumn, trainedModelVersion, backtest } = useStore();
  const [runItems, setRunItems] = useState<Array<{
    run_id: string;
    model_type: string;
    model_version: string;
    created_at: string;
    metrics: { mae: number; rmse: number; mape: number };
    target_column?: string;
  }>>([]);

  useEffect(() => {
    let ignore = false;
    const loadRuns = async () => {
      try {
        const res = await axios.get('http://localhost:8000/models/runs', { timeout: 15000 });
        if (!ignore) {
          setRunItems(res.data.items ?? []);
        }
      } catch {
        if (!ignore) {
          setRunItems([]);
        }
      }
    };
    void loadRuns();
    return () => {
      ignore = true;
    };
  }, [trainedModelVersion, metrics?.mae, metrics?.rmse, metrics?.mape]);

  const hasForecast = chartData.length > 0;
  const futurePts = chartData.filter((d) => d.actual === null && d.predicted !== null);
  const historicalPts = chartData.filter((d) => d.actual !== null);
  const lastForecastDate = futurePts.at(-1)?.date ?? '—';
  const targetLabel = TARGET_LABEL[trainedTargetColumn ?? 'quantity'] ?? 'Số lượng';
  const compareRuns = useMemo(
    () =>
      runItems
        .slice(0, 8)
        .map((item) => ({
          name: item.model_version ?? item.run_id.slice(-6),
          created_at: item.created_at,
          model_type: item.model_type,
          mae: item.metrics?.mae ?? 0,
          rmse: item.metrics?.rmse ?? 0,
          mape: item.metrics?.mape ?? 0,
        }))
        .reverse(),
    [runItems]
  );

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto gap-6">
      <div>
        <h2 className="text-2xl font-bold">Bảng tổng quan dự báo</h2>
        <p className="text-gray-500 text-sm mt-1">
          {trainedModelType
            ? `${trainedModelType}${trainedModelVersion ? ` (${trainedModelVersion})` : ''} đang là mô hình gần nhất cho mục tiêu ${targetLabel.toLowerCase()}`
            : 'Chưa có mô hình đã huấn luyện. Vào tab Huấn luyện để bắt đầu.'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <MetricCard
          title="MAE"
          tooltip="Sai số tuyệt đối trung bình. Càng thấp càng tốt."
          value={metrics?.mae !== undefined ? metrics.mae.toFixed(2) : '—'}
          subtitle="Độ lệch trung bình giữa thực tế và dự đoán"
          good={metrics ? metrics.mae < 100 : undefined}
        />
        <MetricCard
          title="RMSE"
          tooltip="Sai số bình phương gốc. Phạt mạnh các lỗi lớn hơn MAE."
          value={metrics?.rmse !== undefined ? metrics.rmse.toFixed(2) : '—'}
          subtitle="Nhạy với các điểm dự báo lệch mạnh"
          good={metrics ? metrics.rmse < 150 : undefined}
        />
        <MetricCard
          title="MAPE"
          tooltip="Sai số phần trăm trung bình. Dễ đọc khi cần so sánh giữa các mục tiêu."
          value={metrics?.mape !== undefined ? `${metrics.mape.toFixed(2)}%` : '—'}
          subtitle="Tỷ lệ lệch phần trăm của dự báo"
          good={metrics ? metrics.mape < 15 : undefined}
        />
      </div>

      {hasForecast && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="glass-panel p-4 flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-500" />
            <div>
              <div className="flex items-center gap-1">
                <p className="text-xs text-gray-500">Điểm lịch sử</p>
                <HelpTooltip text="Số mốc thời gian có giá trị thực tế trong tập hiển thị." />
              </div>
              <p className="text-lg font-bold">{historicalPts.length.toLocaleString()}</p>
            </div>
          </div>
          <div className="glass-panel p-4 flex items-center gap-3">
            <CalendarRange className="w-8 h-8 text-indigo-500" />
            <div>
              <div className="flex items-center gap-1">
                <p className="text-xs text-gray-500">Kỳ dự báo tương lai</p>
                <HelpTooltip text="Số bước thời gian nằm ngoài dữ liệu lịch sử, được mô hình sinh ra." />
              </div>
              <p className="text-lg font-bold">{futurePts.length.toLocaleString()}</p>
              <p className="text-[11px] text-gray-400">Đến {lastForecastDate}</p>
            </div>
          </div>
          <div className="glass-panel p-4 flex items-center gap-3">
            <Target className="w-8 h-8 text-emerald-500" />
            <div>
              <div className="flex items-center gap-1">
                <p className="text-xs text-gray-500">Mục tiêu và mô hình</p>
                <HelpTooltip text="Cho biết mô hình nào đang được dùng và nó dự báo biến nào." />
              </div>
              <p className="text-lg font-bold">{trainedModelType ?? '—'}</p>
              <p className="text-[11px] text-gray-400">{targetLabel}</p>
            </div>
          </div>
        </div>
      )}

      <div className="glass-panel p-4">
        <div className="flex items-center gap-1 mb-1">
          <h3 className="text-base font-semibold">Diễn biến dự báo</h3>
          <HelpTooltip text="So sánh chuỗi thực tế với chuỗi dự báo. Với Prophet, vùng mờ biểu thị khoảng tin cậy." />
        </div>
        <p className="text-xs text-gray-400">
          {hasForecast
            ? `Đang hiển thị ${chartData.length.toLocaleString()} điểm dữ liệu gần nhất của mô hình ${trainedModelType}.`
            : 'Biểu đồ sẽ xuất hiện sau khi hoàn tất một phiên huấn luyện.'}
        </p>
      </div>

      <Chart />

      {backtest && (
        <div className="glass-panel p-5">
          <div className="flex items-center gap-1 mb-1">
            <h3 className="text-base font-semibold">Chất lượng backtest hiện tại</h3>
            <HelpTooltip text="Đồ thị này giúp kiểm tra mô hình đang xuống chất lượng thế nào khi tăng horizon dự báo." />
          </div>
          <p className="text-xs text-gray-400 mb-3">
            {backtest.description}
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={backtest.horizon_metrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="horizon" fontSize={11} stroke="#9ca3af" />
              <YAxis fontSize={11} stroke="#9ca3af" width={65} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="mae" name="MAE" stroke="#4f46e5" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="rmse" name="RMSE" stroke="#ef4444" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="mape" name="MAPE %" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="glass-panel p-5">
        <div className="flex items-center gap-1 mb-1">
          <GitCompareArrows className="w-4 h-4 text-indigo-500" />
          <h3 className="text-base font-semibold">So sánh các run / version</h3>
          <HelpTooltip text="Lấy từ model registry của backend để đối chiếu nhanh giữa các phiên train gần nhất." />
        </div>
        <p className="text-xs text-gray-400 mb-3">
          Đang hiển thị tối đa 8 run gần nhất để tránh dashboard quá nhiễu.
        </p>
        {compareRuns.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={compareRuns} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" fontSize={11} stroke="#9ca3af" />
                <YAxis fontSize={11} stroke="#9ca3af" width={65} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="mae" name="MAE" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                <Bar dataKey="rmse" name="RMSE" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                <Bar dataKey="mape" name="MAPE %" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 overflow-auto rounded-xl border border-gray-100">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 font-semibold text-gray-600">Version</th>
                    <th className="px-4 py-2 font-semibold text-gray-600">Model</th>
                    <th className="px-4 py-2 font-semibold text-gray-600">MAE</th>
                    <th className="px-4 py-2 font-semibold text-gray-600">RMSE</th>
                    <th className="px-4 py-2 font-semibold text-gray-600">MAPE</th>
                    <th className="px-4 py-2 font-semibold text-gray-600">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {runItems.slice(0, 8).map((item) => (
                    <tr key={item.run_id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-4 py-2 font-medium text-gray-700">{item.model_version}</td>
                      <td className="px-4 py-2 text-gray-600">{item.model_type}</td>
                      <td className="px-4 py-2">{item.metrics?.mae?.toFixed(2) ?? '—'}</td>
                      <td className="px-4 py-2">{item.metrics?.rmse?.toFixed(2) ?? '—'}</td>
                      <td className="px-4 py-2">{item.metrics?.mape?.toFixed(2) ?? '—'}%</td>
                      <td className="px-4 py-2 text-gray-500">{new Date(item.created_at).toLocaleString('vi-VN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white/60 p-4 text-sm text-gray-400">
            Chưa có dữ liệu version từ model registry để so sánh.
          </div>
        )}
      </div>
    </div>
  );
};
