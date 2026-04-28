import asyncio
from pathlib import Path
import numpy as np
import pandas as pd

from backend.services.data_service import get_data_info
from backend.services.data_pipeline import load_and_preprocess
from backend.services.lstm_service import train_lstm
from backend.services.prophet_service import train_prophet
from backend.services.evaluation_service import (
    compute_error_analysis,
)

DATA_PATH = Path(__file__).resolve().parent / 'data' / 'DataCoSupplyChainDataset.csv'


def _sample_df():
    return load_and_preprocess(str(DATA_PATH), aggregation='W').tail(52).reset_index(drop=True)


def test_data_info():
    info = get_data_info(str(DATA_PATH))

    assert info['stats']['total_records'] > 0
    assert info['time_series']
    assert info['acf']
    assert info['decomposition']
    assert info['preprocessing_steps']


def test_pipeline():
    df = _sample_df()

    assert not df.empty
    assert {'ds', 'y'}.issubset(df.columns)
    assert len(df) >= 40


def test_pipeline_summary():
    df, summary = load_and_preprocess(str(DATA_PATH), aggregation='W', include_summary=True)

    assert not df.empty
    assert summary['target_column'] == 'quantity'
    assert summary['aggregation'] == 'W'
    assert summary['rows_original'] >= summary['rows_after_dropna'] >= summary['rows_after_trim']
    assert summary['start_date'] <= summary['end_date']


def test_prophet_train_smoke(monkeypatch):
    df = _sample_df()

    class DummyProphet:
        def __init__(self, **kwargs):
            self.kwargs = kwargs
            self.train_df = None

        def fit(self, frame):
            self.train_df = frame.copy()
            return self

        def make_future_dataframe(self, periods, freq):
            assert self.train_df is not None
            last_date = pd.to_datetime(self.train_df['ds'].iloc[-1])
            future_dates = pd.date_range(start=last_date, periods=periods + 1, freq=freq)[1:]
            return pd.DataFrame({'ds': pd.concat([self.train_df['ds'], pd.Series(future_dates)], ignore_index=True)})

        def predict(self, frame):
            ds = pd.to_datetime(frame['ds'])
            index = np.arange(len(ds), dtype=float)
            base = 100 + index
            return pd.DataFrame({
                'ds': ds,
                'yhat': base,
                'yhat_lower': base - 5,
                'yhat_upper': base + 5,
                'trend': base * 0.9,
                'weekly': np.sin(index / 3.0),
                'yearly': np.cos(index / 5.0),
            })

    monkeypatch.setattr('backend.services.prophet_service.Prophet', DummyProphet)
    monkeypatch.setattr('backend.services.evaluation_service.Prophet', DummyProphet)

    result = train_prophet(
        df,
        changepoint_prior_scale=0.05,
        seasonality_mode='additive',
        periods=5,
        freq='W',
    )

    assert result['model_type'] == 'Prophet'
    assert result['metrics']['mae'] >= 0
    assert len(result['data']) > len(df)
    assert result['prophet_components']
    assert result['backtest'] is not None
    assert result['backtest']['folds']
    assert result['error_analysis'] is not None
    assert result['split_summary'] is not None


def test_lstm_train_smoke(monkeypatch):
    df = _sample_df().tail(24).reset_index(drop=True)

    class DummyModel:
        def fit(self, X, Y, **kwargs):
            history = {'loss': [0.123]}
            if kwargs.get('validation_split', 0) > 0:
                history['val_loss'] = [0.156]
            return type('History', (), {'history': history})()

        def predict(self, X, verbose=0):
            values = np.asarray(X)
            if values.ndim == 3:
                return values[:, -1, 0].reshape(-1, 1)
            return np.zeros((len(values), 1), dtype=float)

    monkeypatch.setattr('backend.services.lstm_service.build_model', lambda *args, **kwargs: DummyModel())

    result = asyncio.run(
        train_lstm(
            df=df,
            look_back=3,
            epochs=1,
            batch_size=8,
            learning_rate=0.001,
            periods=4,
            freq='W',
            validation_split=0.2,
            early_stopping=True,
            patience=2,
            min_delta=0.0001,
            shuffle=False,
            model_arch='LSTM',
        )
    )

    assert result['model_type'] == 'LSTM'
    assert result['metrics']['mae'] >= 0
    assert result['training_history']
    assert result['backtest'] is not None
    assert result['backtest']['horizon_metrics']
    assert result['split_summary'] is not None
    assert result['split_summary']['segments']
    assert result['error_analysis'] is not None
    assert result['error_analysis']['histogram']


def test_error_analysis_helper():
    df = _sample_df().tail(12).reset_index(drop=True)

    history_points = []
    for idx in range(8):
        history_points.append({
            'date': pd.to_datetime(df['ds'].iloc[idx]).strftime('%Y-%m-%d'),
            'actual': float(df['y'].iloc[idx]),
            'predicted': float(df['y'].iloc[idx]) * 0.95,
            'lower_bound': None,
            'upper_bound': None,
        })
    error_analysis = compute_error_analysis(history_points)

    assert error_analysis is not None
    assert error_analysis['histogram']
    assert error_analysis['rolling_mae']
