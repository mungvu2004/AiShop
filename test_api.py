from fastapi.testclient import TestClient

from backend.main import app


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
