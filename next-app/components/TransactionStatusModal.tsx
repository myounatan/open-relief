import { useEffect, useState } from 'react';
import { pusherClient, type TransactionNotification } from '../lib/pusher';

interface TransactionStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'success' | 'error';
  message: string;
  txHash?: string;
}

const TransactionStatusModal: React.FC<TransactionStatusModalProps> = ({
  isOpen,
  onClose,
  type,
  message,
  txHash,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">
            {type === 'success' ? 'Transaction Success' : 'Transaction Failed'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {type === 'success' && (
          <div className="text-center">
            <div className="text-green-500 text-4xl mb-4">✓</div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Identity Verified and your claim has been processed!
            </h3>
            <p className="text-sm text-slate-300 mb-4">
              You can now close this window.
            </p>
            {txHash && (
              <p className="text-xs text-slate-500 mb-4 break-all">
                Transaction: {txHash}
              </p>
            )}
            <button
              onClick={onClose}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {type === 'error' && (
          <div className="text-center">
            <div className="text-red-500 text-4xl mb-4">✗</div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Transaction Failed
            </h3>
            <p className="text-sm text-slate-300 mb-4">
              {message}
            </p>
            <button
              onClick={onClose}
              className="w-full bg-slate-600 hover:bg-slate-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Hook for managing transaction status notifications
export const useTransactionNotifications = () => {
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    type: 'success' | 'error';
    message: string;
    txHash?: string;
  }>({
    isOpen: false,
    type: 'success',
    message: '',
  });

  useEffect(() => {
    // Subscribe to Pusher channel
    const channel = pusherClient.subscribe('relief-notifications');
    
    channel.bind('transaction-update', (data: TransactionNotification) => {
      setNotification({
        isOpen: true,
        type: data.type,
        message: data.message,
        txHash: data.txHash,
      });
    });

    return () => {
      channel.unbind('transaction-update');
      pusherClient.unsubscribe('relief-notifications');
    };
  }, []);

  const closeNotification = () => {
    setNotification(prev => ({ ...prev, isOpen: false }));
  };

  return {
    notification,
    closeNotification,
  };
};

export default TransactionStatusModal; 