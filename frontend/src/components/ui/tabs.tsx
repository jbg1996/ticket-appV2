import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type TabsContextValue = {
  value: string;
  setValue: (value: string) => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

type TabsProps = {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
};

export function Tabs({ defaultValue, value, onValueChange, children, className }: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const resolvedValue = value ?? internalValue;

  const context = useMemo(
    () => ({
      value: resolvedValue,
      setValue: (nextValue: string) => {
        if (!value) {
          setInternalValue(nextValue);
        }
        onValueChange?.(nextValue);
      }
    }),
    [resolvedValue, value, onValueChange]
  );

  return (
    <TabsContext.Provider value={context}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

type TabsListProps = {
  children: ReactNode;
  className?: string;
};

export function TabsList({ children, className }: TabsListProps) {
  return <div className={className}>{children}</div>;
}

type TabsTriggerProps = {
  value: string;
  children: ReactNode;
  className?: string;
  title?: string;
};

export function TabsTrigger({ value, children, className, title }: TabsTriggerProps) {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('TabsTrigger must be used within Tabs');
  }
  const isActive = context.value === value;
  return (
    <button
      type="button"
      className={className}
      data-state={isActive ? 'active' : 'inactive'}
      onClick={() => context.setValue(value)}
      title={title}
    >
      {children}
    </button>
  );
}

type TabsContentProps = {
  value: string;
  children: ReactNode;
  className?: string;
};

export function TabsContent({ value, children, className }: TabsContentProps) {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('TabsContent must be used within Tabs');
  }

  if (context.value !== value) return null;

  return <div className={className}>{children}</div>;
}
