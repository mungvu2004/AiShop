import { create } from 'zustand';

export interface DataPoint {
  date: string;
  actual: number | null;
  predicted: number | null;
  lower_bound: number | null;
  upper_bound: number | null;
}

export interface Metrics {
  mae: number;
  rmse: number;
  mape: number;
}

export interface TrainingHistoryPoint {
  epoch: number;
  loss: number;
  val_loss?: number;
}

export interface ProphetComponent {
  date: string;
  trend: number;
  weekly: number | null;
  yearly: number | null;
}

export interface TrainingPreprocessingSummary {
  target_column: string;
  source_column: string;
  aggregation: string;
  rows_original: number;
  rows_after_dropna: number;
  rows_after_resample: number;
  rows_after_trim: number;
  invalid_dates: number;
  missing_targets: number;
  trimmed_leading_zero_rows: number;
  trimmed_trailing_zero_rows: number;
  start_date: string;
  end_date: string;
  normalized_for_model: boolean;
  normalization_method?: string | null;
  normalized_range?: number[] | null;
  original_min?: number | null;
  original_max?: number | null;
}

export interface BacktestFold {
  label: string;
  start_date: string;
  end_date: string;
  point_count: number;
  mae: number;
  rmse: number;
  mape: number;
}

export interface HorizonMetric {
  horizon: number;
  point_count: number;
  mae: number;
  rmse: number;
  mape: number;
}

export interface BacktestPreviewPoint {
  fold: string;
  date: string;
  actual: number;
  predicted: number;
  step: number;
}

export interface BacktestSummary {
  method: string;
  description: string;
  folds: BacktestFold[];
  horizon_metrics: HorizonMetric[];
  preview_points: BacktestPreviewPoint[];
}

export interface ErrorHistogramBin {
  label: string;
  bin_start: number;
  bin_end: number;
  count: number;
}

export interface ErrorScatterPoint {
  date: string;
  predicted: number;
  actual: number;
  residual: number;
  abs_error: number;
}

export interface RollingErrorPoint {
  date: string;
  value: number;
}

export interface ErrorAnalysis {
  summary: {
    mean_residual: number;
    std_residual: number;
    max_abs_error: number;
    p90_abs_error: number;
    positive_residual_ratio: number;
    negative_residual_ratio: number;
    rolling_window: number;
    sample_size: number;
  };
  histogram: ErrorHistogramBin[];
  scatter: ErrorScatterPoint[];
  rolling_mae: RollingErrorPoint[];
}

export interface SplitSegment {
  label: string;
  role: string;
  count: number;
  start_date: string;
  end_date: string;
}

export interface SplitSummary {
  mode: string;
  description: string;
  segments: SplitSegment[];
  look_back?: number | null;
  validation_split?: number | null;
  total_points: number;
  sequence_count?: number | null;
  train_count?: number | null;
  validation_count?: number | null;
}

export interface TrainingStatusEvent {
  phase: string;
  message: string;
  progress: number;
  timestamp: string;
}

export interface DataStats {
  total_records: number;
  clean_records: number;
  date_start: string;
  date_end: string;
  total_days: number;
  total_weeks: number;
  missing_ratio: number;
  mean_daily: number;
  std_daily: number;
  min_daily: number;
  max_daily: number;
  total_quantity: number;
}

export interface PreprocessingStep {
  step: number;
  name: string;
  description: string;
  rows_in: number;
  rows_out: number;
}

export interface DataInfo {
  stats: DataStats;
  time_series: { date: string; value: number }[];
  time_series_full: { date: string; value: number }[];
  distribution: { range: string; count: number }[];
  rolling: { date: string; raw: number; ma7: number; ma30: number }[];
  monthly: { month: string; value: number }[];
  weekday: { day: string; avg: number }[];
  yoy: { year: number; month: number; value: number }[];
  acf: { lag: number; acf: number }[];
  significance: number;
  decomposition: { date: string; original: number; trend: number; seasonal: number; residual: number }[];
  categories: { name: string; value: number }[];
  markets: { name: string; value: number }[];
  multi_target: { date: string; quantity: number; sales?: number; profit?: number }[];
  scale_preview: { date: string; original: number; scaled: number }[];
  preprocessing_steps: PreprocessingStep[];
}

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export type ActiveTab = 'dashboard' | 'data' | 'training' | 'inference';
export type TargetColumn = 'quantity' | 'sales' | 'profit';
export type ModelArch = 'LSTM' | 'GRU' | 'BiLSTM';

