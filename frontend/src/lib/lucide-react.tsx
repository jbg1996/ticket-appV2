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

export function ChevronDown(props: SVGProps<SVGSVGElement>) {
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
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function ArrowUpAZ(props: SVGProps<SVGSVGElement>) {
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
      <line x1="12" y1="20" x2="12" y2="4" />
      <polyline points="6 10 12 4 18 10" />
      <path d="M3 20h5" />
      <path d="M3 16l5 4" />
      <path d="M16 16h5" />
      <path d="M16 20h5" />
      <path d="M16 16l5 4" />
    </svg>
  );
}

export function ArrowDownZA(props: SVGProps<SVGSVGElement>) {
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
      <line x1="12" y1="4" x2="12" y2="20" />
      <polyline points="6 14 12 20 18 14" />
      <path d="M3 4h5" />
      <path d="M3 8l5-4" />
      <path d="M16 4h5" />
      <path d="M16 8h5" />
      <path d="M16 4l5 4" />
    </svg>
  );
}

export function ArrowUp(props: SVGProps<SVGSVGElement>) {
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
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}

export function ArrowDown(props: SVGProps<SVGSVGElement>) {
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
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="5 12 12 19 19 12" />
    </svg>
  );
}

export function Filter(props: SVGProps<SVGSVGElement>) {
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
      <polygon points="22 3 2 3 10 12 10 19 14 21 14 12 22 3" />
    </svg>
  );
}

export function Plus(props: SVGProps<SVGSVGElement>) {
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
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function Trash2(props: SVGProps<SVGSVGElement>) {
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
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

export function FileText(props: SVGProps<SVGSVGElement>) {
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
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}
