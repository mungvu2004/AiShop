import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, ReferenceLine,
  ComposedChart,
} from 'recharts';
import { useStore } from '../../store/useStore';
import { RefreshCw, CheckCircle2, ArrowRight, ChevronDown, ChevronRight } from 'lucide-react';
import { HelpTooltip } from '../HelpTooltip';

const COLORS = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777', '#0369a1'];

// ── Tiện ích ──────────────────────────────────────────────────

const SectionTitle = ({ children, tooltip }: { children: ReactNode; tooltip?: string }) => (
  <div className="flex items-center gap-1 mb-3">
    <h3 className="text-base font-semibold text-gray-700">{children}</h3>
    {tooltip && <HelpTooltip text={tooltip} />}
  </div>
);

const StatCard = ({ label, value, tooltip }: { label: string; value: string | number; tooltip?: string }) => (
  <div className="glass-panel p-4 flex flex-col gap-1">
    <div className="flex items-center gap-1">
      <span className="text-xs text-gray-500 truncate">{label}</span>
      {tooltip && <HelpTooltip text={tooltip} />}
    </div>
    <span className="text-xl font-bold text-gray-800">{value}</span>
  </div>
);

const Section = ({ title, tooltip, children, defaultOpen = true }: {
  title: string; tooltip?: string; children: ReactNode; defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="glass-panel">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-1">
          <span className="font-semibold text-gray-700">{title}</span>
          {tooltip && <HelpTooltip text={tooltip} />}
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-5 pb-5 space-y-5">{children}</div>}
    </div>
  );
};

// ── Component chính ───────────────────────────────────────────

