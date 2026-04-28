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


class TrainingResponse(BaseModel):
    metrics: Metrics
    data: List[DataPoint]
    training_history: Optional[List[TrainingHistoryPoint]] = None
    prophet_components: Optional[List[ProphetComponent]] = None
    model_type: str = "unknown"
    target_column: str = "quantity"
