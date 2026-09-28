import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ROLE_EMOJI } from '@/lib/familyConstants';
import { cn } from '@/lib/utils';

const SIZES = {
  sm: 'h-8 w-8 text-base',
  md: 'h-11 w-11 text-lg',
  lg: 'h-16 w-16 text-2xl',
  xl: 'h-24 w-24 text-4xl',
};

export default function MemberAvatar({ member, size = 'md', className }) {
  if (!member) return null;
  return (
    <Avatar className={cn(SIZES[size], className, 'ring-2 ring-background shadow-sm')}>
      {member.avatar_url ? <AvatarImage src={member.avatar_url} alt={member.full_name} /> : null}
      <AvatarFallback className="bg-accent/25">
        {member.avatar_url ? (member.full_name?.[0] || '?') : (ROLE_EMOJI[member.family_role] || '🙂')}
      </AvatarFallback>
    </Avatar>
  );
}