// src/hooks/useCurrentTime.ts
import { useState, useEffect } from 'react';

/**
 * @interface UseCurrentTimeOptions
 * @description Options for the useCurrentTime hook.
 */
interface UseCurrentTimeOptions {
  refreshInterval?: number; // in milliseconds
}

/**
 * @function useCurrentTime
 * @description Custom hook to get the current time, updated at a specified interval.
 * @param {UseCurrentTimeOptions} options - Configuration options for the hook.
 * @returns {Date} The current time.
 */
const useCurrentTime = (options: UseCurrentTimeOptions = {}): Date => {
  const { refreshInterval = 1000 } = options; // Default to 1 second
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timerId = setInterval(() => {
      setCurrentTime(new Date());
    }, refreshInterval);

    return () => {
      clearInterval(timerId);
    };
  }, [refreshInterval]);

  return currentTime;
};

export default useCurrentTime;