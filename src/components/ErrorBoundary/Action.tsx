import { Badge } from '@/ui/Badge'
import { Icon } from '@impactium/icons'
import s from '../styles/ErrorBoundary.module.css'

interface ActionProps {
  onCopy?: () => void;
}

export function Action ({ onCopy }: ActionProps) {
  return (
    <div className={s.action}>
      <Badge variant="red-subtle" size="md" value='Runtime Error' style={{fontFamily: "var(--font-mono)", borderRadius: "6px"}} />
      <div className={s.action_block}>
        <button className={s.iconWrapper} onClick={onCopy}>
          <Icon name="Copy" size={14} color="var(--text-dimmed)" />
        </button>
        <button className={s.iconWrapper}>
          <Icon name="BookOpen" size={14} color="var(--text-dimmed)" />
        </button>
      </div>
    </div>
  )
}