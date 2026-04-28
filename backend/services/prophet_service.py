from prophet import Prophet
import pandas as pd
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error


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
    yearly_seasonality: bool = True,
    weekly_seasonality: bool = True,
    seasonality_prior_scale: float = 10.0,
    interval_width: float = 0.8,
    uncertainty_samples: int = 1000,
):
    model = Prophet(
        changepoint_prior_scale=changepoint_prior_scale,
        seasonality_mode=seasonality_mode,
        n_changepoints=n_changepoints,
        changepoint_range=changepoint_range,
        yearly_seasonality=yearly_seasonality,
        weekly_seasonality=weekly_seasonality,
        seasonality_prior_scale=seasonality_prior_scale,
        interval_width=interval_width,
        uncertainty_samples=uncertainty_samples,
    )
    model.fit(df)

    # Dự đoán trên tập huấn luyện để tính metrics
    forecast_train = model.predict(df)
    y_true = df['y'].values
    y_pred = forecast_train['yhat'].values

    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    mape = mean_absolute_percentage_error(y_true, y_pred)

    # Dự báo tương lai
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

    return {
        "metrics": {"mae": mae, "rmse": rmse, "mape": mape},
        "data": data_points,
        "training_history": None,
        "prophet_components": prophet_components,
        "model_type": "Prophet",
    }
