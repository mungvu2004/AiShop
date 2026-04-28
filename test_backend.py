import asyncio
from pathlib import Path

from backend.services.data_service import get_data_info
from backend.services.data_pipeline import load_and_preprocess
from backend.services.lstm_service import train_lstm
from backend.services.prophet_service import train_prophet

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


def test_prophet():
    df = _sample_df()
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


def test_lstm():
    df = _sample_df().tail(40).reset_index(drop=True)
    result = asyncio.run(
        train_lstm(
            df,
            look_back=2,
            epochs=1,
            batch_size=8,
            learning_rate=0.001,
            periods=3,
            freq='W',
        )
    )

    assert result['model_type'] == 'LSTM'
    assert result['metrics']['mae'] >= 0
    assert len(result['training_history']) == 1
    assert len(result['data']) > len(df)
