import { useState, useCallback } from 'react';
import { Action } from './Action';
import { Badge } from '@/ui/Badge';
import { Icon } from '@impactium/icons';
import s from '../styles/ErrorBoundary.module.css';
import { copy } from '@/ui/utils';

interface ErrorWithDescription {
  name?: string;
  message: string;
  stack?: string;
  timestamp: string;
}

interface ErrorPanelProps {
  errors: ErrorWithDescription[];
}

const getBadgeStyle = (disabled: boolean) => ({
  cursor: disabled ? 'default' : 'pointer',
  opacity: disabled ? 0.5 : 1,
  fontFamily: 'var(--font-mono)',
});

const HINTS = [
  "You might have mismatching versions of React and the renderer (such as React DOM)",
  "You might be breaking the Rules of Hooks",
  "You might have more than one copy of React in the same app",
  "We recommend reporting this error so our developers can investigate and fix it"
];

export function ErrorPanel({ errors }: ErrorPanelProps) {
  const [currentErrorIndex, setCurrentErrorIndex] = useState(0);
  if (!errors?.length) return null;

  const isFirst = currentErrorIndex === 0;
  const isLast = currentErrorIndex === errors.length - 1;
  const currentError = errors[currentErrorIndex];

  const prevError = useCallback(() => !isFirst && setCurrentErrorIndex(i => i - 1), [isFirst]);
  const nextError = useCallback(() => !isLast && setCurrentErrorIndex(i => i + 1), [isLast]);

  const handleCopy = useCallback(() => {
    const textToCopy = `${currentError.message}\n${currentError.stack ?? ''}`;
    copy(textToCopy);
  }, [currentError]);

  return (
    <div className={s.panel}>
      <div className={s.header}>
        <div className={s.pagination}>
          <Badge variant="gray-subtle" size="md" style={getBadgeStyle(isFirst)} onClick={prevError} icon="ArrowLeft" />
          {currentErrorIndex + 1}/{errors.length}
          <Badge variant="gray-subtle" size="md" style={getBadgeStyle(isLast)} onClick={nextError} icon="ArrowRight" />
        </div>
        <div className={s.gulp}>
          <p>Current version:</p>
          <Badge variant="gray-subtle" size="md" value="1.0.5" style={{ color: 'var(--text-dimmed)' }} />
        </div>
      </div>

      <Action onCopy={handleCopy} />

      <div className={s.message}>
        <div className={s.meta}>
          <span>{currentError.name}:</span> 
          <span style={{ fontSize: "14px" }}>{new Date(currentError.timestamp).toLocaleString()}</span>
        </div>
        <span>{currentError.message}</span>
        {HINTS.map((hint, idx) => <p key={idx}>{idx + 1}. {hint}</p>)}

        <div className={s.stackContainer}>
          <div className={s.stack}>
            <span>Call Stack</span>
            <Icon name="ExternalLink" size={14} color="var(--text-dimmed)" />
          </div>
          <p className={s.stackText}>{currentError.stack}</p>
        </div>
      </div>
    </div>
  );
}
