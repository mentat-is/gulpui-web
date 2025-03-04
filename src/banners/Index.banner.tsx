import { Banner } from '@/ui/Banner'

export namespace IndexBanner {
  export type Props = Banner.Props
}

export function IndexBanner({ ...props }: IndexBanner.Props) {
  return <Banner title="Select Index" {...props}></Banner>
}
