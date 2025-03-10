import { Banner as UIBanner } from '@/ui/Banner'
import { Table } from '@/components/Table'

export namespace Preview {
  export namespace Banner {
    export interface Props extends UIBanner.Props {
      values: Record<string, any>[]
    }
  }

  export function Banner({ values, ...props }: Banner.Props) {
    return (
      <UIBanner title="Preview" {...props}>
        <Table values={values} />
      </UIBanner>
    )
  }
}
