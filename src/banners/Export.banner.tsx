import { Logger } from '@/dto/Logger.class'
import { Banner as UIBanner } from '@/ui/Banner'
import { download } from '@/ui/utils'
import { toast } from 'sonner'
// @ts-ignore
import C2S from 'canvas2svg'
import { Button, Stack } from '@impactium/components'

export namespace Export {
  export namespace Banner {
    export type Props = UIBanner.Props
  }

  export function Banner({ ...props }: Banner.Props) {
    const exportCanvasAsImage = () => {
      const canvas = document.body.querySelector(
        '#canvas',
      ) as HTMLCanvasElement | null

      if (canvas) {
        const url = canvas.toDataURL('image/png')

        const link = document.createElement('a')
        link.href = url
        link.download = `gulp-canvas_${Date.now()}`

        link.click()
        link.remove()
      }
    }

    const exportCanvasAsSvg = () => {
      try {
        const canvas = document.getElementById('canvas') as HTMLCanvasElement
        if (!canvas) {
          return
        }

        const { width, height } = canvas

        const ctx = new C2S(width, height)

        // @ts-ignore
        window.__UNSUPORTED_FORCE_RENDER_OF_CANVAS__DONT_USE_IT_OR_YOU_WILL_BE_FIRED____λuthor_ℳark(
          true,
          ctx,
        )

        download(ctx.getSerializedSvg(true), 'image/svg+xml', 'gulp_canvas.svg')
      } catch (e) {
        Logger.error(e)
        toast('Out of memory', {
          description: 'This feature requires minimum 64GB of RAM',
        })
      }
    }

    const no = () => {
      toast('This type of export is in development mode only', {
        description: 'Untested functionality',
      })
    }

    return (
      <UIBanner title="Export">
        <Stack>
          <Button
            variant="secondary"
            img="AcronymSvg"
            onClick={exportCanvasAsSvg}
          >
            Export as SVG
          </Button>
          <Button
            variant="secondary"
            img="AcronymJpg"
            onClick={exportCanvasAsImage}
          >
            Export as image
          </Button>
          <Button variant="secondary" img="AcronymPage" onClick={no}>
            Export as XML
          </Button>
          <Button variant="secondary" img="AcronymCsv" onClick={no}>
            Export as CSV
          </Button>
        </Stack>
      </UIBanner>
    )
  }
}
