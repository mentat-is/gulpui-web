import { File } from "@/class/Info";
import { useApplication } from "@/context/Application.context";
import { λRequest } from "@/dto/Dataset";
import { Badge } from "@/ui/Badge";
import { Banner as UIBanner } from "@/ui/Banner";
import { Stack } from "@impactium/components";
import { Icon } from "@impactium/icons";
import { capitalize } from "@impactium/utils";
import { useEffect, useState } from "react";
import s from './styles/RequestsBanner.module.css';

export namespace Requests {
  export namespace Banner {
    export interface Props extends UIBanner.Props {

    }
  }

  export function Banner({ ...props }: Requests.Banner.Props) {
    const { Info, app } = useApplication();
    const [unknown, setUnknown] = useState<λRequest[]>([]);

    useEffect(() => {
      Info.request_list().then(reqs => {
        console.log(reqs);
      });
    }, []);

    return (
      <UIBanner title='Requests list' {...props}>
        {app.general.requests.map(request => <Requests.Combination request={request} />)}
      </UIBanner>
    )
  }

  export namespace Combination {
    export interface Props extends Stack.Props {
      request: λRequest;
    }
  }

  export function Combination({ request, className, ...props }: Requests.Combination.Props) {
    const { Info, app } = useApplication();

    return (
      <Stack>
        <Icon name='FunctionPython' />
        <p>{request.id}</p>
        <span>for</span>
        <p>{File.id(app, request.for).name}</p>
        <Status status={request.status} />
        {!Requests.Status.FinishedStatuses.includes(request.status) && <Badge variant='destructive' onClick={() => Info.request_cancel(request.id)} value='Cancel' />}
      </Stack>
    )
  }

  export function Status({ status, ...props }: Status.Props) {
    return (
      <Stack className={s.status} style={{ background: Requests.Status.BackgroundsMap[status], color: Requests.Status.ColorsMap[status] }} {...props}>
        <Icon size={14} name={Requests.Status.IconsMap[status]} />
        {capitalize(status)}
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
      pending: 'Status',
      success: 'Check'
    }
    
    export const ColorsMap: Record<λRequest['status'], string> = {
      done: 'var(--green-900)',
      canceled: 'var(--gray-900)',
      error: 'var(--red-900)',
      failed: 'var(--amber-900)',
      pending: 'var(--blue-900)',
      success: 'var(--green-900)'
    }

    export const BackgroundsMap: typeof ColorsMap = {
      done: 'var(--green-200)',
      canceled: 'var(--gray-200)',
      error: 'var(--red-200)',
      failed: 'var(--amber-200)',
      pending: 'var(--blue-200)',
      success: 'var(--green-200)'
    }

    export const FinishedStatuses: λRequest['status'][] = ['canceled', 'done', 'error', 'success', 'failed'];
  }
}