interface AppState {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;

  modelType: 'Prophet' | 'LSTM';
  setModelType: (type: 'Prophet' | 'LSTM') => void;

  isTraining: boolean;
  setIsTraining: (status: boolean) => void;

  progress: number;
  setProgress: (prog: number) => void;

  metrics: Metrics | null;
  setMetrics: (metrics: Metrics) => void;

  chartData: DataPoint[];
  setChartData: (data: DataPoint[]) => void;

  trainingHistory: TrainingHistoryPoint[];
  setTrainingHistory: (history: TrainingHistoryPoint[]) => void;
  addTrainingEpoch: (point: TrainingHistoryPoint) => void;
  clearTrainingHistory: () => void;

  prophetComponents: ProphetComponent[] | null;
  setProphetComponents: (c: ProphetComponent[] | null) => void;

  trainingPreprocessingSummary: TrainingPreprocessingSummary | null;
  setTrainingPreprocessingSummary: (summary: TrainingPreprocessingSummary | null) => void;

  trainingConfigSnapshot: Record<string, unknown> | null;
  setTrainingConfigSnapshot: (snapshot: Record<string, unknown> | null) => void;

  trainedRunId: string | null;
  setTrainedRunId: (id: string | null) => void;

  trainedModelVersion: string | null;
  setTrainedModelVersion: (version: string | null) => void;

  trainedArtifactDir: string | null;
  setTrainedArtifactDir: (dir: string | null) => void;

  trainedModelType: string | null;
  setTrainedModelType: (t: string | null) => void;

  trainedTargetColumn: TargetColumn | null;
  setTrainedTargetColumn: (t: TargetColumn | null) => void;

  backtest: BacktestSummary | null;
  setBacktest: (payload: BacktestSummary | null) => void;

  errorAnalysis: ErrorAnalysis | null;
  setErrorAnalysis: (payload: ErrorAnalysis | null) => void;

  splitSummary: SplitSummary | null;
  setSplitSummary: (payload: SplitSummary | null) => void;

  trainingPhase: string | null;
  trainingStatusText: string | null;
  trainingStatusEvents: TrainingStatusEvent[];
  setTrainingStatus: (phase: string | null, message: string | null, progress: number) => void;
  addTrainingStatusEvent: (event: TrainingStatusEvent) => void;
  clearTrainingStatus: () => void;

  dataInfo: DataInfo | null;
  setDataInfo: (info: DataInfo) => void;
  isLoadingData: boolean;
  setIsLoadingData: (v: boolean) => void;

  toasts: Toast[];
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: number) => void;

  prophetConfig: {
    target_column: TargetColumn;
    changepoint_prior_scale: number;
    seasonality_mode: string;
    aggregation: string;
    periods: number;
    n_changepoints: number;
    changepoint_range: number;
    daily_seasonality: boolean;
    yearly_seasonality: boolean;
    weekly_seasonality: boolean;
    seasonality_prior_scale: number;
    interval_width: number;
    uncertainty_samples: number;
  };
  setProphetConfig: (config: Partial<AppState['prophetConfig']>) => void;

  lstmConfig: {
    target_column: TargetColumn;
    look_back: number;
    epochs: number;
    batch_size: number;
    learning_rate: number;
    aggregation: string;
    periods: number;
    early_stopping: boolean;
    patience: number;
    min_delta: number;
    shuffle: boolean;
    num_layers: number;
    units: number;
    dropout: number;
    validation_split: number;
    model_arch: ModelArch;
  };
  setLstmConfig: (config: Partial<AppState['lstmConfig']>) => void;
}

