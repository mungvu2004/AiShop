from __future__ import annotations

from collections import defaultdict
from typing import Any, Dict, List

import numpy as np
import pandas as pd
from prophet import Prophet


def mean_absolute_percentage_error(y_true, y_pred):
    y_true, y_pred = np.array(y_true), np.array(y_pred)
    mask = y_true != 0
    if mask.sum() == 0:
        return 0.0
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100)


def metric_snapshot(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    residuals = y_true - y_pred
    mae = float(np.mean(np.abs(residuals)))
    rmse = float(np.sqrt(np.mean(np.square(residuals))))
    mape = mean_absolute_percentage_error(y_true, y_pred)
    return {"mae": mae, "rmse": rmse, "mape": mape}


def compute_error_analysis(data_points: List[Dict[str, Any]]) -> Dict[str, Any] | None:
    historical = [
        item for item in data_points
        if item.get("actual") is not None and item.get("predicted") is not None
    ]
    if not historical:
        return None

    actual = np.array([float(item["actual"]) for item in historical], dtype=float)
    predicted = np.array([float(item["predicted"]) for item in historical], dtype=float)
    residuals = actual - predicted
    abs_errors = np.abs(residuals)

    bins = max(6, min(14, int(np.sqrt(len(residuals))) + 2))
    counts, edges = np.histogram(residuals, bins=bins)
    histogram = []
    for idx, count in enumerate(counts):
        start = float(edges[idx])
        end = float(edges[idx + 1])
        histogram.append({
            "label": f"{start:.1f} → {end:.1f}",
            "bin_start": start,
            "bin_end": end,
            "count": int(count),
        })

    if len(historical) > 240:
        sample_idx = np.linspace(0, len(historical) - 1, num=240, dtype=int)
    else:
        sample_idx = np.arange(len(historical))
    scatter = []
    for idx in sample_idx:
        scatter.append({
            "date": historical[int(idx)]["date"],
            "predicted": float(predicted[int(idx)]),
            "actual": float(actual[int(idx)]),
            "residual": float(residuals[int(idx)]),
            "abs_error": float(abs_errors[int(idx)]),
        })

    rolling_window = max(3, min(14, len(abs_errors) // 8 if len(abs_errors) >= 8 else len(abs_errors)))
    rolling_window = min(rolling_window, len(abs_errors))
    rolling_mae = []
    if rolling_window > 0:
        rolling = pd.Series(abs_errors).rolling(window=rolling_window, min_periods=1).mean()
        for idx, value in enumerate(rolling):
            rolling_mae.append({
                "date": historical[idx]["date"],
                "value": float(value),
            })

    summary = {
        "mean_residual": float(np.mean(residuals)),
        "std_residual": float(np.std(residuals)),
        "max_abs_error": float(np.max(abs_errors)),
        "p90_abs_error": float(np.percentile(abs_errors, 90)),
        "positive_residual_ratio": float((residuals > 0).mean()),
        "negative_residual_ratio": float((residuals < 0).mean()),
        "rolling_window": int(max(rolling_window, 1)),
        "sample_size": int(len(historical)),
    }

    return {
        "summary": summary,
        "histogram": histogram,
        "scatter": scatter,
        "rolling_mae": rolling_mae,
    }


def build_prophet_split_summary(df: pd.DataFrame, periods: int, freq: str) -> Dict[str, Any]:
    start_date = pd.to_datetime(df["ds"].iloc[0])
    end_date = pd.to_datetime(df["ds"].iloc[-1])
    future_dates = pd.date_range(start=end_date, periods=periods + 1, freq=freq)[1:]
    future_start = future_dates[0] if len(future_dates) else end_date
    future_end = future_dates[-1] if len(future_dates) else end_date

    return {
        "mode": "timeline",
        "description": "Prophet dùng toàn bộ lịch sử để fit. Không có validation split nội bộ.",
        "segments": [
            {
                "label": "Lịch sử huấn luyện",
                "role": "train",
                "count": int(len(df)),
                "start_date": start_date.strftime("%Y-%m-%d"),
                "end_date": end_date.strftime("%Y-%m-%d"),
            },
            {
                "label": "Vùng dự báo tương lai",
                "role": "forecast",
                "count": int(periods),
                "start_date": future_start.strftime("%Y-%m-%d"),
                "end_date": future_end.strftime("%Y-%m-%d"),
            },
        ],
        "look_back": None,
        "validation_split": 0.0,
        "total_points": int(len(df)),
    }


def build_lstm_split_summary(
    df: pd.DataFrame,
    look_back: int,
    periods: int,
    validation_split: float,
    freq: str,
) -> Dict[str, Any]:
    total_points = int(len(df))
    sequence_count = max(total_points - look_back - 1, 0)
    validation_count = int(round(sequence_count * validation_split)) if validation_split > 0 else 0
    validation_count = min(validation_count, sequence_count)
    train_count = max(sequence_count - validation_count, 0)

    target_dates = pd.to_datetime(df["ds"].iloc[look_back:look_back + sequence_count])
    train_end_index = train_count - 1
    val_start_index = train_count

    segments: List[Dict[str, Any]] = [
        {
            "label": "Ngữ cảnh look_back",
            "role": "context",
            "count": int(min(look_back, total_points)),
            "start_date": pd.to_datetime(df["ds"].iloc[0]).strftime("%Y-%m-%d"),
            "end_date": pd.to_datetime(df["ds"].iloc[min(look_back - 1, total_points - 1)]).strftime("%Y-%m-%d"),
        }
    ]

    if train_count > 0 and len(target_dates) > 0:
        segments.append({
            "label": "Target train",
            "role": "train",
            "count": int(train_count),
            "start_date": target_dates.iloc[0].strftime("%Y-%m-%d"),
            "end_date": target_dates.iloc[train_end_index].strftime("%Y-%m-%d"),
        })

    if validation_count > 0 and len(target_dates) > val_start_index:
        segments.append({
            "label": "Target validation",
            "role": "validation",
            "count": int(validation_count),
            "start_date": target_dates.iloc[val_start_index].strftime("%Y-%m-%d"),
            "end_date": target_dates.iloc[-1].strftime("%Y-%m-%d"),
        })

    end_date = pd.to_datetime(df["ds"].iloc[-1])
    future_dates = pd.date_range(start=end_date, periods=periods + 1, freq=freq)[1:]
    future_start = future_dates[0] if len(future_dates) else end_date
    future_end = future_dates[-1] if len(future_dates) else end_date
    segments.append({
        "label": "Vùng dự báo tương lai",
        "role": "forecast",
        "count": int(periods),
        "start_date": future_start.strftime("%Y-%m-%d"),
        "end_date": future_end.strftime("%Y-%m-%d"),
    })

    return {
        "mode": "sequence_split",
        "description": "LSTM dùng cửa sổ look_back để tạo sample. Validation lấy từ phần cuối chuỗi sample.",
        "segments": segments,
        "look_back": int(look_back),
        "validation_split": float(validation_split),
        "total_points": total_points,
        "sequence_count": int(sequence_count),
        "train_count": int(train_count),
        "validation_count": int(validation_count),
    }


def build_prophet_backtest(
    df: pd.DataFrame,
    *,
    periods: int,
    freq: str,
    changepoint_prior_scale: float,
    seasonality_mode: str,
    n_changepoints: int,
    changepoint_range: float,
    daily_seasonality: bool,
    yearly_seasonality: bool,
    weekly_seasonality: bool,
    seasonality_prior_scale: float,
    interval_width: float,
    uncertainty_samples: int,
) -> Dict[str, Any] | None:
    if len(df) < 18:
        return None

    max_horizon = 8 if freq == "W" else 14
    horizon = min(max(periods, 1), max_horizon, max(1, len(df) // 5))
    if horizon < 1:
        return None

    fold_count = min(2, max(1, (len(df) - 10) // horizon))
    while fold_count > 1 and (len(df) - fold_count * horizon) < 10:
        fold_count -= 1

    if fold_count < 1:
        return None

    initial_train_size = len(df) - fold_count * horizon
    if initial_train_size < 10:
        return None

    folds = []
    preview_points = []
    horizon_bucket_actuals: Dict[int, List[float]] = defaultdict(list)
    horizon_bucket_preds: Dict[int, List[float]] = defaultdict(list)

    for fold_idx in range(fold_count):
        train_end = initial_train_size + fold_idx * horizon
        train_df = df.iloc[:train_end].copy()
        test_df = df.iloc[train_end:train_end + horizon].copy()
        if len(test_df) == 0:
            continue

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
            uncertainty_samples=min(uncertainty_samples, 50),
        )
        model.fit(train_df)
        future = model.make_future_dataframe(periods=len(test_df), freq=freq)
        forecast = model.predict(future).tail(len(test_df))

        y_true = test_df["y"].to_numpy(dtype=float)
        y_pred = forecast["yhat"].to_numpy(dtype=float)
        metrics = metric_snapshot(y_true, y_pred)
        folds.append({
            "label": f"Fold {fold_idx + 1}",
            "start_date": pd.to_datetime(test_df["ds"].iloc[0]).strftime("%Y-%m-%d"),
            "end_date": pd.to_datetime(test_df["ds"].iloc[-1]).strftime("%Y-%m-%d"),
            "point_count": int(len(test_df)),
            **metrics,
        })

        for step_idx, (date_value, actual_value, pred_value) in enumerate(zip(test_df["ds"], y_true, y_pred), start=1):
            preview_points.append({
                "fold": f"Fold {fold_idx + 1}",
                "date": pd.to_datetime(date_value).strftime("%Y-%m-%d"),
                "actual": float(actual_value),
                "predicted": float(pred_value),
                "step": int(step_idx),
            })
            horizon_bucket_actuals[step_idx].append(float(actual_value))
            horizon_bucket_preds[step_idx].append(float(pred_value))

    if not folds:
        return None

    horizon_metrics = []
    for step_idx in sorted(horizon_bucket_actuals):
        y_true = np.array(horizon_bucket_actuals[step_idx], dtype=float)
        y_pred = np.array(horizon_bucket_preds[step_idx], dtype=float)
        horizon_metrics.append({
            "horizon": int(step_idx),
            "point_count": int(len(y_true)),
            **metric_snapshot(y_true, y_pred),
        })

    return {
        "method": "rolling_origin_prophet",
        "description": "Backtest rolling-origin cho Prophet với các fold trên phần cuối chuỗi lịch sử.",
        "folds": folds,
        "horizon_metrics": horizon_metrics,
        "preview_points": preview_points,
    }


def build_lstm_backtest(
    df: pd.DataFrame,
    *,
    scaled_data: np.ndarray,
    scaler,
    model,
    look_back: int,
    periods: int,
    freq: str,
) -> Dict[str, Any] | None:
    if len(df) <= look_back + 4:
        return None

    max_horizon = 8 if freq == "W" else 14
    horizon_limit = min(max(periods, 1), max_horizon, max(1, (len(df) - look_back) // 3))
    if horizon_limit < 1:
        return None

    origin_count = min(4, max(1, len(df) - look_back - horizon_limit))
    start_origin = max(look_back, len(df) - (origin_count + horizon_limit))

    folds = []
    preview_points = []
    horizon_bucket_actuals: Dict[int, List[float]] = defaultdict(list)
    horizon_bucket_preds: Dict[int, List[float]] = defaultdict(list)

    for fold_idx, origin in enumerate(range(start_origin, start_origin + origin_count)):
        if origin + horizon_limit > len(df):
            break

        history_scaled = scaled_data[:origin].reshape(-1, 1)
        if len(history_scaled) < look_back:
            continue

        window = history_scaled[-look_back:].reshape(1, look_back, 1)
        fold_actuals = []
        fold_preds = []
        fold_dates = []

        for horizon in range(1, horizon_limit + 1):
            pred_scaled = float(model.predict(window, verbose=0)[0, 0])
            pred_value = float(scaler.inverse_transform(np.array([[pred_scaled]])).ravel()[0])
            actual_value = float(df["y"].iloc[origin + horizon - 1])
            date_value = pd.to_datetime(df["ds"].iloc[origin + horizon - 1]).strftime("%Y-%m-%d")

            fold_actuals.append(actual_value)
            fold_preds.append(pred_value)
            fold_dates.append(date_value)
            preview_points.append({
                "fold": f"Tail {fold_idx + 1}",
                "date": date_value,
                "actual": actual_value,
                "predicted": pred_value,
                "step": int(horizon),
            })
            horizon_bucket_actuals[horizon].append(actual_value)
            horizon_bucket_preds[horizon].append(pred_value)

            actual_scaled = float(scaled_data[origin + horizon - 1, 0])
            window = np.append(window[:, 1:, :], [[[actual_scaled]]], axis=1)

        metrics = metric_snapshot(np.array(fold_actuals), np.array(fold_preds))
        folds.append({
            "label": f"Tail {fold_idx + 1}",
            "start_date": fold_dates[0],
            "end_date": fold_dates[-1],
            "point_count": int(len(fold_actuals)),
            **metrics,
        })

    if not folds:
        return None

    horizon_metrics = []
    for step_idx in sorted(horizon_bucket_actuals):
        y_true = np.array(horizon_bucket_actuals[step_idx], dtype=float)
        y_pred = np.array(horizon_bucket_preds[step_idx], dtype=float)
        horizon_metrics.append({
            "horizon": int(step_idx),
            "point_count": int(len(y_true)),
            **metric_snapshot(y_true, y_pred),
        })

    return {
        "method": "tail_walk_forward_lstm",
        "description": "Đánh giá walk-forward trên phần đuôi lịch sử bằng one-step update với giá trị thực.",
        "folds": folds,
        "horizon_metrics": horizon_metrics,
        "preview_points": preview_points,
    }
