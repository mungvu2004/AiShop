from pathlib import Path
import uuid

from fastapi.testclient import TestClient

from backend.main import app
from backend.services import model_registry


client = TestClient(app)


def test_health_endpoint():
    response = client.get('/health')

    assert response.status_code == 200
    payload = response.json()
    assert payload['status'] == 'ok'
    assert payload['data_file_exists'] is True


def test_train_options_endpoint():
    response = client.get('/train/options')

    assert response.status_code == 200
    payload = response.json()
    assert payload['targets']
    assert payload['aggregations']
    assert payload['model_architectures']
    assert 'prophet' in payload
    assert 'lstm' in payload


def test_model_runs_endpoints(monkeypatch):
    test_root = Path('test_tmp_model_runs') / uuid.uuid4().hex
    test_root.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(model_registry, 'RUNS_ROOT', test_root)
    saved = model_registry.save_training_run(
        model_type='Prophet',
        metrics={'mae': 1.0, 'rmse': 2.0, 'mape': 3.0},
        training_config={'periods': 3},
        preprocessing_summary={
            'target_column': 'quantity',
            'source_column': 'Order Item Quantity',
            'aggregation': 'W',
            'rows_original': 10,
            'rows_after_dropna': 9,
            'rows_after_resample': 8,
            'rows_after_trim': 8,
            'invalid_dates': 0,
            'missing_targets': 1,
            'trimmed_leading_zero_rows': 0,
            'trimmed_trailing_zero_rows': 0,
            'start_date': '2020-01-01',
            'end_date': '2020-02-01',
            'normalized_for_model': False,
            'normalization_method': None,
            'normalized_range': None,
            'original_min': None,
            'original_max': None,
        },
        backtest={
            'method': 'rolling_origin_prophet',
            'description': 'test',
            'folds': [],
            'horizon_metrics': [],
            'preview_points': [],
        },
        error_analysis={
            'summary': {'sample_size': 1},
            'histogram': [],
            'scatter': [],
            'rolling_mae': [],
        },
        split_summary={
            'mode': 'timeline',
            'description': 'test',
            'segments': [],
            'total_points': 8,
        },
        artifact_payload={'extra_artifacts': {'notes.json': {'hello': 'world'}}},
        root=test_root,
    )

    list_response = client.get('/models/runs')
    assert list_response.status_code == 200
    assert list_response.json()['items']

    detail_response = client.get(f"/models/runs/{saved['run_id']}")
    assert detail_response.status_code == 200
    assert detail_response.json()['model_version'] == saved['model_version']
    assert detail_response.json()['backtest']['method'] == 'rolling_origin_prophet'


def test_lstm_validation_requires_validation_split_for_early_stopping():
    response = client.post('/train/lstm', json={
        'target_column': 'quantity',
        'aggregation': 'W',
        'periods': 3,
        'look_back': 2,
        'epochs': 1,
        'batch_size': 8,
        'learning_rate': 0.001,
        'validation_split': 0.0,
        'early_stopping': True,
        'patience': 5,
        'min_delta': 0.0001,
        'shuffle': False,
        'model_arch': 'LSTM',
        'num_layers': 1,
        'units': 32,
        'dropout': 0.0,
    })

    assert response.status_code == 400
    assert 'validation_split' in response.json()['detail']
