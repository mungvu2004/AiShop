from prophet import Prophet
import pandas as pd
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error
from backend.api.websockets import manager
from backend.services.evaluation_service import (
    build_prophet_backtest,
    build_prophet_split_summary,
    compute_error_analysis,
)


def mean_absolute_percentage_error(y_true, y_pred):
    y_true, y_pred = np.array(y_true), np.array(y_pred)
    mask = y_true != 0
    if mask.sum() == 0:
        return 0.0
    return np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100


def train_prophet(
    df: pd.DataFrame,
    changepoint_prior_scale: float = 0.05,
    seasonality_mode: str = "additive",
    periods: int = 30,
    freq: str = "D",
    n_changepoints: int = 25,
    changepoint_range: float = 0.8,
    daily_seasonality: bool = False,
    yearly_seasonality: bool = True,
    weekly_seasonality: bool = True,
    seasonality_prior_scale: float = 10.0,
    interval_width: float = 0.8,
    uncertainty_samples: int = 1000,
):
    manager.broadcast_sync({
        "type": "status",
        "progress": 16,
        "phase": "prophet_fit",
        "message": "Đang fit Prophet trên toàn bộ lịch sử đã tiền xử lý.",
    })
    model = Prophet(
        changepoint_prior_scale=changepoint_prior_scale,
        seasonality_mode=seasonality_mode,
        n_changepoints=n_changepoints,
        changepoint_range=changepoint_range,
        daily_seasonality=daily_seasonality,
        yearly_seasonality=yearly_seasonality,
        weekly_seasonality=weekly_seasonality,
        seasonality_prior_scale=seasonality_prior_scale,
        interval_width=interval_width,
        uncertainty_samples=uncertainty_samples,
    )
    model.fit(df)

    # Dự đoán trên tập huấn luyện để tính metrics
    manager.broadcast_sync({
        "type": "status",
        "progress": 54,
        "phase": "prophet_in_sample_eval",
        "message": "Đang tạo dự báo nội suy trên lịch sử để tính metric.",
    })
    forecast_train = model.predict(df)
    y_true = df['y'].values
    y_pred = forecast_train['yhat'].values

    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    mape = mean_absolute_percentage_error(y_true, y_pred)

    # Dự báo tương lai
    manager.broadcast_sync({
        "type": "status",
        "progress": 72,
        "phase": "prophet_future_forecast",
        "message": "Đang sinh các kỳ tương lai và thành phần mùa vụ.",
    })
    future = model.make_future_dataframe(periods=periods, freq=freq)
    forecast = model.predict(future)

    # Ghép với dữ liệu thực
    merged = pd.merge(
        forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']],
        df, on='ds', how='left'
    )

    data_points = []
    for _, row in merged.iterrows():
        data_points.append({
            "date": row['ds'].strftime("%Y-%m-%d"),
            "actual": None if pd.isna(row.get('y')) else float(row['y']),
            "predicted": float(row['yhat']),
            "lower_bound": float(row['yhat_lower']),
            "upper_bound": float(row['yhat_upper']),
        })

    # Trích xuất thành phần
    component_cols = ['ds', 'trend']
    has_weekly = 'weekly' in forecast.columns
    has_yearly = 'yearly' in forecast.columns
    if has_weekly:
        component_cols.append('weekly')
    if has_yearly:
        component_cols.append('yearly')

    prophet_components = []
    for _, row in forecast[component_cols].iterrows():
        prophet_components.append({
            "date": row['ds'].strftime("%Y-%m-%d"),
            "trend": float(row['trend']),
            "weekly": float(row['weekly']) if has_weekly else None,
            "yearly": float(row['yearly']) if has_yearly else None,
        })

    manager.broadcast_sync({
        "type": "status",
        "progress": 86,
        "phase": "prophet_backtest",
        "message": "Đang chạy rolling-origin backtest và phân tích phần dư.",
    })
    backtest = build_prophet_backtest(
        df=df,
        periods=periods,
        freq=freq,
        changepoint_prior_scale=changepoint_prior_scale,
        seasonality_mode=seasonality_mode,
        n_changepoints=n_changepoints,
        changepoint_range=changepoint_range,
        daily_seasonality=daily_seasonality,
        yearly_seasonality=yearly_seasonality,
        weekly_seasonality=weekly_seasonality,
        seasonality_prior_scale=seasonality_prior_scale,
        interval_width=interval_width,
        uncertainty_samples=uncertainty_samples,
    )
    error_analysis = compute_error_analysis(data_points)
    split_summary = build_prophet_split_summary(df=df, periods=periods, freq=freq)

    manager.broadcast_sync({
        "type": "status",
        "progress": 96,
        "phase": "prophet_packaging",
        "message": "Đang đóng gói artifact, metric và dữ liệu trực quan.",
    })

    return {
        "metrics": {"mae": mae, "rmse": rmse, "mape": mape},
        "data": data_points,
        "training_history": None,
        "prophet_components": prophet_components,
        "backtest": backtest,
        "error_analysis": error_analysis,
        "split_summary": split_summary,
        "model_type": "Prophet",
        "_trained_model": model,
    }
