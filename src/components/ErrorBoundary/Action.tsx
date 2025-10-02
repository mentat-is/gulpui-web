import { Badge } from '@/ui/Badge';
import { Stack } from '@/ui/Stack';
import { Icon } from '@impactium/icons';
import s from '../styles/ErrorBoundary.module.css';

interface ActionProps {
  onCopy?: () => void;
}

export function Action ({ onCopy }: ActionProps) {
  return (
    <Stack ai='center' jc='space-between' className={s.action}>
      <Badge variant="red-subtle" size="md" value='Runtime Error' style={{fontFamily: "var(--font-mono)", borderRadius: "6px"}} />
      <Stack className={s.action_block}>
        <Stack ai='center' jc='center' className={s.iconWrapper} onClick={onCopy}>
          <Icon name="Copy" size={14} color="var(--text-dimmed)" />
        </Stack>
        <Stack ai='center' jc='center' className={s.iconWrapper}>
          <Icon name="BookOpen" size={14} color="var(--text-dimmed)" />
        </Stack>
      </Stack>
    </Stack>
  )
}