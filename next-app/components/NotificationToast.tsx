import { useEffect, useState } from 'react';
import { pusherClient, type TransactionNotification } from '../lib/pusher';

interface Toast {
  id: string;
  type: 'success' | 'error';
  message: string;
  txHash?: string;
}

export default function NotificationToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    // Subscribe to Pusher channel
    const channel = pusherClient.subscribe('relief-notifications');
    
    channel.bind('transaction-update', (notification: TransactionNotification) => {
      const toast: Toast = {
        id: Date.now().toString(),
        type: notification.type,
        message: notification.message,
        txHash: notification.txHash,
      };
      
      setToasts(prev => [...prev, toast]);
      
      // Auto-remove toast after 5 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id));
      }, 5000);
    });

    return () => {
      channel.unbind('transaction-update');
      pusherClient.unsubscribe('relief-notifications');
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`p-4 rounded-lg shadow-lg max-w-md transition-all duration-300 ${
            toast.type === 'success' 
              ? 'bg-green-100 border-l-4 border-green-500 text-green-700' 
              : 'bg-red-100 border-l-4 border-red-500 text-red-700'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center">
                <span className="text-lg mr-2">
                  {toast.type === 'success' ? '✅' : '❌'}
                </span>
                <p className="font-medium">{toast.message}</p>
              </div>
              {toast.txHash && (
                <p className="text-sm mt-1 opacity-75">
                  Tx: {toast.txHash.slice(0, 10)}...{toast.txHash.slice(-8)}
                </p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
} 