import { useState, useCallback, useRef } from 'react';

export interface OptimisticUpdate<T> {
  id: string;
  field: keyof T;
  value: unknown;
  timestamp: number;
}

export interface UseOptimisticUpdatesOptions<T> {
  data: T;
  onUpdate: (field: keyof T, value: unknown) => Promise<{ error: unknown }>;
  onRollback?: (field: keyof T, previousValue: unknown) => void;
  rollbackDelay?: number;
}

function applyFieldValue<T extends object>(data: T, field: keyof T, value: unknown): T {
  return { ...data, [field]: value } as T;
}

export function useOptimisticUpdates<T extends object>({
  data,
  onUpdate,
  onRollback,
  rollbackDelay = 5000,
}: UseOptimisticUpdatesOptions<T>) {
  const [optimisticData, setOptimisticData] = useState<T>(data);
  const [pendingUpdates, setPendingUpdates] = useState<Map<keyof T, OptimisticUpdate<T>>>(
    new Map()
  );
  const rollbackTimers = useRef<Map<keyof T, NodeJS.Timeout>>(new Map());

  const applyOptimisticUpdate = useCallback(
    (field: keyof T, value: unknown) => {
      const updateId = `${String(field)}-${Date.now()}`;
      const update: OptimisticUpdate<T> = {
        id: updateId,
        field,
        value,
        timestamp: Date.now(),
      };

      // Apply optimistically
      setOptimisticData(prev => applyFieldValue(prev, field, value));
      setPendingUpdates(prev => new Map(prev).set(field, update));

      // Clear existing rollback timer for this field
      const existingTimer = rollbackTimers.current.get(field);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Execute actual update
      onUpdate(field, value)
        .then(result => {
          if (result.error) {
            // Rollback on error
            const previousValue = data[field];
            setOptimisticData(prev => applyFieldValue(prev, field, previousValue));
            setPendingUpdates(prev => {
              const next = new Map(prev);
              next.delete(field);
              return next;
            });
            onRollback?.(field, previousValue);
          } else {
            // Success - remove pending update
            setPendingUpdates(prev => {
              const next = new Map(prev);
              next.delete(field);
              return next;
            });
          }
        })
        .catch(() => {
          // Rollback on exception
          const previousValue = data[field];
          setOptimisticData(prev => applyFieldValue(prev, field, previousValue));
          setPendingUpdates(prev => {
            const next = new Map(prev);
            next.delete(field);
            return next;
          });
          onRollback?.(field, previousValue);
        });

      // Set automatic rollback timer
      const timer = setTimeout(() => {
        if (pendingUpdates.has(field)) {
          const previousValue = data[field];
          setOptimisticData(prev => applyFieldValue(prev, field, previousValue));
          setPendingUpdates(prev => {
            const next = new Map(prev);
            next.delete(field);
            return next;
          });
          onRollback?.(field, previousValue);
        }
      }, rollbackDelay);

      rollbackTimers.current.set(field, timer);
    },
    [data, onUpdate, onRollback, rollbackDelay, pendingUpdates]
  );

  const isPending = useCallback(
    (field: keyof T) => pendingUpdates.has(field),
    [pendingUpdates]
  );

  const getPendingUpdate = useCallback(
    (field: keyof T) => pendingUpdates.get(field),
    [pendingUpdates]
  );

  return {
    optimisticData,
    applyOptimisticUpdate,
    isPending,
    getPendingUpdate,
    hasPendingUpdates: pendingUpdates.size > 0,
  };
}
