import { Application } from '@/context/Application.context';
import { Badge } from '@/ui/Badge';
import { Banner as UIBanner } from '@/ui/Banner';
import { Icon } from '@impactium/icons';
import { cn } from '@impactium/utils';
import { useState } from 'react';
import s from './styles/RequestsBanner.module.css';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Stack } from '@/ui/Stack';
import { Request } from '@/entities/Request';

export namespace Requests {
  export namespace Banner {
    export type Props = UIBanner.Props
  }

  export function Banner({ className, ...props }: Requests.Banner.Props) {
    const { Info, app, spawnBanner } = Application.use();
    const [loading, setLoading] = useState<boolean>(false);

    const timeAgo = (timestamp: number): string => {
      return formatDistanceToNow(timestamp, {
        addSuffix: true,
        locale: enUS,
      })
    }

    const cancelRequestButtonClickHandler = (id: Request.Type['id']) => Info.request_cancel(id);

    const detailedViewRequestButtonClickHandler = async (id: Request.Type['id']) => {
      setLoading(true);
      const detailedRequest = await Info.request_get_by_id(id);
      setLoading(false);
      spawnBanner(<Requests.Detailed.Banner request={detailedRequest} />)
    };

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
                  variant='red'
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
      status: Request.Status
    }

    export const IconsMap: Record<Request.Status, Icon.Name> = {
      done: 'Check',
      canceled: 'X',
      failed: 'X',
      pending: 'StatusSmall',
      ongoing: 'StatusSmall',
    }

    export const ColorsMap: Record<Request.Status, string> = {
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

    export const FinishedStatuses: Request.Status[number][] = [
      'canceled',
      'done',
      'error',
      'success',
      'failed',
    ]
  }

  export namespace Detailed {
    export namespace Banner {
      export interface Props extends UIBanner.Props {
        request: Request.Type;
      }
    }

    export function Banner({ request, className, ...props }: Requests.Detailed.Banner.Props) {
      return (
        <UIBanner title='Request details' className={cn(className, s.detailedRequestBanner)} {...props}>

        </UIBanner>
      )
    }
  }
}
