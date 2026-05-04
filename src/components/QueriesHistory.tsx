import { memo } from 'react';
import { Popover } from '@/ui/Popover';
import { Button } from '@/ui/Button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/Tooltip';
import { Separator } from '@/ui/Separator';
import { Query } from '@/entities/Query';
import s from './styles/QueriesHistory.module.css';

interface QueriesHistoryProps {
  list: Query.Type[];
  onSelect: (q: Query.Type) => void;
}

/**
 * Reusable component displaying a list of previously applied queries in a Popover.
 *
 * @param list - The list of historical Query.Type objects.
 * @param onSelect - Callback when a query is selected for application.
 */
export const QueriesHistory = memo(({ list, onSelect }: QueriesHistoryProps) => {
  if (list.length === 0) return null;

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button icon="ClockFading" variant="secondary">
          Last filters
        </Button>
      </Popover.Trigger>
      <Popover.Content className={s.lastFilters}>
        <div className={s.lastFiltersList}>
          {list.map((q, i) => (
            <div key={i} className={s.lastFilterItem}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={s.lastFilterRow}>
                      <div className={s.lastFilterText}>
                        {q.string}
                      </div>
                      <Button
                        icon="Check"
                        variant="glass"
                        className={s.lastFilterApplyButton}
                        onClick={() => onSelect(q)}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className={s.tooltip}>
                    <pre style={{ textAlign: 'left', whiteSpace: 'pre-wrap' }}>{q.string}</pre>
                    {q.filters && q.filters.length > 0 && (
                      <pre style={{ textAlign: 'left', whiteSpace: 'pre-wrap', marginTop: 4 }}>
                        {JSON.stringify(q.filters, null, 2)}
                      </pre>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {list.length - 1 > i && <Separator className={s.lastFilterSeparator} />}
            </div>
          ))}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
});
