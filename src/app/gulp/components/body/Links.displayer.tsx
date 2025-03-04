import { File, Link, Event } from '@/class/Info'
import { useApplication } from '@/context/Application.context'
import { λLink } from '@/dto/Dataset'
import { LinkPoint } from '@/ui/Link'
import { useMemo, useCallback } from 'react'

interface LinksDisplayerProps {
  getPixelPosition: (num: number) => number
  scrollY: number
}

export function LinksDisplayer({
  getPixelPosition,
  scrollY,
}: LinksDisplayerProps) {
  const { Info, app } = useApplication()

  const selectedFiles = useMemo(
    () => new Set(app.target.files.filter((f) => f.selected).map((f) => f.id)),
    [app.target.files],
  )

  const getLinkPosition = useCallback(
    (link: λLink) => {
      const event = Event.id(app, link.doc_id_from)
      if (!event || !selectedFiles.has(event.file_id)) return null

      const timestamp = Link.timestamp(link)
      if (!timestamp) return null

      const left = getPixelPosition(timestamp)
      const totalHeight = link.docs.reduce(
        (acc, doc) => acc + File.getHeight(app, doc.file_id, scrollY),
        0,
      )
      const top = totalHeight / (link.docs.length || 1)

      return top > 0 ? { left, top } : null
    },
    [getPixelPosition, scrollY, app, selectedFiles],
  )

  return (
    <>
      {app.target.links.map((link) => {
        const position = getLinkPosition(link)
        return position ? (
          <LinkPoint
            key={link.id}
            link={link}
            x={position.left}
            y={position.top}
          />
        ) : null
      })}
    </>
  )
}
