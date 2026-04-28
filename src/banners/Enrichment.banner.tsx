import { GulpDataset, MinMax, MinMaxBase } from '@/class/Info'
import { Application } from '@/context/Application.context'
import { Default } from '@/dto/Dataset'
import { Banner as UIBanner } from '@/ui/Banner'
import { Select } from '@/ui/Select'
import { Label } from '@/ui/Label'
import { Icon } from '@impactium/icons'
import { generateUUID } from '@/ui/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/ui/Tooltip'
import { format } from 'date-fns'
import {
  ChangeEvent, CSSProperties, useCallback,
  useEffect, useMemo, useState,
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

// --- CONSTANTS ---

const DISABLED_STYLE: CSSProperties = {
  pointerEvents: 'none',
  color: 'var(--second)',
}

// --- UTILITIES ---

/**
 * Automatically detects the type of a string value (IP, Domain, Email, MAC, Hash, URL).
 * @param value The string to test
 * @returns detected type name or null
 */
const detectType = (value: string): string | null => {
  const v = value.trim()

  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)|(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}$/i
  if (ipRegex.test(v)) return 'ip'

  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i
  if (domainRegex.test(v)) return 'domain'

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  if (emailRegex.test(v)) return 'mail'

  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/
  if (macRegex.test(v)) return 'mac'

  const md5Regex = /^[a-fA-F0-9]{32}$/
  const sha1Regex = /^[a-fA-F0-9]{40}$/
  const sha256Regex = /^[a-fA-F0-9]{64}$/
  if (md5Regex.test(v) || sha1Regex.test(v) || sha256Regex.test(v)) return 'hash'

  const urlRegex = /^(http:\/\/|https:\/\/)?([\da-z\.-]+)\.([a-z0-9\.]{2,10})(:\d+)?([\/\w \.-]*)*\/?$/i
  if (urlRegex.test(v)) return 'url'

  return null
}

/**
 * Transforms an array of field objects into a record of key-value pairs.
 * @param fields Array of {key, value} objects
 * @returns Record of key/values
 */
const prepareFormattedFields = (fields: { key: string, value: string | null }[]): Record<string, string | null> => {
  return fields.reduce((acc, f) => {
    if (!f.key) return acc
    acc[f.key] = f.value
    return acc
  }, {} as Record<string, string | null>)
}

// --- SUB-COMPONENTS ---

interface FieldRowProps {
  field: { id: string, key: string, value: string | null }
  index: number
  isReadOnly: boolean
  onUpdate: (index: number, updates: Partial<FieldRowProps['field']>) => void
  onDelete: (id: string) => void
}

/**
 * Renders a single row for field key/value configuration.
 */
function FieldRow({ field, index, isReadOnly, onUpdate, onDelete }: FieldRowProps) {
  return (
    <Stack gap={8} ai='center'>
      <Input
        placeholder='Field key'
        value={field.key}
        readOnly={isReadOnly}
        onChange={e => onUpdate(index, { key: e.target.value })}
      />
      <Input
        placeholder='Field value'
        disabled={field.value === null}
        readOnly={isReadOnly}
        value={field.value ?? ''}
        onChange={e => onUpdate(index, { value: e.target.value })}
      />
      <Checkbox
        checked={field.value !== null}
        disabled={isReadOnly}
        onCheckedChange={(checked) => onUpdate(index, { value: checked ? '' : null })}
      />
      <Button
        variant='tertiary'
        icon='Trash'
        disabled={isReadOnly}
        onClick={() => onDelete(field.id)}
      />
    </Stack>
  )
}

interface TimeRangeSelectorProps {
  event?: Doc.Type
  frame: MinMax
  setFrame: (updater: (prev: MinMax) => MinMax) => void
  isLoaded: boolean
}

/**
 * Renders either the specific event ID or date-time inputs for range enrichment.
 */