export const DataExplorerTab = () => {
  const { dataInfo, setDataInfo, isLoadingData, setIsLoadingData, addToast } = useStore();

  const loadData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const res = await axios.get('http://localhost:8000/data/info');
      setDataInfo(res.data);
      addToast('Dữ liệu đã tải thành công!', 'success');
    } catch {
      addToast('Không tải được dữ liệu. Backend đã chạy chưa?', 'error');
    } finally {
      setIsLoadingData(false);
    }
  }, [addToast, setDataInfo, setIsLoadingData]);

  useEffect(() => {
    if (!dataInfo) {
      void loadData();
    }
  }, [dataInfo, loadData]);

  if (isLoadingData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-500">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-sm">Đang tải dữ liệu… Tệp CSV 92 MB, vui lòng chờ</p>
        <p className="text-xs text-gray-400">Lần tải đầu tiên mất ~10-30 giây, sau đó được cache</p>
      </div>
    );
  }

  if (!dataInfo) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400 p-8">
        <p className="text-sm">Chưa tải dữ liệu.</p>
        <button onClick={loadData} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          Tải dữ liệu
        </button>
      </div>
    );
  }

  const { stats, time_series, distribution, rolling, monthly, weekday, yoy,
    acf, significance, decomposition, categories, markets,
    multi_target, scale_preview, preprocessing_steps } = dataInfo;

  // YoY chart
  const monthNames = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];
  const yoyByYear: Record<string, Record<number, number>> = {};
  yoy.forEach(({ year, month, value }) => {
    const y = String(year);
    if (!yoyByYear[y]) yoyByYear[y] = {};
    yoyByYear[y][month] = value;
  });
  const years = Object.keys(yoyByYear).sort();
  const yoyChartData = monthNames.map((name, i) => {
    const row: Record<string, number | string> = { month: name };
    years.forEach((y) => { row[y] = yoyByYear[y]?.[i + 1] ?? 0; });
    return row;
  });

  // ACF với significance band
  const acfWithSig = acf.map((d) => ({
    ...d,
    sig_upper: significance,
    sig_lower: -significance,
    barColor: Math.abs(d.acf) > significance ? '#4f46e5' : '#94a3b8',
  }));

  const hasMultiSales = multi_target.some((d) => d.sales !== undefined);
  const hasMultiProfit = multi_target.some((d) => d.profit !== undefined);

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      {/* Tiêu đề */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Khám phá dữ liệu</h2>
          <p className="text-sm text-gray-500 mt-1">
            {stats.date_start} → {stats.date_end} · {stats.total_days.toLocaleString()} ngày · {stats.total_records.toLocaleString()} bản ghi
          </p>
        </div>
        <button onClick={loadData} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-white/60 rounded-lg border border-gray-200">
          <RefreshCw className="w-4 h-4" /> Tải lại
        </button>
      </div>

      {/* ── Bước 1: Thống kê tổng quan ── */}
      <Section title="Bước 1 — Thống kê tổng quan" tooltip="Các chỉ số cơ bản sau khi tải và làm sạch dữ liệu">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-4">
          <StatCard label="Tổng bản ghi" value={stats.total_records.toLocaleString()} tooltip="Số dòng gốc trong tệp CSV trước khi làm sạch" />
          <StatCard label="TB hàng ngày" value={stats.mean_daily.toFixed(1)} tooltip="Trung bình số lượng đơn hàng mỗi ngày sau tổng hợp" />
          <StatCard label="Cao nhất/ngày" value={stats.max_daily.toLocaleString()} tooltip="Ngày có số lượng đơn hàng cao nhất trong toàn bộ lịch sử" />
          <StatCard label="Tổng số lượng" value={(stats.total_quantity / 1000).toFixed(0) + 'k'} tooltip="Tổng tích lũy số lượng đơn hàng toàn bộ thời gian" />
          <StatCard label="Số ngày" value={stats.total_days.toLocaleString()} tooltip="Tổng số bước thời gian hàng ngày sau tổng hợp" />
          <StatCard label="Độ lệch chuẩn" value={stats.std_daily.toFixed(1)} tooltip="Độ biến động của số lượng đơn hàng. Cao = không ổn định" />
          <StatCard label="Thấp nhất/ngày" value={stats.min_daily.toLocaleString()} tooltip="Ngày ít đơn hàng nhất (có thể là cuối tuần hoặc ngày lễ)" />
          <StatCard label="Tỷ lệ thiếu" value={stats.missing_ratio + '%'} tooltip="Phần trăm bản ghi bị thiếu hoặc không hợp lệ đã loại bỏ" />
        </div>
      </Section>

      {/* ── Bước 2: Chuỗi thời gian tổng quan ── */}
      <Section title="Bước 2 — Chuỗi thời gian & Xu hướng" tooltip="Xem tổng quan dữ liệu theo thời gian để nhận biết xu hướng và mùa vụ">
        <SectionTitle tooltip="365 ngày gần nhất. Vùng tô màu cho thấy mật độ dao động">Số lượng theo ngày — 365 ngày gần đây</SectionTitle>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={time_series} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="tsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="date" fontSize={10} stroke="#9ca3af" interval="preserveStartEnd" tickMargin={6} />
            <YAxis fontSize={10} stroke="#9ca3af" width={50} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Area type="monotone" dataKey="value" name="Số lượng" stroke="#4f46e5" fill="url(#tsGrad)" strokeWidth={1.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>

        <SectionTitle tooltip="MA7 làm mịn biến động tuần, MA30 cho thấy xu hướng tháng. Giúp nhận diện pattern dài hạn">Trung bình động (MA7 & MA30)</SectionTitle>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={rolling} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="date" fontSize={10} stroke="#9ca3af" interval="preserveStartEnd" tickMargin={6} />
            <YAxis fontSize={10} stroke="#9ca3af" width={50} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="raw" name="Hàng ngày" stroke="#cbd5e1" strokeWidth={1} dot={false} />
            <Line type="monotone" dataKey="ma7" name="MA 7 ngày" stroke="#4f46e5" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="ma30" name="MA 30 ngày" stroke="#f59e0b" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <div>
            <SectionTitle tooltip="Mỗi cột là số ngày rơi vào khoảng giá trị đó. Phân phối lệch phải thường gặp trong đơn hàng">Phân phối số lượng hàng ngày</SectionTitle>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={distribution} margin={{ top: 5, right: 10, left: 0, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="range" fontSize={9} stroke="#9ca3af" angle={-35} textAnchor="end" interval={3} />
                <YAxis fontSize={10} stroke="#9ca3af" width={40} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="count" name="Số ngày" radius={[3, 3, 0, 0]}>
                  {distribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <SectionTitle tooltip="Cho thấy ngày nào trong tuần có nhu cầu cao/thấp. Quan trọng để xác định mùa vụ hàng tuần">Đơn hàng trung bình theo thứ trong tuần</SectionTitle>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weekday} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="day" fontSize={10} stroke="#9ca3af" />
                <YAxis fontSize={10} stroke="#9ca3af" width={50} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="avg" name="TB số lượng" fill="#0891b2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <SectionTitle tooltip="Tổng số lượng mỗi tháng — nhận biết tháng cao điểm và thấp điểm trong năm">Tổng số lượng theo tháng</SectionTitle>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthly} margin={{ top: 5, right: 20, left: 10, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="month" fontSize={9} stroke="#9ca3af" angle={-45} textAnchor="end" interval={1} />
            <YAxis fontSize={10} stroke="#9ca3af" width={55} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: unknown) => [typeof v === 'number' ? v.toLocaleString() : '—', 'Số lượng']} />
            <Bar dataKey="value" name="Số lượng theo tháng" fill="#059669" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>

        <SectionTitle tooltip="So sánh cùng tháng qua các năm — xác nhận tính lặp lại của mùa vụ hàng năm">So sánh cùng kỳ năm trước (YoY)</SectionTitle>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={yoyChartData} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="month" fontSize={11} stroke="#9ca3af" />
            <YAxis fontSize={10} stroke="#9ca3af" width={55} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {years.map((y, i) => (
              <Line key={y} type="monotone" dataKey={y} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Section>

      {/* ── Bước 3: Phân tích danh mục ── */}
      {(categories.length > 0 || markets.length > 0) && (
        <Section title="Bước 3 — Phân tích danh mục & Thị trường" tooltip="Hiểu cấu trúc dữ liệu: sản phẩm và thị trường nào chiếm tỷ trọng lớn nhất">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {categories.length > 0 && (
              <div>
                <SectionTitle tooltip="Top 12 danh mục sản phẩm theo tổng số lượng. Cho thấy danh mục nào ảnh hưởng nhiều nhất đến dự báo">Top danh mục sản phẩm</SectionTitle>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={categories} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                    <XAxis type="number" fontSize={10} stroke="#9ca3af" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" fontSize={10} stroke="#9ca3af" width={80} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: unknown) => [typeof v === 'number' ? v.toLocaleString() : '—', 'Số lượng']} />
                    <Bar dataKey="value" name="Tổng SL" radius={[0, 4, 4, 0]}>
                      {categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {markets.length > 0 && (
              <div>
                <SectionTitle tooltip="Phân bổ theo thị trường địa lý. Thị trường lớn ảnh hưởng nhiều đến xu hướng tổng hợp">Phân bổ theo thị trường</SectionTitle>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={markets} layout="vertical" margin={{ top: 5, right: 20, left: 80, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                    <XAxis type="number" fontSize={10} stroke="#9ca3af" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" fontSize={10} stroke="#9ca3af" width={80} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="value" name="Tổng SL" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* So sánh nhiều mục tiêu */}
          {(hasMultiSales || hasMultiProfit) && (
            <>
              <SectionTitle tooltip="Số lượng, doanh thu và lợi nhuận được chuẩn hóa về [0,1] để so sánh pattern. Nếu các đường tương đồng, chúng có thể dự báo thay thế nhau">So sánh các mục tiêu dự báo (đã chuẩn hóa)</SectionTitle>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={multi_target} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="date" fontSize={10} stroke="#9ca3af" interval="preserveStartEnd" />
                  <YAxis fontSize={10} stroke="#9ca3af" width={40} domain={[0, 1]} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: unknown) => [typeof v === 'number' ? v.toFixed(3) : '—']} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="quantity" name="Số lượng" stroke="#4f46e5" strokeWidth={2} dot={false} />
                  {hasMultiSales && <Line type="monotone" dataKey="sales" name="Doanh thu" stroke="#059669" strokeWidth={2} dot={false} />}
                  {hasMultiProfit && <Line type="monotone" dataKey="profit" name="Lợi nhuận" stroke="#f59e0b" strokeWidth={2} dot={false} />}
                </LineChart>
              </ResponsiveContainer>
            </>
          )}
        </Section>
      )}

      {/* ── Bước 4: Phân tích thống kê ── */}
      <Section title="Bước 4 — Phân tích thống kê chuỗi thời gian" tooltip="Phân tích tự tương quan và phân rã thành phần — rất quan trọng để chọn tham số mô hình">
        {/* ACF */}
        <SectionTitle tooltip="Tự tương quan (ACF) tại các lag khác nhau. Cột vượt qua đường nét đứt = có tự tương quan có ý nghĩa. Dùng để chọn look_back cho LSTM (chọn lag cao nhất còn có ý nghĩa)">
          Biểu đồ tự tương quan (ACF) — Chọn look_back cho LSTM
        </SectionTitle>
        <p className="text-xs text-gray-400 mb-2">
          Đường nét đứt = giới hạn có ý nghĩa thống kê (±{significance.toFixed(3)}).
          Cột <span className="text-indigo-600 font-semibold">xanh đậm</span> = tương quan có ý nghĩa.
          Chọn look_back ≈ lag lớn nhất còn vượt đường này.
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={acfWithSig.slice(1)} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="lag" fontSize={10} stroke="#9ca3af" label={{ value: 'Lag', position: 'insideBottomRight', offset: -10, fontSize: 11 }} />
            <YAxis fontSize={10} stroke="#9ca3af" width={45} domain={[-1, 1]} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: unknown) => [typeof v === 'number' ? v.toFixed(4) : '—']} />
            <ReferenceLine y={significance} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={1.5} />
            <ReferenceLine y={-significance} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={1.5} />
            <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={1} />
            <Bar dataKey="acf" name="ACF" radius={[2, 2, 0, 0]}>
              {acfWithSig.slice(1).map((entry, i) => (
                <Cell key={i} fill={Math.abs(entry.acf) > significance ? '#4f46e5' : '#94a3b8'} />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>

        {/* Phân rã chuỗi thời gian */}
        <SectionTitle tooltip="Phân rã chuỗi thành 3 thành phần: Xu hướng (trend) dài hạn, Mùa vụ (seasonal) lặp lại theo chu kỳ 7 ngày, và Phần dư (residual) ngẫu nhiên. Prophet mô hình hoá trực tiếp 3 thành phần này">
          Phân rã chuỗi thời gian (Trend + Seasonal + Residual)
        </SectionTitle>
        <p className="text-xs text-gray-400 mb-2">
          Phân rã theo mô hình cộng tính với chu kỳ 7 ngày — 365 ngày gần nhất
        </p>
        <div className="space-y-3">
          {[
            { key: 'original', label: 'Dữ liệu gốc', color: '#1f2937' },
            { key: 'trend', label: 'Xu hướng (Trend)', color: '#4f46e5' },
            { key: 'seasonal', label: 'Mùa vụ (Seasonal)', color: '#059669' },
            { key: 'residual', label: 'Phần dư (Residual)', color: '#f59e0b' },
          ].map(({ key, label, color }) => (
            <div key={key}>
              <p className="text-xs text-gray-500 mb-1 font-medium">{label}</p>
              <ResponsiveContainer width="100%" height={80}>
                <LineChart data={decomposition} margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                  <XAxis dataKey="date" hide />
                  <YAxis fontSize={9} stroke="#9ca3af" width={45} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} formatter={(v: unknown) => [typeof v === 'number' ? v.toFixed(1) : '—', label]} />
                  {key === 'residual' && <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="4 4" />}
                  <Line type="monotone" dataKey={key} stroke={color} strokeWidth={1.5} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Bước 5: Tiền xử lý ── */}
      <Section title="Bước 5 — Quy trình tiền xử lý dữ liệu" tooltip="Các bước biến đổi dữ liệu thô thành định dạng sẵn sàng cho huấn luyện mô hình">
        <div className="flex items-start gap-2 overflow-x-auto pb-2">
          {preprocessing_steps.map((step, idx) => (
            <div key={step.step} className="flex items-start gap-2 shrink-0">
              <div className="w-52">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    <span className="text-xs font-semibold text-blue-800">{step.name}</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{step.description}</p>
                  <div className="mt-2 flex justify-between text-xs">
                    <span className="text-gray-400">Vào: <strong>{step.rows_in.toLocaleString()}</strong></span>
                    <span className="text-blue-600">Ra: <strong>{step.rows_out.toLocaleString()}</strong></span>
                  </div>
                </div>
              </div>
              {idx < preprocessing_steps.length - 1 && (
                <ArrowRight className="w-5 h-5 text-gray-400 mt-4 shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Chuẩn hóa min-max */}
        <SectionTitle tooltip="Trực quan hoá tác động của chuẩn hóa Min-Max — LSTM cần dữ liệu trong khoảng [0, 1] để học hiệu quả">
          Trước và sau chuẩn hóa Min-Max (120 ngày gần nhất)
        </SectionTitle>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={scale_preview} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="date" fontSize={10} stroke="#9ca3af" interval="preserveStartEnd" />
            <YAxis yAxisId="left" fontSize={10} stroke="#9ca3af" width={55} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
            <YAxis yAxisId="right" orientation="right" fontSize={10} stroke="#9ca3af" width={35} domain={[0, 1]} tickFormatter={(v) => v.toFixed(1)} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line yAxisId="left" type="monotone" dataKey="original" name="Dữ liệu gốc" stroke="#1f2937" strokeWidth={1.5} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="scaled" name="Đã chuẩn hóa [0,1]" stroke="#4f46e5" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Section>
    </div>
  );
};
