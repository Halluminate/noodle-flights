import { useState, useCallback } from "react";

/**
 * Simple hook for managing popover open/close state
 * Use this for basic popovers that only need open/close functionality
 */
export function usePopoverState(initialOpen: boolean = false) {
  const [isOpen, setIsOpen] = useState(initialOpen);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return {
    isOpen,
    open,
    close,
    toggle,
    setIsOpen,
  } as const;
}

/**
 * Advanced hook for managing popover state with temporary values
 * Use this for popovers that need to manage temporary state with cancel/confirm actions
 */
export function usePopoverWithTempState<T>(
  currentValue: T,
  onConfirm: (value: T) => void,
  initialOpen: boolean = false,
  autoSaveOnClose: boolean = false
) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [tempValue, setTempValue] = useState<T>(currentValue);

  const open = useCallback(() => {
    setTempValue(currentValue); // Reset temp value to current when opening
    setIsOpen(true);
  }, [currentValue]);

  const close = useCallback(() => {
    if (autoSaveOnClose) {
      onConfirm(tempValue); // Auto-save changes when closing
    }
    setIsOpen(false);
  }, [autoSaveOnClose, tempValue, onConfirm]);

  const cancel = useCallback(() => {
    setTempValue(currentValue); // Reset temp value to current
    setIsOpen(false);
  }, [currentValue]);

  const confirm = useCallback(() => {
    onConfirm(tempValue); // Commit temp value
    setIsOpen(false);
  }, [tempValue, onConfirm]);

  // Update temp value when current value changes (external updates)
  const updateTempValue = useCallback((updater: T | ((prev: T) => T)) => {
    setTempValue(
      typeof updater === "function" ? (updater as (prev: T) => T) : updater
    );
  }, []);

  // Reset temp value when current value changes externally
  const resetTempValue = useCallback(() => {
    setTempValue(currentValue);
  }, [currentValue]);

  return {
    isOpen,
    tempValue,
    open,
    close,
    cancel,
    confirm,
    setTempValue: updateTempValue,
    resetTempValue,
    setIsOpen,
  } as const;
}
