import { useEffect, useRef, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/Toast';
import { useStore } from './store/useStore';
import { DashboardTab } from './components/tabs/DashboardTab';
import { DataExplorerTab } from './components/tabs/DataExplorerTab';
import { TrainingTab } from './components/tabs/TrainingTab';
import { InferenceTab } from './components/tabs/InferenceTab';

const WS_URL = 'ws://localhost:8000/ws/progress';
const RECONNECT_DELAY = 3000;

function App() {
  const {
    activeTab,
    setProgress,
    addTrainingEpoch,
  } = useStore();

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnect = useRef(true);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      // Connection established silently
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'progress') {
          setProgress(data.progress ?? 0);
          if (data.epoch !== undefined && data.loss !== undefined) {
            addTrainingEpoch({ epoch: data.epoch, loss: data.loss });
          }
        } else if (data.type === 'complete') {
          setProgress(100);
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onerror = () => {
      // Suppress error log — reconnect handles it
    };

    ws.onclose = () => {
      wsRef.current = null;
      if (shouldReconnect.current) {
        reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY);
      }
    };
  }, [setProgress, addTrainingEpoch]);

  useEffect(() => {
    shouldReconnect.current = true;
    connect();

    return () => {
      shouldReconnect.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return (
    <div className="flex w-full min-h-screen bg-gray-100 overflow-hidden text-gray-900">
      <Sidebar />

      <main className="flex-1 flex overflow-hidden">
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'data' && <DataExplorerTab />}
        {activeTab === 'training' && <TrainingTab />}
        {activeTab === 'inference' && <InferenceTab />}
      </main>

      <ToastContainer />
    </div>
  );
}

export default App;
