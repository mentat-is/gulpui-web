import { Context, File, Link } from '@/class/Info'
import { useApplication } from '@/context/Application.context'
import { Banner as UIBanner } from '@/ui/Banner'
import { Button, Stack } from '@impactium/components'
import { ColorPicker, ColorPickerPopover, ColorPickerTrigger } from '@/ui/Color'
import { useCallback, useMemo, useState } from 'react'
import s from './styles/CreateLinkBanner.module.css'
import { Input } from '@impactium/components'
import { Separator } from '@/ui/Separator'
import { λEvent } from '@/dto/ChunkEvent.dto'
import { Default, λGlyph, λLink } from '@/dto/Dataset'
import { Icon } from '@impactium/icons'
import { Glyph } from '@/ui/Glyph'
import { cn } from '@impactium/utils'
import { LinkFunctionality } from './Collab.functionality'

export namespace LinkComponents {
  export namespace Connect {
    export interface Props {
      event: λEvent
    }
    export function Banner({ event }: LinkComponents.Connect.Props) {
      const { app, Info, spawnBanner } = useApplication()

      const connect = (link: λLink) => () => Info.links_connect(link, event)

      const links = useMemo(() => {
        return Link.selected(app).filter((l) => !l.doc_ids.some((e) => e === event.id))
      }, [app.target.links])

      const NoLinks = useMemo(() => {
        const { spawnBanner } = useApplication();

        return (
          <Stack dir='column' gap={16}>
            <Stack gap={4} style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--text-dimmed)' }}>There is no links at all. <Icon name='FaceSad' size={18} /></Stack>
            <Button rounded onClick={() => spawnBanner(<LinkFunctionality.Create.Banner event={event} />)} img='GitPullRequestArrow'>Create link</Button>
          </Stack>
        )
      }, [spawnBanner])

      return (
        <UIBanner title="Connect link">
          {links.length ? links.map((link) => (
            <Button
              key={link.id}
              variant="secondary"
              style={{ color: link.color }}
              onClick={connect(link)}
              img={Link.icon(link)}
            >
              {link.name}
            </Button>
          )) : NoLinks}
        </UIBanner>
      )
    }
  }
}