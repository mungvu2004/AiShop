import pandas as pd
import numpy as np

TARGET_MAP = {
    "quantity": "Order Item Quantity",
    "sales": "Sales",
    "profit": "Order Profit Per Order",
}


def load_and_preprocess(filepath: str, aggregation: str = "D", target_column: str = "quantity") -> pd.DataFrame:
    col_name = TARGET_MAP.get(target_column, "Order Item Quantity")
    columns = ["shipping date (DateOrders)", col_name]

    try:
        df = pd.read_csv(filepath, usecols=columns, encoding='latin1')
    except Exception as e:
        raise ValueError(f"Lỗi đọc CSV: {e}")

    df.rename(columns={
        "shipping date (DateOrders)": "ds",
        col_name: "y",
    }, inplace=True)

    df['ds'] = pd.to_datetime(df['ds'], errors='coerce')
    df.dropna(subset=['ds', 'y'], inplace=True)

    df.set_index('ds', inplace=True)
    df_agg = df.resample(aggregation).sum().reset_index()

    # Remove periods with zero values at the start/end (sparse data)
    # Keep internal zeros as they may be meaningful
    first_nonzero = (df_agg['y'] > 0).idxmax()
    last_nonzero = (df_agg['y'] > 0)[::-1].idxmax()
    df_agg = df_agg.loc[first_nonzero:last_nonzero].reset_index(drop=True)

    return df_agg
