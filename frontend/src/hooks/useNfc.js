import { useState, useCallback } from 'react';

export const useNfc = () => {
  const [isSupported, setIsSupported] = useState('NDEFReader' in window);
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState(null);

  const startReading = useCallback(async (onRead, onError) => {
    if (!isSupported) {
      const err = new Error('NFC is not supported on this device');
      setError(err);
      onError?.(err);
      return;
    }

    try {
      const ndef = new window.NDEFReader();
      await ndef.scan();
      
      setIsReading(true);
      setError(null);

      ndef.addEventListener('reading', ({ serialNumber }) => {
        // Convert serial number to uppercase hex string
        const uid = serialNumber.replace(/:/g, '').toUpperCase();
        onRead?.(uid);
      });

      ndef.addEventListener('readingerror', () => {
        const err = new Error('Cannot read NFC tag');
        setError(err);
        onError?.(err);
      });

      return () => {
        setIsReading(false);
      };
    } catch (err) {
      setError(err);
      onError?.(err);
      setIsReading(false);
    }
  }, [isSupported]);

  const stopReading = useCallback(() => {
    setIsReading(false);
  }, []);

  return {
    isSupported,
    isReading,
    error,
    startReading,
    stopReading
  };
};
