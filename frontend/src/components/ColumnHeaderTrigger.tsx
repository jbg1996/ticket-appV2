import { ChevronDown } from 'lucide-react';

type ColumnHeaderTriggerProps = {
  label: string;
  onToggle: () => void;
  isOpen?: boolean;
};

export function ColumnHeaderTrigger({ label, onToggle }: ColumnHeaderTriggerProps) {
  return (
    <button type="button" className="column-header-trigger" onClick={onToggle}>
      <span>{label}</span>
      <ChevronDown size={14} className="column-header-trigger__chevron" />
    </button>
  );
}
