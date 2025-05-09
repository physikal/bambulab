import React, { useState } from 'react';
import { X } from 'lucide-react';
import { printersApi } from '../services/api';
import { PrinterConfig } from '../../shared/types';

interface AddPrinterModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const AddPrinterModal: React.FC<AddPrinterModalProps> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState<Omit<PrinterConfig, 'userId'>>({
    name: '',
    ipAddress: '',
    serialNumber: '',
    accessCode: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name || !formData.ipAddress || !formData.accessCode) {
      setError('Please fill all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await printersApi.create(formData as PrinterConfig);
      onSuccess();
    } catch (err: any) {
      console.error('Failed to add printer:', err);
      setError(err.response?.data?.message || 'Failed to add printer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-md p-6 relative animate-fadeIn">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X size={20} />
        </button>
        
        <h2 className="text-2xl font-bold text-white mb-6">Add New Printer</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-md text-red-200">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-gray-300 mb-1">
              Printer Name*
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="My Bambu Lab X1C"
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="ipAddress" className="block text-gray-300 mb-1">
              IP Address*
            </label>
            <input
              type="text"
              id="ipAddress"
              name="ipAddress"
              value={formData.ipAddress}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="192.168.1.100"
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="serialNumber" className="block text-gray-300 mb-1">
              Serial Number
            </label>
            <input
              type="text"
              id="serialNumber"
              name="serialNumber"
              value={formData.serialNumber}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="BBLP12345"
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="accessCode" className="block text-gray-300 mb-1">
              Access Code*
            </label>
            <input
              type="text"
              id="accessCode"
              name="accessCode"
              value={formData.accessCode}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="123456"
              required
            />
            <p className="text-sm text-gray-400 mt-1">
              Found in Bambu Lab app under Printer Settings
            </p>
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-md text-white transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Adding...' : 'Add Printer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPrinterModal;