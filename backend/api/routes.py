import os
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'
import tensorflow as tf

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from backend.schemas.models import ProphetConfig, LSTMConfig, TrainingResponse
from backend.api.websockets import manager
from backend.services.data_pipeline import load_and_preprocess
from backend.services.model_registry import get_training_run, list_training_runs, save_training_run
from backend.services.prophet_service import train_prophet
from backend.services.lstm_service import train_lstm
from backend.services.data_service import get_data_info

router = APIRouter()

# Đường dẫn dữ liệu tính từ vị trí file (project_root/data/...)
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_PATH = os.path.join(_PROJECT_ROOT, "data", "DataCoSupplyChainDataset.csv")


@router.get("/health")
def health():
    return {
        "status": "ok",
        "data_file_exists": os.path.isfile(DATA_PATH),
        "data_path": DATA_PATH,
    }


@router.get("/data/info")
def data_info():
    try:
        return get_data_info(DATA_PATH)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/train/options")
def train_options():
    return {
        "targets": [
            {"value": "quantity", "label": "Số lượng", "description": "Dự báo nhu cầu số lượng sản phẩm."},
            {"value": "sales", "label": "Doanh thu", "description": "Dự báo tổng doanh thu theo thời gian."},
            {"value": "profit", "label": "Lợi nhuận", "description": "Dự báo tổng lợi nhuận theo thời gian."},
        ],
        "aggregations": [
            {"value": "D", "label": "Theo ngày", "description": "Chi tiết hơn, phù hợp với biến động ngắn hạn."},
            {"value": "W", "label": "Theo tuần", "description": "Mượt hơn, phù hợp lập kế hoạch trung hạn."},
        ],
        "model_architectures": [
            {"value": "LSTM", "label": "LSTM", "description": "Mặc định ổn định cho nhiều bài toán chuỗi."},
            {"value": "GRU", "label": "GRU", "description": "Gọn hơn LSTM, thường train nhanh hơn."},
            {"value": "BiLSTM", "label": "BiLSTM", "description": "Ngữ cảnh hai chiều, chi phí tính toán cao hơn."},
        ],
        "prophet": {
            "daily_seasonality": {"default": False, "description": "Bật chu kỳ theo ngày, phù hợp hơn khi tổng hợp theo ngày."},
            "yearly_seasonality": {"default": True, "description": "Bật chu kỳ theo năm."},
            "weekly_seasonality": {"default": True, "description": "Bật chu kỳ theo tuần."},
            "interval_width": {"min": 0.5, "max": 0.99, "default": 0.8},
            "uncertainty_samples": {"min": 100, "max": 5000, "default": 1000},
        },
        "lstm": {
            "early_stopping": {"default": True, "description": "Tự dừng khi val_loss không còn cải thiện."},
            "patience": {"min": 1, "max": 50, "default": 10},
            "min_delta": {"min": 0.0, "max": 1.0, "default": 0.0001},
            "shuffle": {"default": False, "description": "Xáo trộn batch khi train. Với chuỗi thời gian thường để tắt."},
        },
    }


@router.get("/models/runs")
def model_runs():
    return {"items": list_training_runs()}


@router.get("/models/runs/{run_id}")
def model_run_detail(run_id: str):
    payload = get_training_run(run_id)
    if payload is None:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy run_id={run_id}")
    return payload