function TimeRangeSelector({ event, frame, setFrame, isLoaded }: TimeRangeSelectorProps) {
  const handleMinChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setFrame((prev) => ({ ...prev, min: new Date(value).getTime() }))
  }, [setFrame])

  const handleMaxChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setFrame((prev) => ({ ...prev, max: new Date(value).getTime() }))
  }, [setFrame])

  const formatDate = (timestamp: number) => {
    return isNaN(timestamp) ? '' : format(timestamp, "yyyy-MM-dd'T'HH:mm")
  }

  if (event) {
    return (
      <Skeleton width='full' className={s.skeleton} show={!isLoaded}>
        <Input
          value={event._id}
          readOnly
          variant='highlighted'
          style={DISABLED_STYLE}
          icon={Default.Icon.EVENT}
        />
      </Skeleton>
    )
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
}

// --- MAIN COMPONENT ---

export namespace Enrichment {
  export interface Props extends UIBanner.Props {
    event?: Doc.Type
    onEnrichment?: (event: Doc.Type) => void
    enrichmentField?: { key: string, value: string }
  }

  export function Banner({ event, onEnrichment, enrichmentField, ...props }: Enrichment.Props) {
    const { Info, app, destroyBanner } = Application.use()

    // --- STATE ---
    const [file, setFile] = useState<Source.Type | null>(
      event ? Source.Entity.id(app, event['gulp.source_id']) : null,
    )
    const [allEnrichmentPlugins, setAllEnrichmentPlugins] = useState<GulpDataset.PluginList.Interface[]>()
    const [plugins, setPlugins] = useState<GulpDataset.PluginList.Interface[]>()
    const [plugin, setPlugin] = useState<GulpDataset.PluginList.Interface>()
    const [availableTypes, setAvailableTypes] = useState<string[]>([])
    const [selectedType, setSelectedType] = useState<string>('Other')
    const [customParameters, setCustomParameters] = useState<Record<string, any>>({})
    const [loading, setLoading] = useState<boolean>(false)
    const [isShowOnlyEnriched, setIsShowOnlyEnriched] = useState<boolean>(true)
    const [fields, setFields] = useState<{ id: string, key: string, value: string | null }[]>([])
    const [frame, setFrame] = useState<MinMax>(MinMaxBase)

    // --- EFFECTS: Initialization & Filtering ---

    // Initialize custom parameters when plugin changes
    useEffect(() => {
      if (!plugin) return setCustomParameters({})
      const parameters: Record<string, any> = {}
      plugin.custom_parameters.forEach((p) => { parameters[p.name] = null })
      setCustomParameters(parameters)
    }, [plugin])

    // Load and filter enrichment plugins
    useEffect(() => {
      Info.plugin_list().then((allPlugins) => {
        const enrichmentPlugins = allPlugins.filter((p) => p.type.includes('enrichment'))
        setAllEnrichmentPlugins(enrichmentPlugins)

        const types = new Set<string>()
        enrichmentPlugins.forEach(p => {
          const data = p.data as Record<string, any>
          if (data) {
            Object.keys(data).forEach(k => types.add(k))
          }
        })
        const available = Array.from(types).sort()
        setAvailableTypes(available)

        if (!enrichmentField) {
           setSelectedType('Other')
        } else {
           let autoDetected: string | null = null
           const detectedRegexType = detectType(enrichmentField.value)

           for (const p of enrichmentPlugins) {
             const data = p.data as Record<string, { ecs_fields?: string[]; regexp?: string }>
             if (!data) continue
             for (const [typeName, config] of Object.entries(data)) {
               if (config.ecs_fields?.includes(enrichmentField.key)) {
                 autoDetected = typeName
                 break
               }
               if (config.regexp) {
                 try {
                    if (new RegExp(config.regexp, 'i').test(enrichmentField.value)) {
                      autoDetected = typeName
                      break
                    }
                 } catch (e) { /* ignore */ }
               }
               
               const hasNoEcsFields = !config.ecs_fields || config.ecs_fields.filter(f => f !== "").length === 0
               if (hasNoEcsFields && !config.regexp && detectedRegexType === typeName) {
                 autoDetected = typeName
                 break
               }
             }
             if (autoDetected) break
           }
           
           if (autoDetected && available.includes(autoDetected)) {
             setSelectedType(autoDetected)
           } else {
             setSelectedType('Other')
           }
        }
      })
    }, [enrichmentField, Info])

    // Filter plugins based on selectedType
    useEffect(() => {
      if (!allEnrichmentPlugins) return

      let filtered = allEnrichmentPlugins
      if (selectedType !== 'Other') {
        filtered = allEnrichmentPlugins.filter((p) => {
          const data = p.data as Record<string, any>
          return data && !!data[selectedType]
        })
      }
      
      setPlugins(filtered)
      
      setPlugin(prev => {
         if (prev && !filtered.find(f => f.filename === prev.filename)) {
            return undefined
         }
         return prev
      })
    }, [selectedType, allEnrichmentPlugins])

    // Initialize fields from props
    useEffect(() => {
      if (enrichmentField) {
        setFields([{ id: generateUUID(), key: enrichmentField.key, value: enrichmentField.value }])
      }
    }, [enrichmentField])

    // Initialize time frame from source
    useEffect(() => {
      if (!file) return
      setFrame({
        min: Internal.Transformator.toTimestamp(file.nanotimestamp.min, 'floor'),
        max: Internal.Transformator.toTimestamp(file.nanotimestamp.max, 'ceil'),
      })
    }, [file])

    // --- HANDLERS ---

    const handleUpdateField = useCallback((index: number, updates: Partial<{ key: string, value: string | null }>) => {
      setFields(prev => {
        const next = [...prev]
        next[index] = { ...next[index], ...updates }
        return next
      })
    }, [])

    const handleDeleteField = useCallback((id: string) => {
      setFields(prev => prev.filter(f => f.id !== id))
    }, [])

    const handleAddField = useCallback(() => {
      setFields(prev => [...prev, { id: generateUUID(), key: '', value: null }])
    }, [])

    const submit = async () => {
      if (!file || !plugin) return
      const formattedFields = prepareFormattedFields(fields)
      setLoading(true)

      try {
        if (event) {
          const enriched = await Info.enrich_single_id(plugin.filename, event, customParameters, formattedFields)
          if (enriched && onEnrichment) onEnrichment(enriched)
        } else {
          await Info.enrichment(plugin.filename, file, frame, customParameters, isShowOnlyEnriched, formattedFields)
        }
        destroyBanner()
      } finally {
        setLoading(false)
      }
    }

    // --- UI SEGMENTS ---

    const FileSelection = useMemo(() => {
      if (event && file) {
        return (
          <Skeleton show={!plugins} width='full' className={s.skeleton}>
            <Input icon={Source.Entity.icon(file)} readOnly value={file.name} variant='highlighted' style={DISABLED_STYLE} />
          </Skeleton>
        )
      }

      return (
        <Select.Root onValueChange={(id) => setFile(Source.Entity.id(app, id as unknown as Source.Id))}>
          <Select.Trigger>
            <Stack style={{ pointerEvents: event ? 'none' : 'all' }} gap={16}>
              <Icon variant='dimmed' name={file ? Source.Entity.icon(file) : Default.Icon.SESSION} />
              {file ? file.name : 'Select source you want to enrich'}
            </Stack>
          </Select.Trigger>
          <Select.Content>
            {Source.Entity.selected(app).map((f) => (
              <Select.Item key={f.id} value={f.id}>{f.name}</Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      )
    }, [plugins, file, event, app])

    const TypeSelection = useMemo(() => {
      if (!allEnrichmentPlugins) return <Skeleton className={s.skeleton} width='full' />

      return (
        <Select.Root value={selectedType} onValueChange={(val) => setSelectedType(val)}>
          <Select.Trigger>
            <Stack gap={16}>
              <Icon variant='dimmed' name='Filter' />
              {selectedType === 'Other' ? 'Observable Type: Other (All Plugins)' : `Observable Type: ${selectedType}`}
            </Stack>
          </Select.Trigger>
          <Select.Content>
            {availableTypes.map((type) => (
              <Select.Item key={type} value={type}>{type}</Select.Item>
            ))}
            <Select.Item value='Other'>Other</Select.Item>
          </Select.Content>
        </Select.Root>
      )
    }, [selectedType, availableTypes, allEnrichmentPlugins])

    const PluginSelection = useMemo(() => {
      if (!plugins) return <Skeleton className={s.skeleton} width='full' />

      return (
        <Select.Root value={plugin?.filename} onValueChange={(filename) => setPlugin(plugins.find((p) => p.filename === filename))}>
          <Select.Trigger>
            <Stack gap={16}>
              <Icon variant='dimmed' name='Puzzle' />
              {plugin ? plugin.filename : 'Select plugin you want to use for enrichment'}
            </Stack>
          </Select.Trigger>
          <Select.Content>
            {plugins.map((p) => (
              <Select.Item key={p.filename} value={p.filename}>{p.filename}</Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      )
    }, [plugin, plugins])

    const doneElement = (
      <Button disabled={!file || !plugin} variant='glass' icon='Check' onClick={submit} loading={loading} />
    )

    return (
      <UIBanner
        title={event ? 'Event enrichment' : 'Data enrichment'}
        done={doneElement}
        loading={!plugins}
        {...props}
      >
        {TypeSelection}
        {PluginSelection}
        {FileSelection}
        <TimeRangeSelector event={event} frame={frame} setFrame={setFrame} isLoaded={!!plugins} />
        
        <CustomParameters.Editor 
          customParameters={customParameters} 
          setCustomParameters={setCustomParameters} 
          plugin={plugin} 
        />
        
        <Stack style={{ border: '1px solid var(--border)', borderRadius: 6, padding: 8 }} gap={8} dir='column'>
          <Stack ai='center' jc='space-between'>
            <Label value='Fields' />
            {!enrichmentField && <Button variant='tertiary' icon='Plus' onClick={handleAddField} />}
          </Stack>
          
          <EnrichmentTooltip />
          
          {fields.map((field, index) => (
            <FieldRow
              key={field.id}
              field={field}
              index={index}
              isReadOnly={!!enrichmentField}
              onUpdate={handleUpdateField}
              onDelete={handleDeleteField}
            />
          ))}
        </Stack>

        <Stack ai='center' gap={4}>
          <Checkbox id='isShowOnlyEnriched' checked={isShowOnlyEnriched} onCheckedChange={v => setIsShowOnlyEnriched(!!v)} />
          <Label htmlFor='isShowOnlyEnriched' value='Show only enriched docs' cursor='pointer' />
        </Stack>
      </UIBanner>
    )
  }
}

/**
 * Help tooltip for enrichment fields documentation.
 */
function EnrichmentTooltip() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <p style={{
            fontSize: 12,
            color: 'var(--second)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            cursor: 'help'
          }}>
            Define key/value pairs for enrichment. Use `null` values to extract data from the document, or specific values to override/add new data. Supports dot notation for nested fields.
          </p>
        </TooltipTrigger>
        <TooltipContent className={s.tooltip}>
          <p>
            A dict with key/value pairs to be updated (`enriched`) in the document, following this pattern: <br />
            - A field with a <b>None</b> value will trigger plugin to get the value from the document and process it with the enrichment source. <br />
            Example: <code>{`{ "host.name": null, "ip.address": null }`}</code> will enrich using values from `host.name` and `ip.address` fields in the document.<br />
            <br />
            - A field with a <b>value set</b> will trigger `plugin` to process that value with the enrichment source. <br />
            Example: <code>{`{ "host.name": "example.com", "ip.address": "8.8.8.8" }`}</code> will enrich "host.name" and "ip.address" using provided values.<br />
            <br />
            - A mix of the two is also possible.<br />
            <br />
            `Dot notation` is supported for nested fields, i.e.: field1.field2, arrayfield[0].field3, and so on.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
