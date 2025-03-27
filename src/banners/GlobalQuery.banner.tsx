import { Banner as UIBanner } from '@/ui/Banner';

export namespace GlobalQuery {
  export namespace Banner {
    export interface Props extends UIBanner.Props {

    }
  }

  export function Banner({ ...props }: GlobalQuery.Banner.Props) {
    return (
      <UIBanner title='Global query' {...props}>

      </UIBanner>
    )
  }
}