import { File, GulpDataset, MinMax, MinMaxBase } from '@/class/Info'
import { useApplication } from '@/context/Application.context'
import { λEvent } from '@/dto/ChunkEvent.dto'
import { Default, λFile } from '@/dto/Dataset'
import { Banner as UIBanner } from '@/ui/Banner'
import { Select } from '@/ui/Select'
import { Switch } from '@/ui/Switch'
import { Label } from '@/ui/Label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/Tooltip'
import { Button, Input, Skeleton, Stack } from '@impactium/components'
import { Icon } from '@impactium/icons'
import { format } from 'date-fns'
import {
  ChangeEvent,
  CSSProperties,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import s from './styles/EnrichmentBanner.module.css'
import { capitalize } from '@impactium/utils'
import { Toggle } from '@/ui/Toggle'
import { CustomParameters } from '@/components/CustomParameters'

export namespace Enrichment {
  export interface Props extends UIBanner.Props {
    event?: λEvent
    onEnrichment?: (event: λEvent) => void
  }

  export function Banner({ event, onEnrichment, ...props }: Enrichment.Props) {
    const { Info, app, destroyBanner } = useApplication()
    const [file, setFile] = useState<λFile | null>(
      event ? File.id(app, event.file_id) : null,
    )
    const [plugins, setPlugins] = useState<GulpDataset.PluginList.Interface[]>()
    const [plugin, setPlugin] = useState<GulpDataset.PluginList.Interface>()
    const [customParameters, setCustomParameters] = useState<
      Record<string, any>
    >({})
    const [loading, setLoading] = useState<boolean>(false)

    useEffect(() => {
      if (!plugin) {
        return setCustomParameters({})
      }

      const parameters: typeof customParameters = {}

      plugin.custom_parameters.forEach((p) => {
        parameters[p.name] = null;
      })

      setCustomParameters(parameters)
    }, [plugin])

    useEffect(() => {
      Info.plugin_list().then((plugins) => {
        setPlugins(
          plugins.filter((plugin) => plugin.type.includes('enrichment')),
        )
      })
    }, [])

    const submit = async () => {
      if (!file || !plugin) {
        return
      }

      if (event) {
        setLoading(true)
        const enriched = await Info.enrich_single_id(
          plugin.filename,
          event,
          customParameters,
        )
        if (enriched && onEnrichment) {
          onEnrichment(enriched)
          destroyBanner()
        }
        setLoading(false);
        return
      }

      setLoading(true)
      await Info.enrichment(plugin.filename, file, frame, customParameters)
      setLoading(false)
      destroyBanner()
    }

    const disabledStyle: CSSProperties = {
      pointerEvents: 'none',
      color: 'var(--text-dimmed)',
    }

    const done = (
      <Button
        disabled={!file || !plugin}
        variant="glass"
        img="Check"
        onClick={submit}
        loading={loading}
      />
    )

    const FileSelection = () => {
      if (event && file) {
        return (
          <Skeleton show={!plugins} width="full" className={s.skeleton}>
            <Input
              img={File.icon(file)}
              value={file.name}
              variant="highlighted"
              style={disabledStyle}
            />
          </Skeleton>
        )
      }

      const Trigger = () => {
        return (
          <Select.Trigger>
            <Stack style={{ pointerEvents: event ? 'none' : 'all' }} gap={16}>
              <Icon
                variant="dimmed"
                name={file ? File.icon(file) : Default.Icon.FILE}
              />
              {file ? file.name : 'Select source you want to enrich'}
            </Stack>
          </Select.Trigger>
        )
      }

      return (
        <Select.Root onValueChange={(fileId) => setFile(File.id(app, fileId as unknown as λFile['id']))}>
          <Trigger />
          <Select.Content>
            {File.selected(app).map((file) => {
              return (
                <Select.Item key={file.id} value={file.id}>
                  {file.name}
                </Select.Item>
              )
            })}
          </Select.Content>
        </Select.Root>
      )
    }

    const PluginSelection = () => {
      if (!plugins) {
        return <Skeleton className={s.skeleton} width="full" />
      }

      const Trigger = () => {
        return (
          <Select.Trigger>
            <Stack gap={16}>
              <Icon variant="dimmed" name="Puzzle" />
              {plugin
                ? plugin.filename
                : 'Select plugin you want to use for enrichment'}
            </Stack>
          </Select.Trigger>
        )
      }

      return (
        <Select.Root onValueChange={(filename) => setPlugin(plugins.find((p) => p.filename === filename))}>
          <Trigger />
          <Select.Content>
            {plugins.map((plugin) => {
              return (
                <Select.Item key={plugin.filename} value={plugin.filename}>
                  {plugin.filename}
                </Select.Item>
              )
            })}
          </Select.Content>
        </Select.Root>
      )
    }

    const [frame, setFrame] = useState<MinMax>(MinMaxBase)

    useEffect(() => {
      if (!file) {
        return
      }

      setFrame({
        min: Number(file.nanotimestamp.min / 1_000_000n),
        max: Number(file.nanotimestamp.max / 1_000_000n),
      })
    }, [file])

    const FrameSelector = useCallback(() => {
      if (event) {
        return (
          <Skeleton width="full" className={s.skeleton} show={!plugins}>
            <Input
              value={event.id}
              variant="highlighted"
              style={disabledStyle}
              img={Default.Icon.EVENT}
            />
          </Skeleton>
        )
      }

      const handleMinChange = useCallback(
        (e: ChangeEvent<HTMLInputElement>) => {
          const value = e.target.value
          setFrame((prev) => ({ ...prev, min: new Date(value).getTime() }))
        },
        [],
      )

      const handleMaxChange = useCallback(
        (e: ChangeEvent<HTMLInputElement>) => {
          const value = e.target.value
          setFrame((prev) => ({ ...prev, max: new Date(value).getTime() }))
        },
        [],
      )

      const formatDate = (timestamp: number) => {
        return isNaN(timestamp) ? '' : format(timestamp, "yyyy-MM-dd'T'HH:mm")
      }

      return (
        <>
          <Input
            key="min-date"
            onChange={handleMinChange}
            value={formatDate(frame.min)}
            variant="highlighted"
            img="CalendarArrowUp"
            type="datetime-local"
          />
          <Input
            key="max-date"
            onChange={handleMaxChange}
            value={formatDate(frame.max)}
            variant="highlighted"
            img="CalendarArrowDown"
            type="datetime-local"
          />
        </>
      )
    }, [event, frame, plugins])

    const Hint = () => {
      return (
        <Stack
          style={{ color: 'var(--text-dimmed)', padding: '0 8px' }}
          gap={16}
        >
          <Icon name="Info" />
          <p
            style={{
              lineHeight: 1.1,
              fontSize: 11,
              color: 'var(--text-dimmed)',
              fontFamily: 'var(--font-mono)',
              maxWidth: 512,
              whiteSpace: 'break-spaces',
              textWrap: 'balance',
            }}
          >
            In lists, values can be separated by comma. Dict values should be
            represented in JSON format
          </p>
        </Stack>
      )
    }

    return (
      <UIBanner
        title={event ? 'Event enrichment' : 'Data enrichment'}
        done={done}
        loading={!plugins}
        {...props}
      >
        <PluginSelection />
        <FileSelection />
        <FrameSelector />
        <CustomParameters.Editor customParameters={customParameters} setCustomParameters={setCustomParameters} plugin={plugin} />
        <Hint />
      </UIBanner>
    )
  }
}
