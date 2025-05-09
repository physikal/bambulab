import React, { useState } from 'react';
import { AlertTriangle, Printer, StopCircle, RefreshCw } from 'lucide-react';
import { Printer as PrinterType, PrintStatus } from '../../shared/types';
import { printersApi } from '../services/api';

interface PrinterCardProps {
  printer: PrinterType;
  onRefresh: () => void;
}

const PrinterCard: React.FC<PrinterCardProps> = ({ printer, onRefresh }) => {
  const [isStoppingPrint, setIsStoppingPrint] = useState(false);
  const [showConfirmStop, setShowConfirmStop] = useState(false);

  const handleStopPrint = async () => {
    if (!printer || !printer.id) return;
    
    try {
      setIsStoppingPrint(true);
      await printersApi.stopPrint(Number(printer.id));
      setShowConfirmStop(false);
      onRefresh();
    } catch (error) {
      console.error('Failed to stop print:', error);
    } finally {
      setIsStoppingPrint(false);
    }
  };

  const getStatusColor = () => {
    switch (printer?.status?.status) {
      case PrintStatus.PRINTING:
        return 'bg-blue-600';
      case PrintStatus.COMPLETED:
        return 'bg-green-600';
      case PrintStatus.PAUSED:
        return 'bg-yellow-600';
      case PrintStatus.ERROR:
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  };

  const formatTimeRemaining = (seconds: number) => {
    if (!seconds || seconds <= 0) return '--';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getRtspUrl = () => {
    // This would be handled by the backend proxy
    if (!printer || !printer.id) return '';
    return `/api/printers/${printer.id}/stream`;
  };

  // Ensure printer object exists
  if (!printer) {
    return <div className="bg-gray-800 rounded-lg p-4 text-white">Printer data not available</div>;
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg transition-transform hover:translate-y-[-4px]">
      <div className="p-4 flex justify-between items-center border-b border-gray-700">
        <div className="flex items-center">
          <Printer className="text-blue-400 mr-2" size={20} />
          <h3 className="text-xl font-medium text-white">{printer.name}</h3>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs ${getStatusColor()} text-white`}>
          {printer.status?.status || 'Unknown'}
        </div>
      </div>
      
      <div className="relative h-48 bg-black">
        {printer.connected ? (
          <img 
            src={getRtspUrl()} 
            alt={`${printer.name} live feed`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-900">
            <div className="text-center text-gray-400">
              <AlertTriangle size={40} className="mx-auto mb-2 text-yellow-500" />
              <p>Printer disconnected</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4">
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-300 mb-1">
            <span>Progress</span>
            <span>{Number(printer.status?.progress || 0)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className={`${getStatusColor()} h-2 rounded-full transition-all duration-300 ease-in-out`} 
              style={{ width: `${Number(printer.status?.progress || 0)}%` }}
            ></div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm mb-4">
          <div className="bg-gray-700 p-2 rounded">
            <div className="text-gray-400">Time Remaining</div>
            <div className="text-white font-medium">
              {formatTimeRemaining(Number(printer.status?.timeRemaining || 0))}
            </div>
          </div>
          
          {printer.status?.temperature && (
            <div className="bg-gray-700 p-2 rounded">
              <div className="text-gray-400">Temperature</div>
              <div className="text-white font-medium">
                N: {Number(printer.status.temperature.nozzle || 0)}°C | B: {Number(printer.status.temperature.bed || 0)}°C
              </div>
            </div>
          )}
          
          {printer.status?.currentFile && (
            <div className="bg-gray-700 p-2 rounded col-span-2">
              <div className="text-gray-400">File</div>
              <div className="text-white font-medium truncate">
                {printer.status.currentFile}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-between mt-4">
          <button 
            onClick={onRefresh}
            className="flex items-center px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm transition-colors"
          >
            <RefreshCw size={16} className="mr-1" /> Refresh
          </button>
          
          {printer.status?.status === PrintStatus.PRINTING && (
            <>
              {showConfirmStop ? (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowConfirmStop(false)}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleStopPrint}
                    disabled={isStoppingPrint}
                    className="flex items-center px-3 py-2 bg-red-700 hover:bg-red-600 rounded text-white text-sm transition-colors"
                  >
                    {isStoppingPrint ? (
                      <>Stopping...</>
                    ) : (
                      <>
                        <StopCircle size={16} className="mr-1" /> Confirm
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setShowConfirmStop(true)}
                  className="flex items-center px-3 py-2 bg-red-700 hover:bg-red-600 rounded text-white text-sm transition-colors"
                >
                  <StopCircle size={16} className="mr-1" /> Stop Print
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrinterCard;