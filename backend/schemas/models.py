from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal


TARGET_COLUMN = Literal["quantity", "sales", "profit"]
MODEL_ARCH = Literal["LSTM", "GRU", "BiLSTM"]


class ProphetConfig(BaseModel):
    # Dữ liệu
    target_column: TARGET_COLUMN = Field(default="quantity")
    aggregation: str = Field(default="D", pattern="^(D|W)$")
    periods: int = Field(default=30, ge=1, le=365)

    # Xu hướng
    changepoint_prior_scale: float = Field(default=0.05, ge=0.001, le=0.5)
    n_changepoints: int = Field(default=25, ge=5, le=100)
    changepoint_range: float = Field(default=0.8, ge=0.1, le=1.0)

    # Mùa vụ
    seasonality_mode: str = Field(default="additive", pattern="^(additive|multiplicative)$")
    daily_seasonality: bool = Field(default=False)
    yearly_seasonality: bool = Field(default=True)
    weekly_seasonality: bool = Field(default=True)
    seasonality_prior_scale: float = Field(default=10.0, ge=0.1, le=100.0)

    # Khoảng tin cậy
    interval_width: float = Field(default=0.8, ge=0.5, le=0.99)
    uncertainty_samples: int = Field(default=1000, ge=100, le=5000)


class LSTMConfig(BaseModel):
    # Dữ liệu
    target_column: TARGET_COLUMN = Field(default="quantity")
    aggregation: str = Field(default="D", pattern="^(D|W)$")
    periods: int = Field(default=30, ge=1, le=365)

    # Chuỗi thời gian
    look_back: int = Field(default=10, ge=1, le=60)

    # Huấn luyện
    epochs: int = Field(default=20, ge=1, le=200)
    batch_size: int = Field(default=32, ge=1, le=512)
    learning_rate: float = Field(default=0.001, ge=0.0001, le=0.1)
    validation_split: float = Field(default=0.1, ge=0.0, le=0.3)
    early_stopping: bool = Field(default=True)
    patience: int = Field(default=10, ge=1, le=50)
    min_delta: float = Field(default=0.0001, ge=0.0, le=1.0)
    shuffle: bool = Field(default=False)

    # Kiến trúc mô hình
    model_arch: MODEL_ARCH = Field(default="LSTM")
    num_layers: int = Field(default=1, ge=1, le=4)
    units: int = Field(default=50, ge=16, le=256)
    dropout: float = Field(default=0.0, ge=0.0, le=0.5)


class DataPoint(BaseModel):
    date: str
    actual: Optional[float] = None
    predicted: Optional[float] = None
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None


class Metrics(BaseModel):
    mae: float
    rmse: float
    mape: float


class TrainingHistoryPoint(BaseModel):
    epoch: int
    loss: float
    val_loss: Optional[float] = None


class ProphetComponent(BaseModel):
    date: str
    trend: float
    weekly: Optional[float] = None
    yearly: Optional[float] = None


class TrainingPreprocessingSummary(BaseModel):
    target_column: str
    source_column: str
    aggregation: str
    rows_original: int
    rows_after_dropna: int
    rows_after_resample: int
    rows_after_trim: int
    invalid_dates: int
    missing_targets: int
    trimmed_leading_zero_rows: int
    trimmed_trailing_zero_rows: int
    start_date: str
    end_date: str
    normalized_for_model: bool = False
    normalization_method: Optional[str] = None
    normalized_range: Optional[List[float]] = None
    original_min: Optional[float] = None
    original_max: Optional[float] = None


class BacktestFold(BaseModel):
    label: str
    start_date: str
    end_date: str
    point_count: int
    mae: float
    rmse: float
    mape: float


class HorizonMetric(BaseModel):
    horizon: int
    point_count: int
    mae: float
    rmse: float
    mape: float


class BacktestPreviewPoint(BaseModel):
    fold: str
    date: str
    actual: float
    predicted: float
    step: int


class BacktestSummary(BaseModel):
    method: str
    description: str
    folds: List[BacktestFold]
    horizon_metrics: List[HorizonMetric]
    preview_points: List[BacktestPreviewPoint]


class ErrorHistogramBin(BaseModel):
    label: str
    bin_start: float
    bin_end: float
    count: int


class ErrorScatterPoint(BaseModel):
    date: str
    predicted: float
    actual: float
    residual: float
    abs_error: float


class RollingErrorPoint(BaseModel):
    date: str
    value: float


class ErrorAnalysisSummary(BaseModel):
    mean_residual: float
    std_residual: float
    max_abs_error: float
    p90_abs_error: float
    positive_residual_ratio: float
    negative_residual_ratio: float
    rolling_window: int
    sample_size: int


class ErrorAnalysis(BaseModel):
    summary: ErrorAnalysisSummary
    histogram: List[ErrorHistogramBin]
    scatter: List[ErrorScatterPoint]
    rolling_mae: List[RollingErrorPoint]


class SplitSegment(BaseModel):
    label: str
    role: str
    count: int
    start_date: str
    end_date: str


class SplitSummary(BaseModel):
    mode: str
    description: str
    segments: List[SplitSegment]
    look_back: Optional[int] = None
    validation_split: Optional[float] = None
    total_points: int
    sequence_count: Optional[int] = None
    train_count: Optional[int] = None
    validation_count: Optional[int] = None


class TrainingResponse(BaseModel):
    metrics: Metrics
    data: List[DataPoint]
    training_history: Optional[List[TrainingHistoryPoint]] = None
    prophet_components: Optional[List[ProphetComponent]] = None
    backtest: Optional[BacktestSummary] = None
    error_analysis: Optional[ErrorAnalysis] = None
    split_summary: Optional[SplitSummary] = None
    model_type: str = "unknown"
    target_column: str = "quantity"
    preprocessing_summary: Optional[TrainingPreprocessingSummary] = None
    training_config: Optional[Dict[str, Any]] = None
    run_id: Optional[str] = None
    model_version: Optional[str] = None
    created_at: Optional[str] = None
    artifact_dir: Optional[str] = None
