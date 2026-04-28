import os
os.environ['KMP_DUPLICATE_LIB_OK'] = 'TRUE'
import tensorflow as tf
import asyncio
import sys
import traceback

def log(msg):
    print(msg)
    sys.stdout.flush()

try:
    log("Importing modules...")
    from backend.services.data_pipeline import load_and_preprocess
    from backend.services.prophet_service import train_prophet
    from backend.services.lstm_service import train_lstm
    log("Modules imported.")
except Exception as e:
    log("Failed to import modules")
    traceback.print_exc()
    sys.exit(1)

DATA_PATH = r"F:\LtsmandProphet\data\DataCoSupplyChainDataset.csv"

def test_pipeline():
    log("Testing data pipeline...")
    df = load_and_preprocess(DATA_PATH, aggregation="W")
    log(f"Data loaded, shape: {df.shape}")
    return df

def test_prophet(df):
    log("Testing Prophet...")
    try:
        res = train_prophet(df, changepoint_prior_scale=0.05, seasonality_mode="additive", periods=5, freq="W")
        log(f"Prophet metrics: {res['metrics']}")
    except Exception as e:
        log("Prophet failed!")
        traceback.print_exc()

async def test_lstm(df):
    log("Testing LSTM...")
    try:
        res = await train_lstm(df, look_back=3, epochs=2, batch_size=32, learning_rate=0.001, periods=5, freq="W")
        log(f"LSTM metrics: {res['metrics']}")
    except Exception as e:
        log("LSTM failed!")
        traceback.print_exc()

async def main():
    try:
        df = test_pipeline()
        test_prophet(df)
        await test_lstm(df)
        log("All backend tests finished!")
    except Exception as e:
        log("Main failed!")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
