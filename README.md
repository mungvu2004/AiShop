# Supply Chain Forecasting App

Ứng dụng web dự báo chuỗi cung ứng sử dụng mô hình Facebook Prophet và mạng LSTM, xây dựng với FastAPI và React (Vite).

## Yêu cầu hệ thống
- Python 3.10+
- Node.js 18+

## Cấu trúc dự án
- `/backend`: Mã nguồn FastAPI, API và xử lý ML/DL.
- `/frontend`: Giao diện React, Tailwind CSS, Recharts.

## Hướng dẫn cài đặt và chạy (Quick Start)

### 1. Backend
1. Mở terminal và di chuyển vào thư mục backend:
   ```bash
   cd backend
   ```
2. Tạo môi trường ảo (khuyến nghị) và cài đặt thư viện:
   ```bash
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   ```
3. Chạy server FastAPI:
   ```bash
   uvicorn main:app --reload
   ```
   Backend sẽ chạy tại `http://localhost:8000`.

### 2. Frontend
1. Mở terminal khác và di chuyển vào thư mục frontend:
   ```bash
   cd frontend
   ```
2. Cài đặt các thư viện:
   ```bash
   npm install
   ```
3. Khởi động Vite server:
   ```bash
   npm run dev
   ```
   Giao diện sẽ chạy tại `http://localhost:5173`.

## Các tính năng
- **Prophet**: Cho phép tinh chỉnh `changepoint_prior_scale` và `seasonality_mode`.
- **LSTM**: Cho phép tinh chỉnh `look_back` (window size), `epochs`, `batch_size`, `learning_rate`. Sử dụng WebSocket để hiển thị Progress Bar thời gian thực.
- Giao diện thiết kế theo Windows 11 Fluent Design.
