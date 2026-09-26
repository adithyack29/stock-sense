import React from 'react';

export const LoadingState: React.FC<{ message?: string; className?: string }> = ({
  message = 'Loading data...',
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center ${className}`}>
      <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-xs font-medium text-slate-500">{message}</p>
    </div>
  );
};
