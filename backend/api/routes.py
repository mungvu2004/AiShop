import os
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'
import tensorflow as tf

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from backend.schemas.models import ProphetConfig, LSTMConfig, TrainingResponse
from backend.api.websockets import manager
from backend.services.data_pipeline import load_and_preprocess
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
        df = load_and_preprocess(DATA_PATH, aggregation=config.aggregation, target_column=config.target_column)
        result = train_prophet(
            df=df,
            changepoint_prior_scale=config.changepoint_prior_scale,
            seasonality_mode=config.seasonality_mode,
            periods=config.periods,
            freq=config.aggregation,
            n_changepoints=config.n_changepoints,
            changepoint_range=config.changepoint_range,
            yearly_seasonality=config.yearly_seasonality,
            weekly_seasonality=config.weekly_seasonality,
            seasonality_prior_scale=config.seasonality_prior_scale,
            interval_width=config.interval_width,
            uncertainty_samples=config.uncertainty_samples,
        )
        result["target_column"] = config.target_column
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/train/lstm", response_model=TrainingResponse)
async def api_train_lstm(config: LSTMConfig):
    try:
        df = load_and_preprocess(DATA_PATH, aggregation=config.aggregation, target_column=config.target_column)
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
            model_arch=config.model_arch,
        )
        result["target_column"] = config.target_column
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
