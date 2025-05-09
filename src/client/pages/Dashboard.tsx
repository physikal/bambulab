import React, { useEffect, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import PrinterCard from '../components/PrinterCard';
import AddPrinterModal from '../components/AddPrinterModal';
import { printersApi } from '../services/api';
import socketService from '../services/socket';
import { Printer } from '../../shared/types';

const Dashboard: React.FC = () => {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddPrinterModal, setShowAddPrinterModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPrinters();
    // Connect to socket
    socketService.connect();

    // Subscribe to printer updates
    const unsubscribePrinterUpdate = socketService.on<Printer>('printerUpdate', (updatedPrinter) => {
      setPrinters(prev => 
        prev.map(p => p.id === updatedPrinter.id ? updatedPrinter : p)
      );
    });

    return () => {
      // Clean up socket subscriptions
      unsubscribePrinterUpdate();
    };
  }, []);

  useEffect(() => {
    // Subscribe to each printer's updates
    printers.forEach(printer => {
      if (printer && printer.id) {
        socketService.subscribeToPrinter(Number(printer.id));
      }
    });

    return () => {
      // Unsubscribe from printer updates on unmount
      printers.forEach(printer => {
        if (printer && printer.id) {
          socketService.unsubscribeFromPrinter(Number(printer.id));
        }
      });
    };
  }, [printers]);

  const fetchPrinters = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await printersApi.getAll();
      
      // Ensure all IDs are numbers
      const normalizedData = data.map(printer => ({
        ...printer,
        id: Number(printer.id),
        userId: printer.userId ? Number(printer.userId) : undefined,
        status: {
          ...printer.status,
          progress: Number(printer.status.progress || 0),
          timeRemaining: Number(printer.status.timeRemaining || 0),
          temperature: printer.status.temperature ? {
            nozzle: Number(printer.status.temperature.nozzle || 0),
            bed: Number(printer.status.temperature.bed || 0)
          } : undefined
        }
      }));
      
      setPrinters(normalizedData);
    } catch (err: any) {
      console.error('Failed to fetch printers:', err);
      setError(err.response?.data?.message || 'Failed to load printers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchPrinters();
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddPrinterSuccess = () => {
    setShowAddPrinterModal(false);
    fetchPrinters();
  };

  if (loading && !refreshing) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin text-blue-500">
          <RefreshCw size={40} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Printer Dashboard</h1>
            <p className="text-gray-400 mt-1">
              Monitor and control your BambuLab 3D printers
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-md text-white transition-colors"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button 
              onClick={() => setShowAddPrinterModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-md text-white transition-colors"
            >
              <Plus size={16} />
              Add Printer
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-md text-red-200">
          {error}
        </div>
      )}

      {printers.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-10 text-center">
          <div className="mb-4 text-gray-300">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-700 mb-4">
              <Plus size={32} className="text-blue-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No printers added yet</h2>
            <p className="text-gray-400 max-w-md mx-auto">
              Add your first BambuLab 3D printer to start monitoring and controlling it remotely.
            </p>
          </div>
          <button
            onClick={() => setShowAddPrinterModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-md text-white transition-colors"
          >
            Add Your First Printer
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {printers.map(printer => (
            <PrinterCard 
              key={printer.id} 
              printer={printer} 
              onRefresh={handleRefresh}
            />
          ))}
        </div>
      )}

      {showAddPrinterModal && (
        <AddPrinterModal
          onClose={() => setShowAddPrinterModal(false)}
          onSuccess={handleAddPrinterSuccess}
        />
      )}
    </div>
  );
};

export default Dashboard;