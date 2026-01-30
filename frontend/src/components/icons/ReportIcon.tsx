type ReportIconProps = {
  size?: number;
  className?: string;
};

export function ReportIcon({ size = 20, className }: ReportIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M4 4h16v16H4z" />
      <path d="M8 16V8" />
      <path d="M12 16V12" />
      <path d="M16 16V6" />
    </svg>
  );
}
