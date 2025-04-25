import { File, Link, Event } from '@/class/Info'
import { useApplication } from '@/context/Application.context'
import { λLink } from '@/dto/Dataset'
import { LinkPoint } from '@/ui/Link'
import { useMemo, useCallback, Fragment } from 'react'

interface LinksDisplayerProps {
  getPixelPosition: (num: number) => number
}

type LinkMapping = Record<λLink['id'], { left: number; top: number }>

export function LinksDisplayer({ getPixelPosition }: LinksDisplayerProps) {
  const { app, setScrollX, scrollX, scrollY, setScrollY } = useApplication()

  if (!app.target.links.length) return null

  const selectedFiles = useMemo(
    () => new Set(app.target.files.filter((f) => f.selected).map((f) => f.id)),
    [app.target.files],
  )

  const mapping = useMemo(() => {
    return app.target.links.reduce<LinkMapping>((acc, link) => {
      const event = Event.id(app, link.doc_id_from)
      if (!event || !selectedFiles.has(event.file_id)) return acc

      const timestamp = Link.timestamp(link)

      console.log(timestamp)

      if (!timestamp) return acc

      const left = getPixelPosition(timestamp)

      console.log(left)

      const totalHeight = link.docs.reduce((acc, doc) => acc + File.getHeight(app, doc.file_id, 0), 0)

      const top = totalHeight / (link.docs.length || 1)

      if (top > 0) acc[link.id] = { left, top }
      return acc
    }, {})
  }, [app.target.links, selectedFiles, getPixelPosition]);

  return (
    <Fragment>
      {Object.entries(mapping).map(([id, { left, top }]) => (
        <LinkPoint key={id} link={app.target.links.find(link => link.id === id)!} x={left} y={top - scrollY} />
      ))}
    </Fragment>
  )
}