from pathlib import Path

import pandas as pd

DATA_PATH = Path(__file__).resolve().parent / 'data' / 'DataCoSupplyChainDataset.csv'


def test_csv_loads_and_aggregates():
    columns = ['shipping date (DateOrders)', 'Order Item Quantity']
    df = pd.read_csv(DATA_PATH, usecols=columns, encoding='latin1')

    assert not df.empty

    df = df.rename(columns={
        'shipping date (DateOrders)': 'ds',
        'Order Item Quantity': 'y',
    })

    df['ds'] = pd.to_datetime(df['ds'], errors='coerce')
    df = df.dropna(subset=['ds', 'y']).set_index('ds')
    weekly = df.resample('W').sum().reset_index()

    assert not weekly.empty
    assert {'ds', 'y'}.issubset(weekly.columns)
