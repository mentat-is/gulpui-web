import { renderToStaticMarkup } from 'react-dom/server'
import { Icon } from '@impactium/icons'

const PLACEHOLDER_CANVAS = document.createElement('canvas');
PLACEHOLDER_CANVAS.width = 1;
PLACEHOLDER_CANVAS.height = 1;
const PLACEHOLDER_IMAGE = new Image(1, 1);

export function getCanvasIcon({ name, ...props }: CanvasIcon.Props): HTMLImageElement {
  const key = JSON.stringify({ name, ...props });
  const icon = CanvasIcon.cache.get(key);
  if (icon) {
    return icon;
  }

  // Start async load but return placeholder instead of throwing
  const svg = renderToStaticMarkup(<Icon name={name} {...props} />);
  createImageFromSVG(svg).then(image => {
    CanvasIcon.cache.set(key, image);
  });

  return PLACEHOLDER_IMAGE;
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