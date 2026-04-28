import { Activity, BarChart2, Database, Cpu, FlaskConical } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { ActiveTab } from '../store/useStore';

const NAV_ITEMS: { id: ActiveTab; icon: React.ReactNode; label: string; desc: string }[] = [
  { id: 'dashboard', icon: <BarChart2 className="w-5 h-5" />, label: 'Bảng tổng quan', desc: 'Xem kết quả dự báo và chỉ số đánh giá' },
  { id: 'data', icon: <Database className="w-5 h-5" />, label: 'Khám phá dữ liệu', desc: 'Phân tích và trực quan hoá tập dữ liệu' },
  { id: 'training', icon: <Cpu className="w-5 h-5" />, label: 'Huấn luyện', desc: 'Cấu hình và chạy mô hình Prophet / LSTM' },
  { id: 'inference', icon: <FlaskConical className="w-5 h-5" />, label: 'Kiểm thử & Dự báo', desc: 'Khám phá kết quả, phân tích sai số, xuất dữ liệu' },
];

export const Sidebar = () => {
  const { activeTab, setActiveTab, trainedModelType, trainedTargetColumn } = useStore();

  const targetLabel: Record<string, string> = { quantity: 'Số lượng', sales: 'Doanh thu', profit: 'Lợi nhuận' };

  return (
    <div className="w-60 glass-panel m-4 flex flex-col p-4 text-gray-800 shrink-0">
      <div className="flex items-center gap-2 mb-8 px-2">
        <Activity className="text-blue-600 w-7 h-7" />
        <div>
          <h1 className="text-base font-bold tracking-tight leading-tight">SC Forecast</h1>
          <p className="text-[10px] text-gray-400">Dự báo chuỗi cung ứng</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            title={item.desc}
            onClick={() => setActiveTab(item.id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium text-left ${
              activeTab === item.id
                ? 'bg-blue-600/10 text-blue-700 shadow-sm'
                : 'text-gray-600 hover:bg-white/60'
            }`}
          >
            <span className={`shrink-0 ${activeTab === item.id ? 'text-blue-600' : 'text-gray-400'}`}>
              {item.icon}
            </span>
            <span className="leading-tight">{item.label}</span>
          </button>
        ))}
      </nav>

      {trainedModelType && (
        <div className="mt-4 px-3 py-2.5 bg-green-50 border border-green-200 rounded-lg text-xs space-y-0.5">
          <div className="font-semibold text-green-700">✓ Mô hình đã huấn luyện</div>
          <div className="text-green-600">{trainedModelType}</div>
          {trainedTargetColumn && (
            <div className="text-green-500">Mục tiêu: {targetLabel[trainedTargetColumn] ?? trainedTargetColumn}</div>
          )}
        </div>
      )}

      <div className="mt-4 px-2 py-3 border-t border-gray-200/50 text-[10px] text-gray-400 leading-relaxed">
        DataCo Supply Chain<br />
        Prophet + LSTM/GRU/BiLSTM
      </div>
    </div>
  );
};
