import pandas as pd
import numpy as np
from typing import Any, Dict, Tuple

TARGET_MAP = {
    "quantity": "Order Item Quantity",
    "sales": "Sales",
    "profit": "Order Profit Per Order",
}


def load_and_preprocess(
    filepath: str,
    aggregation: str = "D",
    target_column: str = "quantity",
    include_summary: bool = False,
) -> pd.DataFrame | Tuple[pd.DataFrame, Dict[str, Any]]:
    col_name = TARGET_MAP.get(target_column, "Order Item Quantity")
    columns = ["shipping date (DateOrders)", col_name]

    try:
        df = pd.read_csv(filepath, usecols=columns, encoding='latin1')
    except Exception as e:
        raise ValueError(f"Lỗi đọc CSV: {e}")

    rows_original = len(df)
    df.rename(columns={
        "shipping date (DateOrders)": "ds",
        col_name: "y",
    }, inplace=True)

    invalid_dates = int(pd.to_datetime(df['ds'], errors='coerce').isna().sum())
    missing_targets = int(df['y'].isna().sum())

    df['ds'] = pd.to_datetime(df['ds'], errors='coerce')
    df.dropna(subset=['ds', 'y'], inplace=True)
    rows_after_dropna = len(df)

    df.set_index('ds', inplace=True)
    df_agg = df.resample(aggregation).sum().reset_index()
    rows_after_resample = len(df_agg)

    # Remove periods with zero values at the start/end (sparse data)
    # Keep internal zeros as they may be meaningful
    nonzero_mask = df_agg['y'] > 0
    trimmed_leading_zero_rows = 0
    trimmed_trailing_zero_rows = 0
    if nonzero_mask.any():
        first_nonzero = int(nonzero_mask.idxmax())
        last_nonzero = int(nonzero_mask[::-1].idxmax())
        trimmed_leading_zero_rows = first_nonzero
        trimmed_trailing_zero_rows = rows_after_resample - last_nonzero - 1
        df_agg = df_agg.loc[first_nonzero:last_nonzero].reset_index(drop=True)

    if not include_summary:
        return df_agg

    summary = {
        "target_column": target_column,
        "source_column": col_name,
        "aggregation": aggregation,
        "rows_original": rows_original,
        "rows_after_dropna": rows_after_dropna,
        "rows_after_resample": rows_after_resample,
        "rows_after_trim": int(len(df_agg)),
        "invalid_dates": invalid_dates,
        "missing_targets": missing_targets,
        "trimmed_leading_zero_rows": trimmed_leading_zero_rows,
        "trimmed_trailing_zero_rows": trimmed_trailing_zero_rows,
        "start_date": df_agg['ds'].min().strftime("%Y-%m-%d"),
        "end_date": df_agg['ds'].max().strftime("%Y-%m-%d"),
    }
    return df_agg, summary
