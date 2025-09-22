import { Badge } from '@/ui/Badge'
import { useState } from 'react'
import s from '../styles/ErrorBoundary.module.css'

interface ErrorWithDescription {
  message: string;
  stack?: string;
}

interface ErrorPanelProps {
  errors: ErrorWithDescription[];
}

export function ErrorPanel({ errors }: ErrorPanelProps) {
  const [currentErrorIndex, setCurrentErrorIndex] = useState(0);

  if (!errors || errors.length === 0) return null;

  const isFirst = currentErrorIndex === 0;
  const isLast = currentErrorIndex === errors.length - 1;

  const prevError = () => {
    if (!isFirst) setCurrentErrorIndex(currentErrorIndex - 1);
  }

  const nextError = () => {
    if (!isLast) setCurrentErrorIndex(currentErrorIndex + 1);
  }

  const currentError = errors[currentErrorIndex];

  return (
    <div className={s.panel}>
      <div className={s.header}>
        <div className={s.pagination}>
          <Badge
            variant="gray-subtle"
            size="md"
            style={{ 
              cursor: isFirst ? 'default' : 'pointer', 
              opacity: isFirst ? 0.5 : 1, 
              fontFamily: "var(--font-mono)"
            }}
            onClick={prevError}
            icon='ArrowLeft'
          />

          {currentErrorIndex + 1}/{errors.length}

          <Badge
            variant="gray-subtle"
            size="md"
            style={{ 
              cursor: isLast ? 'default' : 'pointer', 
              opacity: isLast ? 0.5 : 1,
              fontFamily: "var(--font-mono)"
            }}
            onClick={nextError}
            icon='ArrowRight'
          />
        </div>

        <div className={s.gulp}>
          <h5>Current version:</h5>
          <Badge
            variant="gray-subtle"
            size="md"
            value='1.0.5' 
            style={{color: 'var(--text-dimmed)'}}
          />
        </div>
      </div>

      <div className={s.action}>
        <Badge 
          variant="red-subtle" 
          size="md" 
          value='Runtime Error' 
          style={{fontFamily: "var(--font-mono)", borderRadius: "6px"}}
        />
      </div>

      <div className={s.message}>
        <span>{currentError.message}</span>
        <p>{currentError.stack}</p>
      </div>
    </div>
  )
}
