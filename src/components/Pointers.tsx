import { XY } from '@/dto/XY.dto'
import { Stack } from '@/ui/Stack'
import { User } from '@/entities/User'

export namespace Pointers {
  export interface Props extends Stack.Props {
    getPixelPosition: (t: number) => number
    width: number
    self: XY
    timestamp: number
  }

  export interface Pointer {
    timestamp: number
    y: number
    x?: number
    id: User.Id
    color: string
  }
}

export function Pointers({
  ...props
}: Pointers.Props) {
  return <Stack data-aria-pointers pos="absolute" {...props} />
}
