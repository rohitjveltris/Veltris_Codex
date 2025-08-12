import { useState, useEffect, useCallback, useRef } from 'react';
import { checkHealthStatus } from '@/lib/api';
import { ConnectionStatus, ConnectionState, ModelInfo } from '@/types/api';
import { getModelSpecificStatus } from '@/utils/modelMapping';

const HEALTH_CHECK_INTERVAL = 60000; // 60 seconds - reduced frequency due to slow health checks
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY_BASE = 1000; // Base delay for exponential backoff

export const useConnectionStatus = (selectedModel: ModelInfo | null = null, modelsLoaded: boolean = false) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'checking',
    lastChecked: Date.now(),
    services: {
      gateway: false,
      ai_service: false,
      openai: false,
      anthropic: false,
    },
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const statusDelayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCheckingRef = useRef(false);
  const hasInitialHealthCheckRef = useRef(false);

  const getConnectionStatus = useCallback((): ConnectionStatus => {
    const services = {
      gateway: true,
      ai_service: true,
      openai: true,
      anthropic: false, // Claude is always offline in our hardcoded version
    };
    
    return getModelSpecificStatus(selectedModel, services, modelsLoaded, hasInitialHealthCheckRef.current);
  }, [selectedModel, modelsLoaded]);

  const updateStatusWithDelay = useCallback(() => {
    if (!modelsLoaded || !selectedModel) {
      return;
    }

    // Clear any existing timeout
    if (statusDelayTimeoutRef.current) {
      clearTimeout(statusDelayTimeoutRef.current);
    }

    // Set status to checking immediately
    setConnectionState(prev => ({
      ...prev,
      status: 'checking',
      lastChecked: Date.now()
    }));

    // After 3 seconds, set the final status based on model type
    statusDelayTimeoutRef.current = setTimeout(() => {
      const finalStatus = getConnectionStatus();
      
      setConnectionState({
        status: finalStatus,
        lastChecked: Date.now(),
        services: {
          gateway: true,
          ai_service: true,
          openai: true,
          anthropic: false, // Claude is always offline
        },
        error: undefined,
      });
      
      hasInitialHealthCheckRef.current = true;
    }, 3000); // 3 second delay
  }, [selectedModel, modelsLoaded, getConnectionStatus]);

  const startHealthMonitoring = useCallback(() => {
    // Perform initial status update with delay
    updateStatusWithDelay();
    
    // No periodic checks needed for hardcoded status
  }, [updateStatusWithDelay]);

  const stopHealthMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    if (statusDelayTimeoutRef.current) {
      clearTimeout(statusDelayTimeoutRef.current);
      statusDelayTimeoutRef.current = null;
    }
  }, []);

  const manualRefresh = useCallback(() => {
    hasInitialHealthCheckRef.current = false;
    updateStatusWithDelay();
  }, [updateStatusWithDelay]);

  useEffect(() => {
    startHealthMonitoring();
    
    return () => {
      stopHealthMonitoring();
    };
  }, [startHealthMonitoring, stopHealthMonitoring]);

  // Handle page visibility changes to refresh when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && connectionState.status === 'disconnected') {
        manualRefresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [connectionState.status, manualRefresh]);

  // Re-run status update when selected model changes
  useEffect(() => {
    if (selectedModel && modelsLoaded) {
      hasInitialHealthCheckRef.current = false;
      updateStatusWithDelay();
    }
  }, [selectedModel?.id, modelsLoaded, updateStatusWithDelay]);

  return {
    connectionState,
    isConnected: connectionState.status === 'connected',
    isDisconnected: connectionState.status === 'disconnected',
    isChecking: connectionState.status === 'checking',
    manualRefresh,
  };
};