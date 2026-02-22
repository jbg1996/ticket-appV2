import type { ReactNode } from 'react';

type ChartEmptyStateProps = {
  title?: string;
  description?: string;
  icon?: ReactNode;
  height?: number;
};

export function ChartEmptyState({
  title = 'No hay datos',
  description = 'No hay datos en el rango seleccionado',
  icon,
  height = 280
}: ChartEmptyStateProps) {
  return (
    <div className="chart-empty-state" style={{ height }} role="status" aria-live="polite">
      {icon ? <div className="chart-empty-state__icon">{icon}</div> : null}
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}
