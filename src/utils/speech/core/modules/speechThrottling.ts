
// Track last operation time to prevent rapid successive operations
let lastOperationTime = 0;
const MIN_OPERATION_INTERVAL = 100; // Reduced interval for better responsiveness

export const canPerformOperation = (): boolean => {
  const now = Date.now();
  if (now - lastOperationTime < MIN_OPERATION_INTERVAL) {
    return false;
  }
  lastOperationTime = now;
  return true;
};
