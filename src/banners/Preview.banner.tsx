import { Banner as UIBanner } from '@/ui/Banner'
import { Table } from '@/components/Table'
import { Button, Stack } from '@impactium/components'
import { Badge } from '@/ui/Badge';

export namespace Preview {
  export namespace Banner {
    export interface Props extends UIBanner.Props {
      total: number;
      values: Record<string, any>[]
    }
  }

  export function Banner({ total, values, children, ...props }: Banner.Props) {
    return (
      <UIBanner title="Preview" {...props}>
        <Table values={values} />
        <Stack>
          {total ? <Button style={{ width: '100%' }} variant='glass' img='Status'>Total amount of entities: {total}</Button> : null}
          {total && total > 1_000_000 ? <Badge value='Amount of results still too big (> 1 million)' variant='warning' icon='Warning' /> : null}
        </Stack>
      </UIBanner>
    )
  }
}
