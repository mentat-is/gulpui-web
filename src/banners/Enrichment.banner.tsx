import { GulpDataset, MinMax, MinMaxBase } from '@/class/Info'
import { Application } from '@/context/Application.context'
import { Default } from '@/dto/Dataset'
import { Banner as UIBanner } from '@/ui/Banner'
import { Select } from '@/ui/Select'
import { Label } from '@/ui/Label'
import { Icon } from '@impactium/icons'
import { format } from 'date-fns'
import {
  ChangeEvent,
  CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import s from './styles/EnrichmentBanner.module.css'
import { CustomParameters } from '@/components/CustomParameters'
import { Checkbox } from '@/ui/Checkbox'
import { Button } from '@/ui/Button'
import { Skeleton } from '@/ui/Skeleton'
import { Input } from '@/ui/Input'
import { Stack } from '@/ui/Stack'
import { Doc } from '@/entities/Doc'
import { Source } from '@/entities/Source'
import { Internal } from '@/entities/addon/Internal'

export namespace Enrichment {
  export interface Props extends UIBanner.Props {
    event?: Doc.Type
    onEnrichment?: (event: Doc.Type) => void
  }

  export function Banner({ event, onEnrichment, ...props }: Enrichment.Props) {
    const { Info, app, destroyBanner } = Application.use()
    const [file, setFile] = useState<Source.Type | null>(
      event ? Source.Entity.id(app, event['gulp.source_id']) : null,
    )
    const [plugins, setPlugins] = useState<GulpDataset.PluginList.Interface[]>()
    const [plugin, setPlugin] = useState<GulpDataset.PluginList.Interface>()
    const [customParameters, setCustomParameters] = useState<
      Record<string, any>
    >({})
    const [loading, setLoading] = useState<boolean>(false)
    const [isShowOnlyEnriched, setIsShowOnlyEnriched] = useState<boolean>(true);

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
      await Info.enrichment(plugin.filename, file, frame, customParameters, isShowOnlyEnriched)
      setLoading(false)
      destroyBanner()
    }

    const disabledStyle: CSSProperties = {
      pointerEvents: 'none',
      color: 'var(--second)',
    }

    const done = (
      <Button
        disabled={!file || !plugin}
        variant='glass'
        icon='Check'
        onClick={submit}
        loading={loading}
      />
    )

    const FileSelection = useMemo(() => {
      if (event && file) {
        return (
          <Skeleton show={!plugins} width='full' className={s.skeleton}>
            <Input
              icon={Source.Entity.icon(file)}
              readOnly
              value={file.name}
              variant='highlighted'
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
                variant='dimmed'
                name={file ? Source.Entity.icon(file) : Default.Icon.SESSION}
              />
              {file ? file.name : 'Select source you want to enrich'}
            </Stack>
          </Select.Trigger>
        )
      }

      return (
        <Select.Root onValueChange={(fileId) => setFile(Source.Entity.id(app, fileId as unknown as Source.Id))}>
          <Trigger />
          <Select.Content>
            {Source.Entity.selected(app).map((file) => {
              return (
                <Select.Item key={file.id} value={file.id}>
                  {file.name}
                </Select.Item>
              )
            })}
          </Select.Content>
        </Select.Root>
      )
    }, [plugins, file, event])

    const PluginSelection = useMemo(() => {
      if (!plugins) {
        return <Skeleton className={s.skeleton} width='full' />
      }

      const Trigger = () => {
        return (
          <Select.Trigger>
            <Stack gap={16}>
              <Icon variant='dimmed' name='Puzzle' />
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
    },  [plugin, plugins])

    const [frame, setFrame] = useState<MinMax>(MinMaxBase)

    useEffect(() => {
      if (!file) {
        return
      }

      setFrame({
        min: Internal.Transformator.toTimestamp(file.nanotimestamp.min, 'floor'),
        max: Internal.Transformator.toTimestamp(file.nanotimestamp.max, 'ceil'),
      })
    }, [file])

    const FrameSelector = useCallback(() => {
      if (event) {
        return (
          <Skeleton width='full' className={s.skeleton} show={!plugins}>
            <Input
              value={event._id}
              readOnly
              variant='highlighted'
              style={disabledStyle}
              icon={Default.Icon.EVENT}
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
        <Stack>
          <Input
            key='min-date'
            onChange={handleMinChange}
            value={formatDate(frame.min)}
            variant='highlighted'
            icon='CalendarArrowUp'
            type='datetime-local'
          />
          <Input
            key='max-date'
            onChange={handleMaxChange}
            value={formatDate(frame.max)}
            variant='highlighted'
            icon='CalendarArrowDown'
            type='datetime-local'
          />
        </Stack>
      )
    }, [event, frame, plugins])

    return (
      <UIBanner
        title={event ? 'Event enrichment' : 'Data enrichment'}
        done={done}
        loading={!plugins}
        {...props}
      >
        {PluginSelection}
        {FileSelection}
        <FrameSelector />
        <CustomParameters.Editor customParameters={customParameters} setCustomParameters={setCustomParameters} plugin={plugin} />
        <Stack ai='center' gap={4}>
          <Checkbox id='isShowOnlyEnriched' checked={isShowOnlyEnriched} onCheckedChange={v => setIsShowOnlyEnriched(!!v)} />
          <Label htmlFor='isShowOnlyEnriched' value='Show only enriched docs' cursor='pointer' />
        </Stack>

      </UIBanner>
    )
  }
}
