
import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center">
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500"></div>
    </div>
  );
};

export default LoadingSpinner;
