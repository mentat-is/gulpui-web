import SyntaxHighlighter from 'react-syntax-highlighter'
import * as highlight from 'react-syntax-highlighter/dist/esm/styles/hljs'
import { useApplication } from '@/context/Application.context'
import { λEvent, λExtendedEvent } from '@/dto/ChunkEvent.dto'
import { Dialog } from '@/ui/Dialog'
import { SymmetricSvg } from '@/ui/SymmetricSvg'
import { Fragment, useEffect, useMemo, useState } from 'react'
import s from './styles/DisplayEventDialog.module.css'
import { copy, download } from '@/ui/utils'
import { Button, Skeleton, Stack } from '@impactium/components'
import { Event, File } from '@/class/Info'
import { Navigation } from './components/navigation'
import { Enrichment } from '@/banners/Enrichment.banner'
import { LinkComponents } from '@/banners/CreateLinkBanner'
import { LinkFunctionality, NoteFunctionality } from '@/banners/Collab.functionality'
import { λLink, λNote } from '@/dto/Dataset'
import { Collab } from '@/components/CollabList'

interface DisplayEventDialogProps {
  event: λEvent
}

export function DisplayEventDialog({ event }: DisplayEventDialogProps) {
  const { Info, app, spawnBanner } = useApplication()
  const [rawJSON, setRawJSON] = useState<string>('')
  const [notes, setNotes] = useState<λNote[]>(Event.notes(app, event));
  const [links, setLinks] = useState<λLink[]>(Event.links(app, event));

  useEffect(() => {
    Info.setTimelineTarget(event)
    setNotes(Event.notes(app, event))
    setLinks(Event.links(app, event))
  }, [event, app.target.notes, app.target.links])

  useEffect(() => {
    if (!rawJSON) loadEvent()
  }, [rawJSON])

  useEffect(() => {
    setRawJSON('')
  }, [event])

  const loadEvent = async () => {
    const detailed = await Info.query_single_id(event.id, event.operation_id)

    setRawJSON(JSON.stringify(detailed?.raw, null, 2))
  }

  const index = useMemo(() => {
    const events = File.events(app, event.file_id)
    const index = events.findIndex((e) => e.id === event.id)
    return events.length - index
  }, [event])

  const highlights = useMemo(() => {
    return (
      <SyntaxHighlighter
        className={s.highlighter}
        customStyle={{ maxWidth: '100%', borderRadius: 6 }}
        language="JSON"
        style={highlight.vs2015}>
        {rawJSON}
      </SyntaxHighlighter>
    )
  }, [rawJSON])

  const collabList = useMemo(() => {
    return (
      <Collab.List notes={notes} links={links} />
    )
  }, [notes, links])

  return (
    <Dialog
      icon={<SymmetricSvg text={event.id} />}
      title={`Event №${index}`}
      description={File.id(app, event.file_id).name}
    >
      <Navigation event={event} />
      {rawJSON ? (
        <Fragment>
          <Stack className={s.group}>
            <Stack dir="column" flex>
              <Button
                onClick={() =>
                  spawnBanner(<NoteFunctionality.Create.Banner event={event} />)
                }
                variant="secondary"
                img="StickyNote"
              >
                New note
              </Button>
              <Button
                onClick={() =>
                  spawnBanner(<LinkFunctionality.Create.Banner event={event} />)
                }
                variant="secondary"
                img="GitPullRequestCreate"
              >
                Create link
              </Button>
            </Stack>
            <Stack dir="column" flex>
              <Button
                onClick={() =>
                  spawnBanner(
                    <Enrichment.Banner
                      event={event}
                      onEnrichment={(e: Record<string, string>) =>
                        setRawJSON(JSON.stringify(e, null, 2))
                      }
                    />,
                  )
                }
                variant="glass"
                img="PrismColor"
              >
                Enrich
              </Button>
              <Button onClick={() => spawnBanner(<LinkComponents.Connect.Banner event={event} />)} variant="secondary" img="GitPullRequestCreateArrow">Connect link</Button>
            </Stack>
          </Stack>
          {collabList}
          {highlights}
          <Stack className={s.actionButtons}  >
            <Button variant="secondary" onClick={() => copy(rawJSON)} img="Copy">Copy JSON</Button>
            <Button variant="secondary" onClick={() =>
              download(
                rawJSON,
                'application/json',
                `${event.id}_from_${event.file_id}.json`,
              )
            }
              img="Download"
            >Download JSON</Button>
            <Button
              onClick={() => {
                // @ts-ignore
                return window.focusCanvasOnTimestamp(event.timestamp)
              }}
              variant="secondary"
              img="Crosshair"
              style={{ flex: 0 }}
              title="Focus timeline on this event"
            />
          </Stack>
        </Fragment>
      ) : (
        <Stack
          style={{ width: '100%', height: '100%' }}
          flex
          ai="center"
          jc="center"
          dir="column"
          gap={12}
        >
          <Stack style={{ width: '100%' }}>
            <Skeleton width="full" />
            <Skeleton width="full" />
          </Stack>
          <Stack style={{ width: '100%' }}>
            <Skeleton width="full" />
            <Skeleton width="full" />
          </Stack>
          <Skeleton width="full" height="full" />
          <Stack style={{ width: '100%' }}>
            <Skeleton width="full" />
            <Skeleton width="full" />
            <Skeleton width="full" />
          </Stack>
        </Stack>
      )}
    </Dialog>
  )
}
