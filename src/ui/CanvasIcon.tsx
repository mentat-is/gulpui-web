import { renderToStaticMarkup } from 'react-dom/server'
import { Icon } from '@impactium/icons'

export function getCanvasIcon({ name, ...props }: CanvasIcon.Props) {
  const key = JSON.stringify({ name, ...props });
  const icon = CanvasIcon.cache.get(key);
  if (icon) {
    return icon;
  }

  const svg = renderToStaticMarkup(<Icon name={name} {...props} />);

  const promise = createImageFromSVG(svg);
  promise.then(image => {
    CanvasIcon.cache.set(key, image);
  })

  throw void 0;
}

const createImageFromSVG = (svgString: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(svgBlob)

    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = reject
    img.src = url
  })
}

export namespace CanvasIcon {
  export const cache = new Map<string, HTMLImageElement>();

  export interface Props extends Icon.Props {

  }
}