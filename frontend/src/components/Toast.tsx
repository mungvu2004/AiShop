import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useStore } from '../store/useStore';

export const ToastContainer = () => {
  const { toasts, removeToast } = useStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium min-w-64 max-w-sm
            ${toast.type === 'success' ? 'bg-green-600 text-white' : ''}
            ${toast.type === 'error' ? 'bg-red-600 text-white' : ''}
            ${toast.type === 'info' ? 'bg-blue-600 text-white' : ''}
          `}
        >
          {toast.type === 'success' && <CheckCircle className="w-4 h-4 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
          {toast.type === 'info' && <Info className="w-4 h-4 shrink-0" />}
          <span className="flex-1">{toast.message}</span>
          <button onClick={() => removeToast(toast.id)} className="shrink-0 hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
