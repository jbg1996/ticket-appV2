import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type PopoverContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const PopoverContext = createContext<PopoverContextValue | null>(null);

type PopoverProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
};

export function Popover({ open, onOpenChange, children }: PopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const resolvedOpen = open ?? internalOpen;

  const context = useMemo(
    () => ({
      open: resolvedOpen,
      setOpen: (nextOpen: boolean) => {
        if (open === undefined) {
          setInternalOpen(nextOpen);
        }
        onOpenChange?.(nextOpen);
      }
    }),
    [resolvedOpen, open, onOpenChange]
  );

  return <PopoverContext.Provider value={context}>{children}</PopoverContext.Provider>;
}

type PopoverTriggerProps = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
};

export function PopoverTrigger({ children, className, disabled }: PopoverTriggerProps) {
  const context = useContext(PopoverContext);
  if (!context) {
    throw new Error('PopoverTrigger must be used within Popover');
  }

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        if (!disabled) {
          context.setOpen(!context.open);
        }
      }}
      aria-expanded={context.open}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

type PopoverContentProps = {
  children: ReactNode;
  className?: string;
};

export function PopoverContent({ children, className }: PopoverContentProps) {
  const context = useContext(PopoverContext);
  if (!context) {
    throw new Error('PopoverContent must be used within Popover');
  }

  if (!context.open) return null;

  return (
    <div className={className} role="dialog">
      {children}
    </div>
  );
}

export function usePopoverContext() {
  const context = useContext(PopoverContext);
  if (!context) {
    throw new Error('usePopoverContext must be used within Popover');
  }
  return context;
}
