import pandas as pd
import sys

DATA_PATH = r"F:\LtsmandProphet\data\DataCoSupplyChainDataset.csv"

def test():
    try:
        print("Loading CSV...")
        sys.stdout.flush()
        columns = ["shipping date (DateOrders)", "Order Item Quantity"]
        df = pd.read_csv(DATA_PATH, usecols=columns, encoding='latin1')
        print(f"Loaded CSV. Shape: {df.shape}")
        sys.stdout.flush()
        
        df.rename(columns={
            "shipping date (DateOrders)": "ds",
            "Order Item Quantity": "y"
        }, inplace=True)
        
        print("Converting datetime...")
        sys.stdout.flush()
        df['ds'] = pd.to_datetime(df['ds'], errors='coerce')
        print("Datetime converted.")
        sys.stdout.flush()
        
        df.dropna(subset=['ds', 'y'], inplace=True)
        print("Dropped NaNs.")
        sys.stdout.flush()
        
        df.set_index('ds', inplace=True)
        df_agg = df.resample('W').sum().reset_index()
        print(f"Aggregated. Final shape: {df_agg.shape}")
        sys.stdout.flush()
        
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test()
