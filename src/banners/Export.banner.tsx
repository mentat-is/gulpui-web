import { Logger } from '@/dto/Logger.class'
import { Banner as UIBanner } from '@/ui/Banner'
import { download } from '@/ui/utils'
import { toast } from 'sonner'
import html2canvas from 'html2canvas'
// @ts-ignore
import C2S from 'canvas2svg'
import { Button, Stack } from '@impactium/components'

export namespace Export {
  export namespace Banner {
    export type Props = UIBanner.Props
  }

  export function Banner({ ...props }: Banner.Props) {
    const exportCanvasAsImage = async () => {
      const parent = document.querySelector('#canvas')?.parentElement
      if (!parent) return

      const exportedCanvas = await html2canvas(parent, {
        backgroundColor: null,
        useCORS: true,
        scale: window.devicePixelRatio,
      })

      const url = exportedCanvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = url
      link.download = `exported_canvas_${Date.now()}.png`
      link.click()
    }

    const exportCanvasAsSvg = async () => {
      try {
        const canvas = document.getElementById('canvas') as HTMLCanvasElement
        if (!canvas) return

        const parent = canvas.parentElement
        if (!parent) return

        const { width, height } = canvas
        const ctx = new C2S(width, height)

        // @ts-ignore
        window.__UNSUPORTED_FORCE_RENDER_OF_CANVAS__DONT_USE_IT_OR_YOU_WILL_BE_FIRED____λuthor_ℳark(
          true,
          ctx,
        )

        const svg = new DOMParser().parseFromString(ctx.getSerializedSvg(true), 'image/svg+xml')
        const svgRoot = svg.documentElement

        const elements = parent.querySelectorAll('[aria-exportable]')
        for (const el of elements) {
          const png = await html2canvas(el as HTMLElement, { backgroundColor: null })
          const dataUrl = png.toDataURL('image/png')

          const img = document.createElementNS('http://www.w3.org/2000/svg', 'image')
          img.setAttributeNS(null, 'href', dataUrl)
          img.setAttributeNS(null, 'width', '32')
          img.setAttributeNS(null, 'height', '32')
          img.setAttributeNS(null, 'x', ((el as HTMLElement).offsetLeft - 16).toString())
          img.setAttributeNS(null, 'y', ((el as HTMLElement).offsetTop - 16).toString())

          svgRoot.appendChild(img)
        }

        // Экспорт
        const serializer = new XMLSerializer()
        const svgString = serializer.serializeToString(svgRoot)
        download(svgString, 'image/svg+xml', 'gulp_canvas.svg')
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
      <UIBanner title="Export" {...props}>
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
