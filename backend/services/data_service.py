import pandas as pd
import numpy as np
from typing import Dict, Any, List, Tuple

_cache: Dict = {}


# ─────────────────────── helpers ────────────────────────────────

def _acf(y: np.ndarray, max_lag: int = 40) -> Tuple[List[Dict], float]:
    """Tính hàm tự tương quan ACF cho lags 0..max_lag."""
    n = len(y)
    mean = np.mean(y)
    denom = np.sum((y - mean) ** 2)
    significance = float(1.96 / np.sqrt(n))

    if denom == 0:
        return [{"lag": k, "acf": 0.0} for k in range(max_lag + 1)], significance

    result = [{"lag": 0, "acf": 1.0}]
    for k in range(1, max_lag + 1):
        numer = np.sum((y[:n - k] - mean) * (y[k:] - mean))
        result.append({"lag": k, "acf": round(float(numer / denom), 4)})
    return result, significance


def _seasonal_decompose(y: np.ndarray, period: int = 7) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Phân rã chuỗi thời gian theo mô hình cộng tính."""
    n = len(y)
    half_p = period // 2

    # Xu hướng: rolling mean có tâm
    trend = np.array([np.mean(y[max(0, i - half_p): min(n, i + half_p + 1)]) for i in range(n)], dtype=float)

    # Thành phần mùa vụ: trung bình theo pha
    detrended = y - trend
    seasonal = np.zeros(n, dtype=float)
    for phase in range(period):
        indices = np.arange(phase, n, period)
        seasonal[indices] = np.nanmean(detrended[indices])

    # Phần dư
    residual = y - trend - seasonal
    return trend, seasonal, residual


# ─────────────────────── main function ──────────────────────────

def get_data_info(filepath: str) -> Dict[str, Any]:
    if filepath in _cache:
        return _cache[filepath]

    preprocessing_steps = []

    # ── Bước 1: Tải dữ liệu ──────────────────────────────────────
    all_available = pd.read_csv(filepath, nrows=0, encoding='latin1').columns.tolist()
    base_cols = ["shipping date (DateOrders)", "Order Item Quantity"]
    optional_cols = ["Sales", "Order Profit Per Order", "Category Name", "Market", "Order Item Discount Rate"]
    load_cols = base_cols + [c for c in optional_cols if c in all_available]

    df_raw = pd.read_csv(filepath, usecols=load_cols, encoding='latin1')
    rows_original = len(df_raw)
    preprocessing_steps.append({
        "step": 1,
        "name": "Tải tệp CSV",
        "description": f"Đọc {rows_original:,} bản ghi đơn hàng — {len(load_cols)} cột được tải",
        "rows_in": rows_original,
        "rows_out": rows_original,
    })

    df_raw.rename(columns={
        "shipping date (DateOrders)": "ds",
        "Order Item Quantity": "quantity",
    }, inplace=True)
    if "Sales" in df_raw.columns:
        df_raw.rename(columns={"Sales": "sales"}, inplace=True)
    if "Order Profit Per Order" in df_raw.columns:
        df_raw.rename(columns={"Order Profit Per Order": "profit"}, inplace=True)
    if "Category Name" in df_raw.columns:
        df_raw.rename(columns={"Category Name": "category"}, inplace=True)
    if "Market" in df_raw.columns:
        df_raw.rename(columns={"Market": "market"}, inplace=True)
    if "Order Item Discount Rate" in df_raw.columns:
        df_raw.rename(columns={"Order Item Discount Rate": "discount_rate"}, inplace=True)

    # ── Bước 2: Phân tích cột ngày ─────────────────────────────
    df_raw['ds'] = pd.to_datetime(df_raw['ds'], errors='coerce')
    invalid_dates = int(df_raw['ds'].isna().sum())
    preprocessing_steps.append({
        "step": 2,
        "name": "Phân tích cột ngày tháng",
        "description": f"Chuyển đổi ngày tháng; {invalid_dates} giá trị không hợp lệ bị loại bỏ",
        "rows_in": rows_original,
        "rows_out": rows_original - invalid_dates,
    })

    # ── Bước 3: Loại bỏ giá trị thiếu ─────────────────────────
    rows_before_drop = len(df_raw)
    df_raw.dropna(subset=['ds', 'quantity'], inplace=True)
    rows_clean = len(df_raw)
    preprocessing_steps.append({
        "step": 3,
        "name": "Loại bỏ giá trị thiếu",
        "description": f"Xóa {rows_before_drop - rows_clean} hàng bị thiếu ngày hoặc số lượng",
        "rows_in": rows_before_drop,
        "rows_out": rows_clean,
    })

    # ── Bước 4: Tổng hợp theo ngày ─────────────────────────────
    df_idx = df_raw.set_index('ds')
    agg_dict = {"quantity": "sum"}
    if "sales" in df_idx.columns:
        agg_dict["sales"] = "sum"
    if "profit" in df_idx.columns:
        agg_dict["profit"] = "sum"

    df_daily = df_idx[list(agg_dict.keys())].resample('D').sum().reset_index()
    zero_days = int((df_daily['quantity'] == 0).sum())
    preprocessing_steps.append({
        "step": 4,
        "name": "Tổng hợp theo ngày",
        "description": (
            f"Gộp {rows_clean:,} bản ghi → {len(df_daily)} bước thời gian "
            f"({zero_days} ngày không có đơn hàng)"
        ),
        "rows_in": rows_clean,
        "rows_out": len(df_daily),
    })

    # ── Bước 5: Chuẩn hóa Min-Max (xem trước) ─────────────────
    y = df_daily['quantity'].values.astype(float)
    y_scaled = (y - y.min()) / (y.max() - y.min() + 1e-8)
    preprocessing_steps.append({
        "step": 5,
        "name": "Chuẩn hóa dữ liệu (Min-Max)",
        "description": (
            f"Thu phóng giá trị về [0, 1] — min={y.min():.0f}, max={y.max():.0f}. "
            "LSTM sử dụng bước này trước khi huấn luyện"
        ),
        "rows_in": len(df_daily),
        "rows_out": len(df_daily),
    })

    df_weekly = df_idx[["quantity"]].resample('W').sum().reset_index()

    # ── Thống kê cơ bản ─────────────────────────────────────────
    stats = {
        "total_records": int(rows_original),
        "clean_records": int(rows_clean),
        "date_start": df_daily['ds'].min().strftime("%Y-%m-%d"),
        "date_end": df_daily['ds'].max().strftime("%Y-%m-%d"),
        "total_days": int(len(df_daily)),
        "total_weeks": int(len(df_weekly)),
        "missing_ratio": round(float((rows_original - rows_clean) / rows_original * 100), 2),
        "mean_daily": round(float(np.mean(y)), 2),
        "std_daily": round(float(np.std(y)), 2),
        "min_daily": int(np.min(y)),
        "max_daily": int(np.max(y)),
        "total_quantity": int(y.sum()),
    }

    # ── Time series ─────────────────────────────────────────────
    ts_sample = df_daily.tail(365)
    time_series = [
        {"date": row['ds'].strftime("%Y-%m-%d"), "value": float(row['quantity'])}
        for _, row in ts_sample.iterrows()
    ]
    time_series_full = [
        {"date": row['ds'].strftime("%Y-%m-%d"), "value": float(row['quantity'])}
        for _, row in df_weekly.iterrows()
    ]

    # ── Phân phối (histogram) ───────────────────────────────────
    counts, bin_edges = np.histogram(y, bins=25)
    distribution = [
        {"range": f"{int(bin_edges[i])}-{int(bin_edges[i + 1])}", "count": int(counts[i])}
        for i in range(len(counts))
    ]

    # ── Trung bình động ─────────────────────────────────────────
    df_daily['ma7'] = df_daily['quantity'].rolling(7, min_periods=1).mean()
    df_daily['ma30'] = df_daily['quantity'].rolling(30, min_periods=1).mean()
    rolling = [
        {
            "date": row['ds'].strftime("%Y-%m-%d"),
            "raw": float(row['quantity']),
            "ma7": round(float(row['ma7']), 2),
            "ma30": round(float(row['ma30']), 2),
        }
        for _, row in df_daily.tail(365).iterrows()
    ]

    # ── Tổng theo tháng ─────────────────────────────────────────
    df_monthly = df_daily[['ds', 'quantity']].set_index('ds').resample('ME').sum().reset_index()
    monthly = [
        {"month": row['ds'].strftime("%Y-%m"), "value": float(row['quantity'])}
        for _, row in df_monthly.iterrows()
    ]

    # ── Pattern theo ngày trong tuần ────────────────────────────
    df_daily['weekday'] = df_daily['ds'].dt.day_name()
    weekday_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    weekday_labels = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật']
    wm = df_daily.groupby('weekday')['quantity'].mean().reindex(weekday_order)
    weekday = [
        {"day": weekday_labels[i], "avg": round(float(v), 2) if not pd.isna(v) else 0}
        for i, v in enumerate(wm)
    ]

    # ── So sánh năm theo năm (YoY) ──────────────────────────────
    df_daily['year'] = df_daily['ds'].dt.year
    df_daily['month'] = df_daily['ds'].dt.month
    yoy_grouped = df_daily.groupby(['year', 'month'])['quantity'].sum().reset_index()
    yoy_list = [
        {"year": int(r['year']), "month": int(r['month']), "value": float(r['quantity'])}
        for _, r in yoy_grouped.iterrows()
    ]

    # ── ACF (Tự tương quan) ──────────────────────────────────────
    acf_data, significance = _acf(y, max_lag=40)

    # ── Phân rã chuỗi thời gian ──────────────────────────────────
    trend_vals, seasonal_vals, residual_vals = _seasonal_decompose(y, period=7)
    decomp_sample = df_daily.tail(365)
    decomp_offset = len(df_daily) - len(decomp_sample)
    decomposition = [
        {
            "date": row['ds'].strftime("%Y-%m-%d"),
            "original": float(y[decomp_offset + i]),
            "trend": float(trend_vals[decomp_offset + i]),
            "seasonal": float(seasonal_vals[decomp_offset + i]),
            "residual": float(residual_vals[decomp_offset + i]),
        }
        for i, (_, row) in enumerate(decomp_sample.iterrows())
    ]

    # ── Phân tích theo danh mục ──────────────────────────────────
    categories: List[Dict] = []
    if 'category' in df_raw.columns:
        cat_totals = (
            df_raw.groupby('category')['quantity'].sum()
            .nlargest(12)
            .reset_index()
        )
        categories = [
            {"name": str(row['category']), "value": float(row['quantity'])}
            for _, row in cat_totals.iterrows()
        ]

    # ── Phân tích theo thị trường ────────────────────────────────
    markets: List[Dict] = []
    if 'market' in df_raw.columns:
        mkt_totals = df_raw.groupby('market')['quantity'].sum().reset_index()
        markets = [
            {"name": str(row['market']), "value": float(row['quantity'])}
            for _, row in mkt_totals.iterrows()
        ]

    # ── So sánh nhiều mục tiêu (Quantity / Sales / Profit) ───────
    multi_target: List[Dict] = []
    df_mt = df_daily[['ds', 'quantity']].copy()
    if 'sales' in df_daily.columns:
        df_mt['sales'] = df_daily['sales']
    if 'profit' in df_daily.columns:
        df_mt['profit'] = df_daily['profit']

    # Chuẩn hóa để so sánh trên cùng trục
    def _normalize(col: pd.Series) -> pd.Series:
        mn, mx = col.min(), col.max()
        return (col - mn) / (mx - mn + 1e-8) if mx > mn else col * 0

    df_mt_sample = df_mt.tail(365).copy()
    df_mt_sample['q_norm'] = _normalize(df_mt_sample['quantity'])
    if 'sales' in df_mt_sample.columns:
        df_mt_sample['s_norm'] = _normalize(df_mt_sample['sales'])
    if 'profit' in df_mt_sample.columns:
        df_mt_sample['p_norm'] = _normalize(df_mt_sample['profit'])

    for _, row in df_mt_sample.iterrows():
        entry: Dict = {"date": row['ds'].strftime("%Y-%m-%d"), "quantity": round(float(row['q_norm']), 4)}
        if 's_norm' in df_mt_sample.columns:
            entry['sales'] = round(float(row['s_norm']), 4)
        if 'p_norm' in df_mt_sample.columns:
            entry['profit'] = round(float(row['p_norm']), 4)
        multi_target.append(entry)

    # ── Chuẩn hóa trước/sau (cho LSTM) ──────────────────────────
    scale_preview = [
        {
            "date": row['ds'].strftime("%Y-%m-%d"),
            "original": float(row['quantity']),
            "scaled": round(float(y_scaled[len(df_daily) - len(df_daily.tail(120)) + i]), 4),
        }
        for i, (_, row) in enumerate(df_daily.tail(120).iterrows())
    ]

    result = {
        "stats": stats,
        "time_series": time_series,
        "time_series_full": time_series_full,
        "distribution": distribution,
        "rolling": rolling,
        "monthly": monthly,
        "weekday": weekday,
        "yoy": yoy_list,
        "acf": acf_data,
        "significance": round(significance, 4),
        "decomposition": decomposition,
        "categories": categories,
        "markets": markets,
        "multi_target": multi_target,
        "scale_preview": scale_preview,
        "preprocessing_steps": preprocessing_steps,
    }

    _cache[filepath] = result
    return result
