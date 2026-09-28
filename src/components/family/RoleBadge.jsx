import { ROLE_LABELS, ROLE_COLORS } from '@/lib/familyConstants';
import { cn } from '@/lib/utils';

export default function RoleBadge({ role, className }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold select-none', ROLE_COLORS[role] || 'bg-muted text-muted-foreground', className)}>
      {ROLE_LABELS[role] || role}
    </span>
  );
}