import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import {
  Play, Loader2, Settings2, TrendingDown, BarChart2, BrainCircuit, Radar, Send, Layers3,
} from 'lucide-react';
import { HelpTooltip } from '../HelpTooltip';
import { useStore } from '../../store/useStore';
import type { ModelArch, TargetColumn } from '../../store/useStore';

const inputCls =
  'w-full bg-white/65 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const sectionCardCls = 'rounded-2xl border border-white/50 bg-white/55 backdrop-blur-sm p-5 shadow-sm';

const targetOptions: { value: TargetColumn; label: string; desc: string }[] = [
  { value: 'quantity', label: 'Số lượng', desc: 'Dự báo nhu cầu đơn vị hàng hóa.' },
  { value: 'sales', label: 'Doanh thu', desc: 'Phù hợp khi theo dõi giá trị bán hàng.' },
  { value: 'profit', label: 'Lợi nhuận', desc: 'Phù hợp khi ưu tiên biên lợi nhuận.' },
];

const aggregationOptions = [
  { value: 'D', label: 'Theo ngày', desc: 'Chi tiết hơn, nhạy với biến động ngắn hạn.' },
  { value: 'W', label: 'Theo tuần', desc: 'Mượt hơn, phù hợp cho quy hoạch trung hạn.' },
] as const;

const modelCards = [
  {
    value: 'Prophet',
    label: 'Prophet',
    desc: 'Mạnh ở xu hướng và mùa vụ, có khoảng tin cậy, dễ giải thích.',
    bullets: 'Xu hướng + mùa vụ + bất định',
  },
  {
    value: 'LSTM',
    label: 'LSTM / GRU / BiLSTM',
    desc: 'Mạnh khi cần học pattern phi tuyến từ chuỗi, nhiều siêu tham số hơn.',
    bullets: 'Kiến trúc sâu + look_back + val_loss',
  },
] as const;

const modelArchOptions: { value: ModelArch; label: string; desc: string }[] = [
  { value: 'LSTM', label: 'LSTM', desc: 'Mặc định ổn định, phù hợp đa số bài toán chuỗi.' },
  { value: 'GRU', label: 'GRU', desc: 'Nhẹ hơn LSTM, train nhanh hơn trên CPU.' },
  { value: 'BiLSTM', label: 'BiLSTM', desc: 'Nhiều ngữ cảnh hơn nhưng chi phí cao hơn.' },
];

const seasonalityOptions = [
  { value: 'additive', label: 'Additive', desc: 'Biên độ mùa vụ gần như ổn định theo thời gian.' },
  { value: 'multiplicative', label: 'Multiplicative', desc: 'Biên độ mùa vụ tăng/giảm theo mức nền.' },
] as const;

const toErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.detail ?? error.message;
  }
  return error instanceof Error ? error.message : 'Lỗi không xác định';
};

const PanelSection = ({
  icon,
  title,
  tooltip,
  subtitle,
  children,
}: {
  icon: ReactNode;
  title: string;
  tooltip: string;
  subtitle: string;
  children: ReactNode;
}) => (
  <section className={sectionCardCls}>
    <div className="flex items-start gap-3 mb-4">
      <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1">
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
          <HelpTooltip text={tooltip} />
        </div>
        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
      </div>
    </div>
    <div className="space-y-4">{children}</div>
  </section>
);

const Field = ({
  label,
  tooltip,
  hint,
  children,
}: {
  label: string;
  tooltip: string;
  hint?: string;
  children: ReactNode;
}) => (
  <div>
    <div className="flex items-center gap-1 mb-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <HelpTooltip text={tooltip} />
    </div>
    {children}
    {hint && <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{hint}</p>}
  </div>
);