let _toastId = 0;

export const useStore = create<AppState>((set) => ({
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),

  modelType: 'Prophet',
  setModelType: (type) => set({ modelType: type }),

  isTraining: false,
  setIsTraining: (status) => set({ isTraining: status }),

  progress: 0,
  setProgress: (prog) => set({ progress: prog }),

  metrics: null,
  setMetrics: (metrics) => set({ metrics }),

  chartData: [],
  setChartData: (data) => set({ chartData: data }),

  trainingHistory: [],
  setTrainingHistory: (history) => set({ trainingHistory: history }),
  addTrainingEpoch: (point) =>
    set((state) => ({ trainingHistory: [...state.trainingHistory, point] })),
  clearTrainingHistory: () => set({ trainingHistory: [] }),

  prophetComponents: null,
  setProphetComponents: (c) => set({ prophetComponents: c }),

  trainingPreprocessingSummary: null,
  setTrainingPreprocessingSummary: (summary) => set({ trainingPreprocessingSummary: summary }),

  trainingConfigSnapshot: null,
  setTrainingConfigSnapshot: (snapshot) => set({ trainingConfigSnapshot: snapshot }),

  trainedRunId: null,
  setTrainedRunId: (id) => set({ trainedRunId: id }),

  trainedModelVersion: null,
  setTrainedModelVersion: (version) => set({ trainedModelVersion: version }),

  trainedArtifactDir: null,
  setTrainedArtifactDir: (dir) => set({ trainedArtifactDir: dir }),

  trainedModelType: null,
  setTrainedModelType: (t) => set({ trainedModelType: t }),

  trainedTargetColumn: null,
  setTrainedTargetColumn: (t) => set({ trainedTargetColumn: t }),

  backtest: null,
  setBacktest: (payload) => set({ backtest: payload }),

  errorAnalysis: null,
  setErrorAnalysis: (payload) => set({ errorAnalysis: payload }),

  splitSummary: null,
  setSplitSummary: (payload) => set({ splitSummary: payload }),

  trainingPhase: null,
  trainingStatusText: null,
  trainingStatusEvents: [],
  setTrainingStatus: (phase, message, progress) =>
    set({
      trainingPhase: phase,
      trainingStatusText: message,
      progress,
    }),
  addTrainingStatusEvent: (event) =>
    set((state) => ({
      trainingStatusEvents: [...state.trainingStatusEvents.slice(-39), event],
    })),
  clearTrainingStatus: () =>
    set({
      trainingPhase: null,
      trainingStatusText: null,
      trainingStatusEvents: [],
    }),

  dataInfo: null,
  setDataInfo: (info) => set({ dataInfo: info }),
  isLoadingData: false,
  setIsLoadingData: (v) => set({ isLoadingData: v }),

  toasts: [],
  addToast: (message, type = 'info') => {
    const id = ++_toastId;
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 5000);
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  prophetConfig: {
    target_column: 'quantity',
    changepoint_prior_scale: 0.05,
    seasonality_mode: 'additive',
    aggregation: 'D',
    periods: 30,
    n_changepoints: 25,
    changepoint_range: 0.8,
    daily_seasonality: false,
    yearly_seasonality: true,
    weekly_seasonality: true,
    seasonality_prior_scale: 10.0,
    interval_width: 0.8,
    uncertainty_samples: 1000,
  },
  setProphetConfig: (config) =>
    set((state) => ({ prophetConfig: { ...state.prophetConfig, ...config } })),

  lstmConfig: {
    target_column: 'quantity',
    look_back: 10,
    epochs: 20,
    batch_size: 32,
    learning_rate: 0.001,
    aggregation: 'D',
    periods: 30,
    early_stopping: true,
    patience: 10,
    min_delta: 0.0001,
    shuffle: false,
    num_layers: 1,
    units: 50,
    dropout: 0.0,
    validation_split: 0.1,
    model_arch: 'LSTM',
  },
  setLstmConfig: (config) =>
    set((state) => ({ lstmConfig: { ...state.lstmConfig, ...config } })),
}));
