import { File } from '@/class/Info'
import { useApplication } from '@/context/Application.context'
import { λRequest } from '@/dto/Dataset'
import { Badge } from '@/ui/Badge'
import { Banner as UIBanner } from '@/ui/Banner'
import { Stack } from '@impactium/components'
import { Icon } from '@impactium/icons'
import { cn } from '@impactium/utils'
import { useEffect, useState } from 'react'
import s from './styles/RequestsBanner.module.css'
import { formatDistanceToNow } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { Toggle } from '@/ui/Toggle'

export namespace Requests {
  export namespace Banner {
    export type Props = UIBanner.Props
  }

  export function Banner({ className, ...props }: Requests.Banner.Props) {
    const { Info, app } = useApplication()
    const [isAll, setIsAll] = useState<boolean>(false)

    useEffect(() => {
      Info.request_list().then((reqs) => {
        Info.request_replace(
          ...app.general.requests,
          ...reqs.filter(
            (r) => !app.general.requests.find((req) => req.id === r.id),
          ),
        )
      })
    }, [])

    return (
      <UIBanner
        className={cn(className, s.banner)}
        title="Requests list"
        {...props}
      >
        <Stack dir="column" gap={0} className={s.list}>
          {app.general.requests
            .filter((r) => (isAll ? true : r.status !== 'done'))
            .map((request) => (
              <Requests.Combination request={request} />
            ))}
        </Stack>
        <Toggle
          option={['Hide completed', 'Show all']}
          checked={isAll}
          onCheckedChange={setIsAll}
        />
      </UIBanner>
    )
  }

  export namespace Combination {
    export interface Props extends Stack.Props {
      request: λRequest
    }
  }

  export function Combination({
    request,
    className,
    ...props
  }: Requests.Combination.Props) {
    const { Info, app } = useApplication()

    const timeAgo = (timestamp: number): string => {
      return formatDistanceToNow(new Date(timestamp), {
        addSuffix: true,
        locale: enUS,
      })
    }

    return (
      <Stack className={s.combination}>
        <Status status={request.status} />
        <p className={s.id}>{request.id}</p>
        <span>for</span>
        <p className={s.file}>
          {request.for ? File.id(app, request.for).name : 'unknown file'}
        </p>
        <hr />
        <p className={s.time_ago}>{timeAgo(request.on)}</p>
        {!Requests.Status.FinishedStatuses.includes(request.status) && (
          <Badge
            className={s.close}
            variant="destructive"
            onClick={() => Info.request_cancel(request.id)}
          >
            <Icon name="X" />
            Cancel
          </Badge>
        )}
      </Stack>
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
      error: 'X',
      failed: 'X',
      pending: 'StatusSmall',
      ongoing: 'StatusSmall',
      success: 'Check',
    }

    export const ColorsMap: Record<λRequest['status'], string> = {
      done: 'var(--green-900)',
      canceled: 'var(--gray-900)',
      error: 'var(--red-900)',
      failed: 'var(--amber-900)',
      pending: 'var(--blue-900)',
      ongoing: 'var(--blue-900)',
      success: 'var(--green-900)',
    }

    export const BackgroundsMap: typeof ColorsMap = {
      done: 'var(--green-200)',
      canceled: 'var(--gray-200)',
      error: 'var(--red-200)',
      failed: 'var(--amber-200)',
      pending: 'var(--blue-200)',
      ongoing: 'var(--blue-200)',
      success: 'var(--green-200)',
    }

    export const FinishedStatuses: λRequest['status'][] = [
      'canceled',
      'done',
      'error',
      'success',
      'failed',
    ]
  }
}
