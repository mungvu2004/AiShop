import {
  Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart, Area,
} from 'recharts';
import { useStore } from '../store/useStore';

const TARGET_LABEL: Record<string, string> = {
  quantity: 'Số lượng đơn hàng',
  sales: 'Doanh thu',
  profit: 'Lợi nhuận',
};

export const Chart = () => {
  const { chartData, trainedModelType, trainedTargetColumn } = useStore();

  if (!chartData || chartData.length === 0) {
    return (
      <div className="glass-panel p-6 h-96 flex flex-col items-center justify-center text-gray-400 gap-3">
        <svg className="w-12 h-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
        <p className="text-sm text-center">Chưa có dữ liệu dự báo — vào tab Huấn luyện để chạy mô hình</p>
      </div>
    );
  }

  const isProphet = trainedModelType === 'Prophet';
  const hasConfidence = isProphet && chartData.some((d) => d.upper_bound !== null);
  const display = chartData.length > 600 ? chartData.slice(-600) : chartData;
  const targetLabel = TARGET_LABEL[trainedTargetColumn ?? 'quantity'] ?? 'Giá trị';

  return (
    <div className="glass-panel p-6 h-120 flex flex-col">
      <h3 className="text-lg font-semibold mb-1">Thực tế vs Dự đoán</h3>
      <p className="text-xs text-gray-400 mb-4">
        Mô hình {trainedModelType} · {targetLabel} · {chartData.length.toLocaleString()} điểm dữ liệu
        {isProphet && ' · Vùng tô màu = khoảng tin cậy'}
      </p>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={display} margin={{ top: 5, right: 30, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="ciGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#818cf8" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickMargin={8} interval="preserveStartEnd" />
            <YAxis
              stroke="#9ca3af" fontSize={11} width={60}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`)}
            />
            <Tooltip
              contentStyle={{ backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '12px' }}
              formatter={(value: unknown, name: unknown) => [
                typeof value === 'number' ? value.toFixed(1) : '—',
                String(name ?? ''),
              ]}
            />
            <Legend verticalAlign="top" height={36} />

            {hasConfidence && (
              <>
                <Area type="monotone" dataKey="upper_bound" name="Giới hạn trên" stroke="none" fill="url(#ciGradient)" fillOpacity={1} legendType="none" />
                <Area type="monotone" dataKey="lower_bound" name="Giới hạn dưới" stroke="none" fill="#f3f4f6" fillOpacity={1} legendType="none" />
              </>
            )}

            <Line type="monotone" dataKey="actual" name="Thực tế" stroke="#1f2937" strokeWidth={2} dot={false} connectNulls={false} />
            <Line type="monotone" dataKey="predicted" name="Dự đoán" stroke="#4f46e5" strokeWidth={2} dot={false} connectNulls={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
