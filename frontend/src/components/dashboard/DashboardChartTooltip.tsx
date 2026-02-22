type DashboardTooltipPayloadItem = {
  dataKey?: string | number;
  name?: string;
  value?: unknown;
  color?: string;
};

type DashboardTooltipProps = {
  active?: boolean;
  payload?: DashboardTooltipPayloadItem[];
  label?: string | number;
  titleFormatter?: (label: string) => string;
  valueFormatter?: (value: unknown, name: string) => string;
};

const defaultValueFormatter = (value: unknown, name: string) => `${name}: ${String(value ?? 0)}`;

export function DashboardChartTooltip({
  active,
  payload,
  label,
  titleFormatter,
  valueFormatter = defaultValueFormatter
}: DashboardTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const heading = typeof label === 'string' ? label : String(label ?? '');

  return (
    <div className="dashboard-tooltip">
      {heading ? <p className="dashboard-tooltip__title">{titleFormatter ? titleFormatter(heading) : heading}</p> : null}
      <ul>
        {payload.map((item) => (
          <li key={`${item.dataKey ?? item.name}-${item.name}`}>
            <span style={{ backgroundColor: item.color ?? '#94a3b8' }} />
            {valueFormatter(item.value, item.name ?? String(item.dataKey ?? 'Valor'))}
          </li>
        ))}
      </ul>
    </div>
  );
}
