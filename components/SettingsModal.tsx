import React, { useState, useEffect } from 'react';
import { AISettings } from '../types';
import { CloseIcon } from './Icons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: AISettings) => void;
  initialSettings: AISettings;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, initialSettings }) => {
  const [settings, setSettings] = useState<AISettings>(initialSettings);

  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(settings);
    onClose();
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({...prev, [name]: value}));
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl p-6 w-full max-w-md relative animate-fade-in-up">
        <button onClick={onClose} className="absolute top-3 right-3 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
          <CloseIcon />
        </button>
        <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-slate-100">API 设置</h2>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">URL</label>
            <input
              type="text"
              id="url"
              name="url"
              value={settings.url}
              onChange={handleInputChange}
              placeholder="https://api.openai.com/v1"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="key" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Key</label>
            <input
              type="password"
              id="key"
              name="key"
              value={settings.key}
              onChange={handleInputChange}
              placeholder="sk-..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="model" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Model</label>
            <input
              type="text"
              id="model"
              name="model"
              value={settings.model}
              onChange={handleInputChange}
              placeholder="gpt-4"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-900 transition-transform transform hover:scale-105"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};