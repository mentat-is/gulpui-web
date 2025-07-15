import { useApplication } from '@/context/Application.context';
import { λRequest } from '@/dto/Dataset';
import { Badge } from '@/ui/Badge';
import { Banner as UIBanner } from '@/ui/Banner';
import { Skeleton, Stack } from '@impactium/components';
import { Icon } from '@impactium/icons';
import { cn } from '@impactium/utils';
import { useEffect, useState } from 'react';
import s from './styles/RequestsBanner.module.css';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';

export namespace Requests {
  export namespace Banner {
    export type Props = UIBanner.Props
  }

  export function Banner({ className, ...props }: Requests.Banner.Props) {
    const { Info, app } = useApplication()

    const timeAgo = (timestamp: number): string => {
      return formatDistanceToNow(timestamp, {
        addSuffix: true,
        locale: enUS,
      })
    }

    const cancelRequestButtonClickHandler = (id: λRequest['id']) => Info.request_cancel(id);

    return (
      <UIBanner className={cn(className, s.banner)} title="Requests list" {...props}>
        <Stack dir="column" gap={0} className={s.list}>
          {app.general.requests.map((request) => (
            <Stack key={request.id} className={cn(s.combination, className)} {...props}>
              <Status status={request.status} />
              <p className={s.id}>{request.id}</p>
              <hr />
              <p className={s.time_ago}>{timeAgo(request.time_created)}</p>
              {!Requests.Status.FinishedStatuses.includes(request.status) && (
                <Badge
                  className={s.close}
                  variant="destructive"
                  onClick={() => cancelRequestButtonClickHandler(request.id)}
                >
                  <Icon name="X" />
                  Cancel
                </Badge>
              )}
            </Stack>
          ))}
        </Stack>
      </UIBanner>
    )
  }

  export function Status({ status, ...props }: Status.Props) {
    return (
      <Stack
        className={s.status}
        style={{
          background: Requests.Status.BackgroundsMap[status],
          color: Requests.Status.ColorsMap[status],
        }}
        {...props}
      >
        <Icon size={12} name={Requests.Status.IconsMap[status]} />
      </Stack>
    )
  }

  export namespace Status {
    export interface Props extends Stack.Props {
      status: λRequest['status']
    }

    export const IconsMap: Record<λRequest['status'], Icon.Name> = {
      done: 'Check',
      canceled: 'X',
      failed: 'X',
      pending: 'StatusSmall',
      ongoing: 'StatusSmall',
    }

    export const ColorsMap: Record<λRequest['status'], string> = {
      done: 'var(--green-900)',
      canceled: 'var(--amber-900)',
      failed: 'var(--red-900)',
      pending: 'var(--blue-900)',
      ongoing: 'var(--blue-900)',
    }

    export const BackgroundsMap: typeof ColorsMap = {
      done: 'var(--green-200)',
      canceled: 'var(--amber-200)',
      failed: 'var(--red-200)',
      pending: 'var(--blue-200)',
      ongoing: 'var(--blue-200)'
    }

    export const FinishedStatuses: λRequest['status'][number][] = [
      'canceled',
      'done',
      'error',
      'success',
      'failed',
    ]
  }
}
