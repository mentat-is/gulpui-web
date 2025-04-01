import { Banner as UIBanner } from '@/ui/Banner'
import { Table } from '@/components/Table'
import { Button, Stack } from '@impactium/components'
import { Badge } from '@/ui/Badge';
import { useMemo, useState } from 'react';
import { cn } from '@impactium/utils';
import s from './styles/PreviewBanner.module.css'
import { Notification } from '@/ui/Notification';
import { Icon } from '@impactium/icons';

export namespace Preview {
  export namespace Banner {
    export interface Props extends UIBanner.Props {
      total: number;
      values: Record<string, any>[]
    }
  }

  export function Banner({ total, values, children, ...props }: Banner.Props) {
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

    const OptionButton = useMemo(() => {
      return (
        <Button variant='ghost' onClick={() => setIsFullscreen(v => !v)} img={isFullscreen ? 'FullscreenClose' : 'Fullscreen'} />
      )
    }, [isFullscreen, setIsFullscreen]);

    return (
      <UIBanner className={cn(isFullscreen && s.fullscreen)} title="Preview" option={OptionButton} {...props}>
        <Table values={values} />
        <Preview.AmountNotification total={total} />
      </UIBanner>
    )
  }

  export namespace AmountNotification {
    export interface Props extends Notification.Props {
      total: number
    }
  }

  export function AmountNotification({ total, ...props }: AmountNotification.Props) {
    if (typeof total !== 'number') {
      return null;
    }

    const isTooBig = total > 1_000_000;

    const variant: Notification.Variant = isTooBig ? 'warning' : 'success';
    const icon: Icon.Name = isTooBig ? 'Warning' : 'ShieldCheck';

    return useMemo(() => (
      <Notification icon={icon} variant={variant} {...props}>
        Total amount of documents is <span>{total}</span>.{" "}
        <span>{isTooBig ? "This query is unsafe" : "This query is fine"}</span>
      </Notification>
    ), [total]);
  }
}