const ChoiceCards = <T extends string>({
  value,
  options,
  onChange,
  disabled,
  columns = 3,
}: {
  value: T;
  options: readonly { value: T; label: string; desc: string }[];
  onChange: (value: T) => void;
  disabled: boolean;
  columns?: 2 | 3;
}) => (
  <div className={`grid gap-3 ${columns === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
    {options.map((option) => {
      const active = option.value === value;
      return (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          disabled={disabled}
          className={`rounded-2xl border px-4 py-3 text-left transition-all disabled:opacity-50 ${
            active
              ? 'border-blue-300 bg-blue-50 shadow-sm'
              : 'border-gray-200 bg-white/65 hover:border-blue-200 hover:bg-white'
          }`}
        >
          <div className="text-sm font-semibold text-gray-800">{option.label}</div>
          <div className={`text-xs mt-1 leading-relaxed ${active ? 'text-blue-700' : 'text-gray-500'}`}>
            {option.desc}
          </div>
        </button>
      );
    })}
  </div>
);

const BooleanChoice = ({
  checked,
  label,
  tooltip,
  onChange,
  disabled,
}: {
  checked: boolean;
  label: string;
  tooltip: string;
  onChange: (value: boolean) => void;
  disabled: boolean;
}) => (
  <div className="rounded-2xl border border-gray-200 bg-white/65 p-4">
    <div className="flex items-center gap-1 mb-2">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <HelpTooltip text={tooltip} />
    </div>
    <div className="flex gap-2">
      {[
        { value: true, label: 'Bật' },
        { value: false, label: 'Tắt' },
      ].map((option) => (
        <button
          key={String(option.value)}
          type="button"
          onClick={() => onChange(option.value)}
          disabled={disabled}
          className={`flex-1 rounded-xl border px-3 py-2 text-sm transition-colors disabled:opacity-50 ${
            checked === option.value
              ? 'border-blue-300 bg-blue-50 text-blue-700'
              : 'border-gray-200 bg-white text-gray-500'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  </div>
);

const SummaryCard = ({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) => (
  <div className="rounded-2xl border border-gray-200 bg-white/70 p-4">
    <div className="text-[11px] uppercase tracking-[0.14em] text-gray-400">{label}</div>
    <div className="text-lg font-semibold text-gray-800 mt-1">{value}</div>
    <div className="text-xs text-gray-500 mt-1">{helper}</div>
  </div>
);

const ParameterPreview = ({
  title,
  entries,
}: {
  title: string;
  entries: { key: string; label: string; value: string; note: string }[];
}) => (
  <div className="rounded-2xl border border-gray-200 bg-white/70 p-4">
    <div className="flex items-center gap-2 mb-3">
      <Send className="w-4 h-4 text-indigo-500" />
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
    </div>
    <div className="space-y-2">
      {entries.map((entry) => (
        <div key={entry.key} className="rounded-xl border border-gray-100 bg-white/70 px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-gray-500">{entry.label}</span>
            <code className="text-xs text-gray-800 bg-gray-100 rounded px-2 py-0.5">{entry.value}</code>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">{entry.note}</p>
        </div>
      ))}
    </div>
  </div>
);

const JsonPreview = ({ payload }: { payload: object }) => (
  <div className="rounded-2xl border border-gray-200 bg-gray-950 p-4">
    <div className="flex items-center gap-2 mb-3 text-white/90">
      <Layers3 className="w-4 h-4 text-cyan-300" />
      <h3 className="text-sm font-semibold">Payload gửi xuống backend</h3>
    </div>
    <pre className="text-xs leading-relaxed text-cyan-100 overflow-x-auto whitespace-pre-wrap">
      {JSON.stringify(payload, null, 2)}
    </pre>
  </div>
);

export const TrainingTab = () => {
  const {
    modelType, setModelType,
    prophetConfig, setProphetConfig,
    lstmConfig, setLstmConfig,
    isTraining, setIsTraining,
    progress, setProgress,
    trainingHistory, clearTrainingHistory, setTrainingHistory,
    prophetComponents,
    setMetrics, setChartData,
    setProphetComponents, setTrainedModelType, setTrainedTargetColumn,
    addToast,
  } = useStore();

  const [logs, setLogs] = useState<string[]>([]);

  const log = (msg: string) =>
    setLogs((prev) => [`[${new Date().toLocaleTimeString('vi-VN')}] ${msg}`, ...prev.slice(0, 119)]);

  const handleTrain = async () => {
    clearTrainingHistory();
    setProgress(0);
    setLogs([]);
    setIsTraining(true);
    setProphetComponents(null);

    const endpoint = modelType === 'Prophet' ? '/train/prophet' : '/train/lstm';
    const payload = modelType === 'Prophet' ? prophetConfig : lstmConfig;
    log(`Bắt đầu huấn luyện mô hình ${modelType} cho mục tiêu ${payload.target_column}.`);

    try {
      log(`Gửi yêu cầu đến ${endpoint}.`);
      const res = await axios.post(`http://localhost:8000${endpoint}`, payload, {
        timeout: 600_000,
      });

      setMetrics(res.data.metrics);
      setChartData(res.data.data);
      setTrainedModelType(res.data.model_type ?? modelType);
      setTrainedTargetColumn(res.data.target_column ?? payload.target_column);
      setTrainingHistory(res.data.training_history ?? []);
      setProphetComponents(res.data.prophet_components ?? null);

      const { mae, rmse, mape } = res.data.metrics;
      log(`Hoàn tất. MAE=${mae.toFixed(2)}, RMSE=${rmse.toFixed(2)}, MAPE=${mape.toFixed(2)}%.`);
      addToast(
        `Huấn luyện ${res.data.model_type ?? modelType} thành công. MAE=${mae.toFixed(2)}, MAPE=${mape.toFixed(2)}%.`,
        'success'
      );
    } catch (error: unknown) {
      const msg = toErrorMessage(error);
      log(`LỖI: ${msg}`);
      addToast(`Huấn luyện thất bại: ${msg}`, 'error');
    } finally {
      setIsTraining(false);
    }
  };

  const latestPoint = trainingHistory.at(-1);
  const hasValidationCurve = trainingHistory.some((point) => point.val_loss !== undefined);
  const activePayload = modelType === 'Prophet' ? prophetConfig : lstmConfig;

  const summaryCards = useMemo(() => {
    if (modelType === 'Prophet') {
      return [
        { label: 'Mô hình', value: 'Prophet', helper: 'Tập trung vào xu hướng và mùa vụ' },
        { label: 'Mục tiêu', value: targetOptions.find((item) => item.value === prophetConfig.target_column)?.label ?? prophetConfig.target_column, helper: 'Biến sẽ được dự báo' },
        { label: 'Tổng hợp', value: aggregationOptions.find((item) => item.value === prophetConfig.aggregation)?.label ?? prophetConfig.aggregation, helper: 'Hạt thời gian đầu vào' },
        { label: 'Kỳ tương lai', value: `${prophetConfig.periods}`, helper: 'Số bước dự báo phía trước' },
      ];
    }

    return [
      { label: 'Mô hình', value: lstmConfig.model_arch, helper: 'Kiến trúc recurrent đang chọn' },
      { label: 'Mục tiêu', value: targetOptions.find((item) => item.value === lstmConfig.target_column)?.label ?? lstmConfig.target_column, helper: 'Biến sẽ được dự báo' },
      { label: 'Look back', value: `${lstmConfig.look_back}`, helper: 'Số bước thời gian dùng để học' },
      { label: 'Epoch / Batch', value: `${lstmConfig.epochs} / ${lstmConfig.batch_size}`, helper: 'Tốc độ và độ sâu huấn luyện' },
    ];
  }, [modelType, prophetConfig, lstmConfig]);

  const parameterEntries = useMemo(() => {
    if (modelType === 'Prophet') {
      return [
        { key: 'target_column', label: 'Biến mục tiêu', value: String(prophetConfig.target_column), note: 'Biến đầu ra mà Prophet sẽ fit và dự báo.' },
        { key: 'aggregation', label: 'Mức tổng hợp', value: String(prophetConfig.aggregation), note: 'Dữ liệu được tổng hợp theo ngày hoặc tuần trước khi fit.' },
        { key: 'periods', label: 'Số kỳ tương lai', value: String(prophetConfig.periods), note: 'Số bước thời gian được sinh ra ngoài tập lịch sử.' },
        { key: 'changepoint_prior_scale', label: 'Changepoint prior scale', value: String(prophetConfig.changepoint_prior_scale), note: 'Điều khiển độ linh hoạt của trend.' },
        { key: 'n_changepoints', label: 'Số changepoint', value: String(prophetConfig.n_changepoints), note: 'Số điểm tiềm năng mà trend có thể đổi hướng.' },
        { key: 'changepoint_range', label: 'Changepoint range', value: String(prophetConfig.changepoint_range), note: 'Tỷ lệ phần lịch sử được dùng để đặt changepoint.' },
        { key: 'seasonality_mode', label: 'Seasonality mode', value: String(prophetConfig.seasonality_mode), note: 'Cách mùa vụ được cộng hoặc nhân với trend.' },
        { key: 'daily_seasonality', label: 'Mùa vụ ngày', value: prophetConfig.daily_seasonality ? 'true' : 'false', note: 'Bật/tắt thành phần chu kỳ ngày cho dữ liệu chi tiết.' },
        { key: 'yearly_seasonality', label: 'Mùa vụ năm', value: prophetConfig.yearly_seasonality ? 'true' : 'false', note: 'Bật/tắt thành phần chu kỳ năm.' },
        { key: 'weekly_seasonality', label: 'Mùa vụ tuần', value: prophetConfig.weekly_seasonality ? 'true' : 'false', note: 'Bật/tắt thành phần chu kỳ tuần.' },
        { key: 'seasonality_prior_scale', label: 'Seasonality prior scale', value: String(prophetConfig.seasonality_prior_scale), note: 'Độ linh hoạt của thành phần mùa vụ.' },
        { key: 'interval_width', label: 'Độ rộng khoảng tin cậy', value: String(prophetConfig.interval_width), note: 'Xác định bề rộng dải dự báo.' },
        { key: 'uncertainty_samples', label: 'Số mẫu bất định', value: String(prophetConfig.uncertainty_samples), note: 'Ảnh hưởng tới thời gian tính khoảng bất định.' },
      ];
    }

    return [
      { key: 'target_column', label: 'Biến mục tiêu', value: String(lstmConfig.target_column), note: 'Biến đầu ra để mạng recurrent học dự báo.' },
      { key: 'aggregation', label: 'Mức tổng hợp', value: String(lstmConfig.aggregation), note: 'Độ mịn của chuỗi đầu vào trước khi huấn luyện.' },
      { key: 'periods', label: 'Số kỳ tương lai', value: String(lstmConfig.periods), note: 'Số bước autoregressive được sinh ra ở đầu ra.' },
      { key: 'look_back', label: 'Look back', value: String(lstmConfig.look_back), note: 'Độ dài cửa sổ quá khứ dùng cho một dự đoán.' },
      { key: 'epochs', label: 'Epoch', value: String(lstmConfig.epochs), note: 'Số lần quét qua toàn bộ tập train.' },
      { key: 'batch_size', label: 'Batch size', value: String(lstmConfig.batch_size), note: 'Số mẫu mỗi lần cập nhật trọng số.' },
      { key: 'learning_rate', label: 'Learning rate', value: String(lstmConfig.learning_rate), note: 'Tốc độ cập nhật của bộ tối ưu Adam.' },
      { key: 'validation_split', label: 'Validation split', value: String(lstmConfig.validation_split), note: 'Tỷ lệ dữ liệu dành cho `val_loss`.' },
      { key: 'early_stopping', label: 'Early stopping', value: lstmConfig.early_stopping ? 'true' : 'false', note: 'Tự dừng sớm khi `val_loss` không còn cải thiện.' },
      { key: 'patience', label: 'Patience', value: String(lstmConfig.patience), note: 'Số epoch chờ thêm trước khi dừng sớm.' },
      { key: 'min_delta', label: 'Min delta', value: String(lstmConfig.min_delta), note: 'Mức cải thiện tối thiểu để được xem là tốt hơn.' },
      { key: 'shuffle', label: 'Shuffle', value: lstmConfig.shuffle ? 'true' : 'false', note: 'Có xáo batch khi huấn luyện hay không.' },
      { key: 'model_arch', label: 'Kiến trúc', value: String(lstmConfig.model_arch), note: 'LSTM, GRU hoặc BiLSTM.' },
      { key: 'num_layers', label: 'Số tầng', value: String(lstmConfig.num_layers), note: 'Số lớp recurrent được xếp chồng.' },
      { key: 'units', label: 'Units', value: String(lstmConfig.units), note: 'Kích thước hidden state trong mỗi tầng.' },
      { key: 'dropout', label: 'Dropout', value: String(lstmConfig.dropout), note: 'Tỷ lệ regularization giữa các tầng.' },
    ];
  }, [modelType, prophetConfig, lstmConfig]);

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-5">
      <div className="max-w-[1800px] mx-auto space-y-5">
        <div className="glass-panel p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900">Studio huấn luyện mô hình</h2>
              </div>
              <p className="text-sm text-gray-500 mt-2 max-w-3xl">
                Mọi lựa chọn và siêu tham số hiện backend hỗ trợ đều được đưa lên UI. Người dùng có thể nhìn rõ mô hình đang dùng,
                giá trị từng tham số, payload gửi xuống API và đồ thị học theo thời gian thực.
              </p>
            </div>
            <button
              onClick={handleTrain}
              disabled={isTraining}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-2xl flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
            >
              {isTraining ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
              {isTraining ? 'Đang huấn luyện…' : 'Bắt đầu huấn luyện'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <SummaryCard key={card.label} label={card.label} value={card.value} helper={card.helper} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.9fr)]">
          <div className="space-y-5">
            <PanelSection
              icon={<BrainCircuit className="w-5 h-5" />}
              title="Chọn họ mô hình"
              tooltip="Người dùng có thể chuyển giữa Prophet và họ recurrent. Mỗi lựa chọn sẽ mở toàn bộ tham số chuyên biệt của mô hình đó."
              subtitle="Không còn form tối giản. Mỗi mô hình đều được mô tả để người dùng hiểu vì sao nên chọn."
            >
              <div className="grid gap-3 md:grid-cols-2">
                {modelCards.map((card) => {
                  const active = modelType === card.value;
                  return (
                    <button
                      key={card.value}
                      type="button"
                      onClick={() => setModelType(card.value)}
                      disabled={isTraining}
                      className={`rounded-3xl border p-5 text-left transition-all disabled:opacity-50 ${
                        active
                          ? 'border-blue-300 bg-blue-50 shadow-sm'
                          : 'border-gray-200 bg-white/70 hover:border-blue-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-lg font-semibold text-gray-900">{card.label}</span>
                        <span className={`rounded-full px-3 py-1 text-xs ${active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                          {active ? 'Đang chọn' : 'Chưa chọn'}
                        </span>
                      </div>
                      <p className={`text-sm mt-2 leading-relaxed ${active ? 'text-blue-700' : 'text-gray-600'}`}>{card.desc}</p>
                      <p className="text-xs text-gray-400 mt-3">{card.bullets}</p>
                    </button>
                  );
                })}
              </div>
            </PanelSection>

            {modelType === 'Prophet' ? (
              <>
                <PanelSection
                  icon={<Radar className="w-5 h-5" />}
                  title="Dữ liệu và lựa chọn Prophet"
                  tooltip="Hiển thị tất cả lựa chọn đầu vào đang có cho Prophet: biến mục tiêu, mức tổng hợp và phương thức mùa vụ."
                  subtitle="Các lựa chọn dạng thẻ giúp người dùng thấy hết ngay trên màn hình thay vì phải mở dropdown nhiều lần."
                >
                  <Field
                    label="Biến mục tiêu"
                    tooltip="Biến mà Prophet sẽ học và dự báo."
                    hint="Bạn có thể dự báo số lượng, doanh thu hoặc lợi nhuận tùy mục tiêu kinh doanh."
                  >
                    <ChoiceCards
                      value={prophetConfig.target_column}
                      options={targetOptions}
                      onChange={(value) => setProphetConfig({ target_column: value })}
                      disabled={isTraining}
                    />
                  </Field>
                  <Field
                    label="Mức tổng hợp thời gian"
                    tooltip="Dữ liệu đầu vào có thể được gộp theo ngày hoặc theo tuần trước khi fit."
                  >
                    <ChoiceCards
                      value={prophetConfig.aggregation}
                      options={aggregationOptions}
                      onChange={(value) => setProphetConfig({ aggregation: value })}
                      disabled={isTraining}
                      columns={2}
                    />
                  </Field>
                  <Field
                    label="Seasonality mode"
                    tooltip="Additive và multiplicative ảnh hưởng trực tiếp cách mùa vụ tương tác với trend."
                  >
                    <ChoiceCards
                      value={prophetConfig.seasonality_mode as typeof seasonalityOptions[number]['value']}
                      options={seasonalityOptions}
                      onChange={(value) => setProphetConfig({ seasonality_mode: value })}
                      disabled={isTraining}
                      columns={2}
                    />
                  </Field>
                </PanelSection>

                <PanelSection
                  icon={<Settings2 className="w-5 h-5" />}
                  title="Tất cả tham số Prophet"
                  tooltip="Đây là toàn bộ tập tham số Prophet mà backend hiện hỗ trợ. Mỗi ô đều có giải thích và giới hạn sử dụng."
                  subtitle="Người dùng nhìn thấy đầy đủ các tham số về trend, mùa vụ và bất định thay vì chỉ vài trường cơ bản."
                >
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <Field label="Số kỳ dự báo" tooltip="Số bước thời gian được dự báo sau điểm cuối lịch sử." hint="Giới hạn backend: 1-365">
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={prophetConfig.periods}
                        onChange={(e) => setProphetConfig({ periods: Number.parseInt(e.target.value, 10) || 1 })}
                        disabled={isTraining}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Changepoint prior scale" tooltip="Cao hơn = trend linh hoạt hơn, dễ bám sát biến động hơn." hint="Giới hạn backend: 0.001-0.5">
                      <input
                        type="number"
                        step="0.01"
                        min="0.001"
                        max="0.5"
                        value={prophetConfig.changepoint_prior_scale}
                        onChange={(e) => setProphetConfig({ changepoint_prior_scale: Number.parseFloat(e.target.value) || 0.001 })}
                        disabled={isTraining}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Số changepoint" tooltip="Số vị trí Prophet được phép xem xét để đổi độ dốc trend." hint="Giới hạn backend: 5-100">
                      <input
                        type="number"
                        min="5"
                        max="100"
                        value={prophetConfig.n_changepoints}
                        onChange={(e) => setProphetConfig({ n_changepoints: Number.parseInt(e.target.value, 10) || 5 })}
                        disabled={isTraining}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Changepoint range" tooltip="Chỉ phần đầu của chuỗi được dùng để đặt changepoint." hint="Giới hạn backend: 0.1-1.0">
                      <input
                        type="number"
                        step="0.05"
                        min="0.1"
                        max="1"
                        value={prophetConfig.changepoint_range}
                        onChange={(e) => setProphetConfig({ changepoint_range: Number.parseFloat(e.target.value) || 0.1 })}
                        disabled={isTraining}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Seasonality prior scale" tooltip="Độ linh hoạt của thành phần mùa vụ." hint="Giới hạn backend: 0.1-100">
                      <input
                        type="number"
                        step="0.5"
                        min="0.1"
                        max="100"
                        value={prophetConfig.seasonality_prior_scale}
                        onChange={(e) => setProphetConfig({ seasonality_prior_scale: Number.parseFloat(e.target.value) || 0.1 })}
                        disabled={isTraining}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Độ rộng khoảng tin cậy" tooltip="Xác định độ rộng của dải dự báo ở đầu ra." hint="Giới hạn backend: 0.5-0.99">
                      <input
                        type="number"
                        step="0.01"
                        min="0.5"
                        max="0.99"
                        value={prophetConfig.interval_width}
                        onChange={(e) => setProphetConfig({ interval_width: Number.parseFloat(e.target.value) || 0.5 })}
                        disabled={isTraining}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Số mẫu bất định" tooltip="Số lần lấy mẫu dùng để ước lượng khoảng bất định." hint="Giới hạn backend: 100-5000">
                      <input
                        type="number"
                        min="100"
                        max="5000"
                        step="100"
                        value={prophetConfig.uncertainty_samples}
                        onChange={(e) => setProphetConfig({ uncertainty_samples: Number.parseInt(e.target.value, 10) || 100 })}
                        disabled={isTraining}
                        className={inputCls}
                      />
                    </Field>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <BooleanChoice
                      checked={prophetConfig.daily_seasonality}
                      label="Mùa vụ ngày"
                      tooltip="Bật khi chuỗi theo ngày có pattern trong nội bộ tuần/ngày cần Prophet mô hình hóa thêm."
                      onChange={(value) => setProphetConfig({ daily_seasonality: value })}
                      disabled={isTraining}
                    />
                    <BooleanChoice
                      checked={prophetConfig.yearly_seasonality}
                      label="Mùa vụ năm"
                      tooltip="Bật nếu bạn nghi ngờ có tính chu kỳ theo năm."
                      onChange={(value) => setProphetConfig({ yearly_seasonality: value })}
                      disabled={isTraining}
                    />
                    <BooleanChoice
                      checked={prophetConfig.weekly_seasonality}
                      label="Mùa vụ tuần"
                      tooltip="Bật nếu dữ liệu có pattern lặp lại giữa các ngày trong tuần."
                      onChange={(value) => setProphetConfig({ weekly_seasonality: value })}
                      disabled={isTraining}
                    />
                  </div>
                </PanelSection>
              </>
            ) : (
              <>
                <PanelSection
                  icon={<BrainCircuit className="w-5 h-5" />}
                  title="Dữ liệu và kiến trúc recurrent"
                  tooltip="Hiển thị đầy đủ lựa chọn mục tiêu, mức tổng hợp và loại mạng đang dùng cho huấn luyện chuỗi sâu."
                  subtitle="Các phương án LSTM, GRU, BiLSTM được làm rõ bằng thẻ mô tả để người dùng chủ động chọn."
                >
                  <Field label="Biến mục tiêu" tooltip="Biến mà mạng sẽ học để dự báo.">
                    <ChoiceCards
                      value={lstmConfig.target_column}
                      options={targetOptions}
                      onChange={(value) => setLstmConfig({ target_column: value })}
                      disabled={isTraining}
                    />
                  </Field>
                  <Field label="Mức tổng hợp thời gian" tooltip="Độ mịn của chuỗi đầu vào trước khi tạo dataset look_back.">
                    <ChoiceCards
                      value={lstmConfig.aggregation}
                      options={aggregationOptions}
                      onChange={(value) => setLstmConfig({ aggregation: value })}
                      disabled={isTraining}
                      columns={2}
                    />
                  </Field>
                  <Field label="Kiến trúc mạng" tooltip="Backend hiện hỗ trợ 3 loại cell/kiến trúc recurrent.">
                    <ChoiceCards
                      value={lstmConfig.model_arch}
                      options={modelArchOptions}
                      onChange={(value) => setLstmConfig({ model_arch: value })}
                      disabled={isTraining}
                    />
                  </Field>
                </PanelSection>

                <PanelSection
                  icon={<Settings2 className="w-5 h-5" />}
                  title="Tất cả tham số LSTM / GRU / BiLSTM"
                  tooltip="Đây là toàn bộ tham số huấn luyện và kiến trúc mà backend hiện hỗ trợ cho họ recurrent."
                  subtitle="Mọi siêu tham số quan trọng như look_back, validation_split, num_layers, units, dropout đều được đưa ra UI."
                >
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <Field label="Số kỳ dự báo" tooltip="Số bước tương lai được sinh bằng cơ chế autoregressive." hint="Giới hạn backend: 1-365">
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={lstmConfig.periods}
                        onChange={(e) => setLstmConfig({ periods: Number.parseInt(e.target.value, 10) || 1 })}
                        disabled={isTraining}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Look back" tooltip="Độ dài cửa sổ quá khứ mà mô hình nhìn vào cho mỗi dự báo." hint="Giới hạn backend: 1-60">
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={lstmConfig.look_back}
                        onChange={(e) => setLstmConfig({ look_back: Number.parseInt(e.target.value, 10) || 1 })}
                        disabled={isTraining}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Epoch" tooltip="Số vòng quét qua toàn bộ tập train." hint="Giới hạn backend: 1-200">
                      <input
                        type="number"
                        min="1"
                        max="200"
                        value={lstmConfig.epochs}
                        onChange={(e) => setLstmConfig({ epochs: Number.parseInt(e.target.value, 10) || 1 })}
                        disabled={isTraining}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Batch size" tooltip="Số mẫu xử lý trước mỗi lần cập nhật trọng số." hint="Giới hạn backend: 1-512">
                      <input
                        type="number"
                        min="1"
                        max="512"
                        value={lstmConfig.batch_size}
                        onChange={(e) => setLstmConfig({ batch_size: Number.parseInt(e.target.value, 10) || 1 })}
                        disabled={isTraining}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Learning rate" tooltip="Tốc độ cập nhật của Adam. Quá cao có thể gây dao động." hint="Giới hạn backend: 0.0001-0.1">
                      <input
                        type="number"
                        step="0.0001"
                        min="0.0001"
                        max="0.1"
                        value={lstmConfig.learning_rate}
                        onChange={(e) => setLstmConfig({ learning_rate: Number.parseFloat(e.target.value) || 0.0001 })}
                        disabled={isTraining}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Validation split" tooltip="Tỷ lệ dữ liệu dùng để tính `val_loss` trong lúc train." hint="Giới hạn backend: 0.0-0.3">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="0.3"
                        value={lstmConfig.validation_split}
                        onChange={(e) => setLstmConfig({ validation_split: Number.parseFloat(e.target.value) || 0 })}
                        disabled={isTraining}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Patience" tooltip="Số epoch chờ thêm trước khi early stopping kích hoạt." hint="Giới hạn backend: 1-50">
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={lstmConfig.patience}
                        onChange={(e) => setLstmConfig({ patience: Number.parseInt(e.target.value, 10) || 1 })}
                        disabled={isTraining || !lstmConfig.early_stopping}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Min delta" tooltip="Mức cải thiện tối thiểu của `val_loss` để tiếp tục train." hint="Giới hạn backend: 0.0-1.0">
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        max="1"
                        value={lstmConfig.min_delta}
                        onChange={(e) => setLstmConfig({ min_delta: Number.parseFloat(e.target.value) || 0 })}
                        disabled={isTraining || !lstmConfig.early_stopping}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Số tầng recurrent" tooltip="Số lớp recurrent được xếp chồng." hint="Giới hạn backend: 1-4">
                      <input
                        type="number"
                        min="1"
                        max="4"
                        value={lstmConfig.num_layers}
                        onChange={(e) => setLstmConfig({ num_layers: Number.parseInt(e.target.value, 10) || 1 })}
                        disabled={isTraining}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Units mỗi tầng" tooltip="Số neuron ẩn trong mỗi lớp recurrent." hint="Giới hạn backend: 16-256">
                      <input
                        type="number"
                        min="16"
                        max="256"
                        step="16"
                        value={lstmConfig.units}
                        onChange={(e) => setLstmConfig({ units: Number.parseInt(e.target.value, 10) || 16 })}
                        disabled={isTraining}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Dropout" tooltip="Regularization nhằm giảm overfitting." hint="Giới hạn backend: 0.0-0.5">
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="0.5"
                        value={lstmConfig.dropout}
                        onChange={(e) => setLstmConfig({ dropout: Number.parseFloat(e.target.value) || 0 })}
                        disabled={isTraining}
                        className={inputCls}
                      />
                    </Field>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <BooleanChoice
                      checked={lstmConfig.early_stopping}
                      label="Early stopping"
                      tooltip="Tự dừng khi `val_loss` không còn cải thiện. Backend yêu cầu validation_split > 0 để dùng lựa chọn này."
                      onChange={(value) => setLstmConfig({ early_stopping: value })}
                      disabled={isTraining}
                    />
                    <BooleanChoice
                      checked={lstmConfig.shuffle}
                      label="Shuffle batch"
                      tooltip="Xáo batch khi train. Với chuỗi thời gian thường nên để tắt để giữ thứ tự."
                      onChange={(value) => setLstmConfig({ shuffle: value })}
                      disabled={isTraining}
                    />
                  </div>
                </PanelSection>
              </>
            )}
          </div>

          <div className="space-y-5">
            <div className="glass-panel p-5">
              <div className="flex items-center gap-2 mb-4">
                <Send className="w-4 h-4 text-indigo-500" />
                <h3 className="text-base font-semibold">Bảng điều khiển cấu hình</h3>
                <HelpTooltip text="Khối này giúp người dùng nhìn rõ từng tham số hiện tại, không cần đoán backend đang nhận gì." />
              </div>
              <ParameterPreview
                title={`Tất cả tham số của ${modelType}`}
                entries={parameterEntries}
              />
              <div className="mt-4">
                <JsonPreview payload={activePayload} />
              </div>
            </div>

            {(isTraining || progress > 0) && (
              <div className="glass-panel p-5">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">
                    {isTraining ? 'Huấn luyện đang chạy…' : 'Huấn luyện hoàn tất'}
                  </span>
                  <span className="text-gray-500">{progress.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {latestPoint && (
                  <p className="text-xs text-gray-400 mt-2">
                    Epoch {latestPoint.epoch} · loss {latestPoint.loss.toFixed(6)}
                    {latestPoint.val_loss !== undefined && ` · val_loss ${latestPoint.val_loss.toFixed(6)}`}
                  </p>
                )}
              </div>
            )}

            {trainingHistory.length > 0 && (
              <div className="glass-panel p-5">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="w-4 h-4 text-blue-500" />
                  <h3 className="text-base font-semibold">Đường cong huấn luyện</h3>
                  <HelpTooltip text="Theo dõi `loss` và `val_loss` theo từng epoch để phát hiện underfit hoặc overfit." />
                </div>
                <p className="text-xs text-gray-400 mb-3">
                  {hasValidationCurve
                    ? 'Loss đi xuống nhưng val_loss tăng lại là dấu hiệu bắt đầu overfit.'
                    : 'Phiên huấn luyện này không có validation split, nên chỉ hiển thị loss.'}
                </p>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={trainingHistory} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="epoch" fontSize={11} stroke="#9ca3af" label={{ value: 'Epoch', position: 'insideBottom', offset: -4, fontSize: 11 }} />
                    <YAxis fontSize={11} stroke="#9ca3af" width={70} tickFormatter={(v) => v.toExponential(1)} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(v: unknown, name: unknown) => [
                        typeof v === 'number' ? v.toFixed(6) : '—',
                        name === 'val_loss' ? 'Val loss' : 'Loss',
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="loss" name="loss" stroke="#4f46e5" fill="url(#lossGrad)" strokeWidth={2} dot={false} />
                    {hasValidationCurve && (
                      <Line type="monotone" dataKey="val_loss" name="val_loss" stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {prophetComponents && prophetComponents.length > 0 && <ProphetComponentsChart />}

            <div className="glass-panel p-5 min-h-[18rem]">
              <div className="flex items-center gap-2 mb-3">
                <BarChart2 className="w-4 h-4 text-gray-500" />
                <h3 className="text-base font-semibold">Nhật ký huấn luyện</h3>
                <HelpTooltip text="Thông tin tiến trình được ghi lại cục bộ trong phiên hiện tại để tiện dò lỗi nhanh." />
              </div>
              <div className="bg-gray-900 rounded-2xl p-4 font-mono text-xs text-green-400 h-64 overflow-y-auto flex flex-col-reverse">
                {logs.length === 0 ? (
                  <span className="text-gray-600">Đang chờ bắt đầu huấn luyện…</span>
                ) : (
                  logs.map((entry, index) => <div key={`${entry}-${index}`}>{entry}</div>)
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProphetComponentsChart = () => {
  const components = useStore((state) => state.prophetComponents)!;
  const sample = components.length > 400 ? components.slice(-400) : components;

  return (
    <div className="glass-panel p-5">
      <div className="flex items-center gap-1 mb-1">
        <h3 className="text-base font-semibold">Thành phần Prophet</h3>
        <HelpTooltip text="Prophet tách chuỗi thành trend, yearly và weekly. Quan sát đồ thị này giúp hiểu mô hình đang giải thích tín hiệu như thế nào." />
      </div>
      <p className="text-xs text-gray-400 mb-3">Đang hiển thị tối đa 400 điểm gần nhất để giữ hiệu năng.</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={sample} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis dataKey="date" fontSize={10} stroke="#9ca3af" interval="preserveStartEnd" />
          <YAxis fontSize={10} stroke="#9ca3af" width={55} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="trend" name="Xu hướng" stroke="#f59e0b" strokeWidth={2} dot={false} />
          {sample[0]?.yearly !== null && (
            <Line type="monotone" dataKey="yearly" name="Chu kỳ năm" stroke="#10b981" strokeWidth={1.5} dot={false} />
          )}
          {sample[0]?.weekly !== null && (
            <Line type="monotone" dataKey="weekly" name="Chu kỳ tuần" stroke="#8b5cf6" strokeWidth={1.5} dot={false} />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
