import type { SVGProps } from 'react';

export function LayoutDashboard(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox={props.viewBox ?? '0 0 24 24'}
      fill={props.fill ?? 'none'}
      stroke={props.stroke ?? 'currentColor'}
      strokeWidth={props.strokeWidth ?? 2}
      strokeLinecap={props.strokeLinecap ?? 'round'}
      strokeLinejoin={props.strokeLinejoin ?? 'round'}
      aria-hidden={props['aria-hidden'] ?? true}
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="4" rx="1" />
      <rect x="14" y="9" width="7" height="12" rx="1" />
      <rect x="3" y="12" width="7" height="9" rx="1" />
    </svg>
  );
}
