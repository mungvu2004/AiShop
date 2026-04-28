import os
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'

import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, GRU, Dense, Dropout, Bidirectional
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping

import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error
from backend.api.websockets import manager
import asyncio


def mean_absolute_percentage_error(y_true, y_pred):
    y_true, y_pred = np.array(y_true), np.array(y_pred)
    mask = y_true != 0
    if mask.sum() == 0:
        return 0.0
    return np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100


def create_dataset(dataset: np.ndarray, look_back: int = 1):
    """Tạo bộ dữ liệu X, Y cho LSTM.
    dataset: (N, 1) - scaled values
    Trả về X: (N-look_back-1, look_back, 1), Y: (N-look_back-1,)
    """
    X, Y = [], []
    for i in range(len(dataset) - look_back - 1):
        X.append(dataset[i:(i + look_back), 0])
        Y.append(dataset[i + look_back, 0])
    X = np.array(X).reshape(-1, look_back, 1)  # (samples, timesteps, features)
    Y = np.array(Y)
    return X, Y


def build_model(
    look_back: int,
    num_layers: int,
    units: int,
    dropout: float,
    model_arch: str,
    learning_rate: float,
) -> tf.keras.Model:
    model = Sequential()

    for i in range(num_layers):
        return_seq = i < num_layers - 1  # True for all but last layer

        if model_arch == "BiLSTM":
            layer = Bidirectional(
                LSTM(units, return_sequences=return_seq),
                input_shape=(look_back, 1) if i == 0 else None,
            )
        elif model_arch == "GRU":
            layer = GRU(
                units, return_sequences=return_seq,
                input_shape=(look_back, 1) if i == 0 else None,
            )
        else:  # default LSTM
            layer = LSTM(
                units, return_sequences=return_seq,
                input_shape=(look_back, 1) if i == 0 else None,
            )

        model.add(layer)

        if dropout > 0 and i < num_layers - 1:
            model.add(Dropout(dropout))

    if dropout > 0:
        model.add(Dropout(dropout))

    model.add(Dense(1))
    model.compile(loss='mean_squared_error', optimizer=Adam(learning_rate=learning_rate))
    return model


class WebSocketCallback(tf.keras.callbacks.Callback):
    def __init__(self, total_epochs: int, epoch_logs_ref: list):
        super().__init__()
        self.total_epochs = total_epochs
        self.epoch_logs_ref = epoch_logs_ref

    def on_epoch_end(self, epoch, logs=None):
        logs = logs or {}
        loss = float(logs.get('loss', 0))
        val_loss = float(logs['val_loss']) if 'val_loss' in logs else None
        progress = ((epoch + 1) / self.total_epochs) * 100

        entry = {"epoch": epoch + 1, "loss": round(loss, 6)}
        if val_loss is not None:
            entry["val_loss"] = round(val_loss, 6)
        self.epoch_logs_ref.append(entry)

        msg = {
            "type": "progress",
            "progress": round(progress, 2),
            "epoch": epoch + 1,
            "total_epochs": self.total_epochs,
            "loss": round(loss, 6),
            "val_loss": val_loss,
        }
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.create_task(manager.broadcast(msg))
            else:
                asyncio.run(manager.broadcast(msg))
        except RuntimeError:
            asyncio.run(manager.broadcast(msg))


async def train_lstm(
    df: pd.DataFrame,
    look_back: int,
    epochs: int,
    batch_size: int,
    learning_rate: float,
    periods: int,
    freq: str,
    num_layers: int = 1,
    units: int = 50,
    dropout: float = 0.0,
    validation_split: float = 0.1,
    model_arch: str = "LSTM",
):
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_data = scaler.fit_transform(df['y'].values.reshape(-1, 1))

    X, Y = create_dataset(scaled_data, look_back)

    model = build_model(look_back, num_layers, units, dropout, model_arch, learning_rate)

    epoch_logs: list = []
    ws_callback = WebSocketCallback(epochs, epoch_logs)

    fit_kwargs: dict = {
        "epochs": epochs,
        "batch_size": batch_size,
        "verbose": 0,
        "callbacks": [ws_callback],
    }
    if validation_split > 0:
        fit_kwargs["validation_split"] = validation_split

    history = model.fit(X, Y, **fit_kwargs)

    # Ghi lại lịch sử (phòng khi WS không kết nối)
    if not epoch_logs:
        for i in range(len(history.history['loss'])):
            entry = {"epoch": i + 1, "loss": round(float(history.history['loss'][i]), 6)}
            if 'val_loss' in history.history:
                entry["val_loss"] = round(float(history.history['val_loss'][i]), 6)
            epoch_logs.append(entry)

    # Dự đoán trên tập huấn luyện để tính metrics
    train_predict = model.predict(X, verbose=0)
    train_predict = scaler.inverse_transform(train_predict)
    Y_actual = scaler.inverse_transform(Y.reshape(-1, 1))

    y_true = Y_actual[:, 0]
    y_pred = train_predict[:, 0]

    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    mape = mean_absolute_percentage_error(y_true, y_pred)

    # Dự báo tương lai (autoregressive)
    last_seq = scaled_data[-look_back:].reshape(1, look_back, 1)  # (1, look_back, 1)
    future_predictions = []
    for _ in range(periods):
        next_pred = model.predict(last_seq, verbose=0)[0, 0]
        future_predictions.append(float(next_pred))
        last_seq = np.append(last_seq[:, 1:, :], [[[next_pred]]], axis=1)

    future_predictions_inv = scaler.inverse_transform(
        np.array(future_predictions).reshape(-1, 1)
    )

    # Căn chỉnh dự đoán với ngày
    # y_pred[k] dự đoán cho index look_back + k
    dates = df['ds'].values
    actuals = df['y'].values
    data_points = []

    for i in range(len(df)):
        pred_idx = i - look_back
        pred_val = float(y_pred[pred_idx]) if 0 <= pred_idx < len(y_pred) else None
        data_points.append({
            "date": pd.to_datetime(dates[i]).strftime("%Y-%m-%d"),
            "actual": float(actuals[i]),
            "predicted": pred_val,
            "lower_bound": None,
            "upper_bound": None,
        })

    # Thêm các ngày tương lai
    last_date = pd.to_datetime(dates[-1])
    future_dates = pd.date_range(start=last_date, periods=periods + 1, freq=freq)[1:]
    for i in range(periods):
        data_points.append({
            "date": future_dates[i].strftime("%Y-%m-%d"),
            "actual": None,
            "predicted": float(future_predictions_inv[i, 0]),
            "lower_bound": None,
            "upper_bound": None,
        })

    await manager.broadcast({"type": "complete", "progress": 100})

    return {
        "metrics": {"mae": mae, "rmse": rmse, "mape": mape},
        "data": data_points,
        "training_history": epoch_logs,
        "prophet_components": None,
        "model_type": f"{model_arch}",
    }