@router.websocket("/ws/progress")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@router.post("/train/prophet", response_model=TrainingResponse)
def api_train_prophet(config: ProphetConfig):
    try:
        manager.broadcast_sync({
            "type": "status",
            "progress": 5,
            "phase": "prophet_preprocessing",
            "message": "Đang đọc dữ liệu, tổng hợp chuỗi và chuẩn bị cho Prophet.",
        })
        df, preprocessing_summary = load_and_preprocess(
            DATA_PATH,
            aggregation=config.aggregation,
            target_column=config.target_column,
            include_summary=True,
        )
        if len(df) < 14:
            raise HTTPException(status_code=400, detail="Dữ liệu quá ngắn để huấn luyện Prophet ổn định.")
        result = train_prophet(
            df=df,
            changepoint_prior_scale=config.changepoint_prior_scale,
            seasonality_mode=config.seasonality_mode,
            periods=config.periods,
            freq=config.aggregation,
            n_changepoints=config.n_changepoints,
            changepoint_range=config.changepoint_range,
            daily_seasonality=config.daily_seasonality,
            yearly_seasonality=config.yearly_seasonality,
            weekly_seasonality=config.weekly_seasonality,
            seasonality_prior_scale=config.seasonality_prior_scale,
            interval_width=config.interval_width,
            uncertainty_samples=config.uncertainty_samples,
        )
        trained_model = result.pop("_trained_model", None)
        registry_entry = save_training_run(
            model_type=result.get("model_type", "Prophet"),
            metrics=result["metrics"],
            training_config=config.model_dump(),
            preprocessing_summary={
                **preprocessing_summary,
                "normalized_for_model": False,
                "normalization_method": None,
                "normalized_range": None,
                "original_min": None,
                "original_max": None,
            },
            backtest=result.get("backtest"),
            error_analysis=result.get("error_analysis"),
            split_summary=result.get("split_summary"),
            artifact_payload={
                "trained_model": trained_model,
            },
        )
        result["target_column"] = config.target_column
        result["preprocessing_summary"] = registry_entry["preprocessing_summary"]
        result["training_config"] = config.model_dump()
        result["run_id"] = registry_entry["run_id"]
        result["model_version"] = registry_entry["model_version"]
        result["created_at"] = registry_entry["created_at"]
        result["artifact_dir"] = registry_entry["artifact_dir"]
        manager.broadcast_sync({
            "type": "complete",
            "progress": 100,
            "phase": "prophet_complete",
            "message": "Huấn luyện Prophet và các bước đánh giá đã hoàn tất.",
        })
        return result
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/train/lstm", response_model=TrainingResponse)
async def api_train_lstm(config: LSTMConfig):
    try:
        await manager.broadcast({
            "type": "status",
            "progress": 4,
            "phase": "lstm_preload",
            "message": "Đang đọc dữ liệu và dựng chuỗi đầu vào cho mô hình recurrent.",
        })
        df, preprocessing_summary = load_and_preprocess(
            DATA_PATH,
            aggregation=config.aggregation,
            target_column=config.target_column,
            include_summary=True,
        )
        minimum_rows = config.look_back + 5
        if len(df) < minimum_rows:
            raise HTTPException(
                status_code=400,
                detail=f"Dữ liệu không đủ dài cho look_back={config.look_back}. Cần ít nhất {minimum_rows} dòng sau tổng hợp.",
            )
        if config.early_stopping and config.validation_split <= 0:
            raise HTTPException(
                status_code=400,
                detail="Muốn dùng early stopping thì validation_split phải lớn hơn 0.",
            )
        result = await train_lstm(
            df=df,
            look_back=config.look_back,
            epochs=config.epochs,
            batch_size=config.batch_size,
            learning_rate=config.learning_rate,
            periods=config.periods,
            freq=config.aggregation,
            num_layers=config.num_layers,
            units=config.units,
            dropout=config.dropout,
            validation_split=config.validation_split,
            early_stopping=config.early_stopping,
            patience=config.patience,
            min_delta=config.min_delta,
            shuffle=config.shuffle,
            model_arch=config.model_arch,
        )
        trained_model = result.pop("_trained_model", None)
        scaler = result.pop("_scaler", None)
        registry_entry = save_training_run(
            model_type=result.get("model_type", config.model_arch),
            metrics=result["metrics"],
            training_config=config.model_dump(),
            preprocessing_summary={
                **preprocessing_summary,
                "normalized_for_model": True,
                "normalization_method": "MinMaxScaler",
                "normalized_range": [0.0, 1.0],
                "original_min": float(df['y'].min()),
                "original_max": float(df['y'].max()),
            },
            backtest=result.get("backtest"),
            error_analysis=result.get("error_analysis"),
            split_summary=result.get("split_summary"),
            artifact_payload={
                "trained_model": trained_model,
                "scaler": scaler,
            },
        )
        result["target_column"] = config.target_column
        result["preprocessing_summary"] = registry_entry["preprocessing_summary"]
        result["training_config"] = config.model_dump()
        result["run_id"] = registry_entry["run_id"]
        result["model_version"] = registry_entry["model_version"]
        result["created_at"] = registry_entry["created_at"]
        result["artifact_dir"] = registry_entry["artifact_dir"]
        return result
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
