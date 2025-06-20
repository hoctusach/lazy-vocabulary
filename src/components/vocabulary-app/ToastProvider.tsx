
import React from 'react';
import { Toaster } from 'sonner';

const ToastProvider: React.FC = () => {
  return (
    <Toaster position="top-center" richColors closeButton />
  );
};

export default ToastProvider;
