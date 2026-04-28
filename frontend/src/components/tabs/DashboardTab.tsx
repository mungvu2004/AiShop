import { TrendingDown, TrendingUp, Activity, CalendarRange, Target } from 'lucide-react';
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
  const { metrics, chartData, trainedModelType, trainedTargetColumn } = useStore();

  const hasForecast = chartData.length > 0;
  const futurePts = chartData.filter((d) => d.actual === null && d.predicted !== null);
  const historicalPts = chartData.filter((d) => d.actual !== null);
  const lastForecastDate = futurePts.at(-1)?.date ?? '—';
  const targetLabel = TARGET_LABEL[trainedTargetColumn ?? 'quantity'] ?? 'Số lượng';

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto gap-6">
      <div>
        <h2 className="text-2xl font-bold">Bảng tổng quan dự báo</h2>
        <p className="text-gray-500 text-sm mt-1">
          {trainedModelType
            ? `${trainedModelType} đang là mô hình gần nhất cho mục tiêu ${targetLabel.toLowerCase()}`
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
    </div>
  );
};
