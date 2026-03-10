import { useState, useEffect } from 'react'
import { Stack } from '@/ui/Stack'
import { Input } from '@/ui/Input'
import { Button } from '@/ui/Button'
import * as Dialog from '@radix-ui/react-dialog'
import { Label } from '@/ui/Label'
import { SummaryTable } from './SummaryTable'
import { MappingFieldData, MappingFieldPanel } from './MappingFieldPanel'
import { MappingValueAliasData, MappingValueAliasPanel } from './MappingValueAliasPanel'
import { Separator } from '@/ui/Separator'

/**
 * MappingData represents the structure of a Gulp mapping configuration object,
 * including identity, filtering rules, and nested field/alias transformations.
 */
export interface MappingData {
  id: string
  agent_type?: string
  description?: string
  event_code?: string
  exclude?: string[]
  include?: string[]
  default_context?: string
  default_source?: string
  default_encoding?: string
  fields?: Record<string, Partial<MappingFieldData>>
  value_aliases?: Record<string, { default: Record<string, string> }>
}

interface MappingPanelProps {
  initialData?: MappingData | null
  onSave: (data: MappingData) => void
  open: boolean
  setOpen: (open: boolean) => void
}

/**
 * MappingPanel is a high-level modal component for managing a MappingData object.
 * It coordinates multiple sub-panels for field definitions and value aliases,
 * providing recursive configuration capabilities.
 */
export function MappingPanel({ initialData, onSave, open, setOpen }: MappingPanelProps) {
  const [id, setId] = useState('')
  const [agentType, setAgentType] = useState('')
  const [description, setDescription] = useState('')
  const [eventCode, setEventCode] = useState('')
  const [excludeStr, setExcludeStr] = useState('')
  const [includeStr, setIncludeStr] = useState('')
  const [defaultContext, setDefaultContext] = useState('')
  const [defaultSource, setDefaultSource] = useState('')
  const [defaultEncoding, setDefaultEncoding] = useState('')

  const [fields, setFields] = useState<MappingFieldData[]>([])
  const [aliases, setAliases] = useState<MappingValueAliasData[]>([])

  // State for sub-panels
  const [isFieldPanelOpen, setIsFieldPanelOpen] = useState(false)
  const [editingField, setEditingField] = useState<MappingFieldData | null>(null)
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null)

  const [isAliasPanelOpen, setIsAliasPanelOpen] = useState(false)
  const [editingAlias, setEditingAlias] = useState<MappingValueAliasData | null>(null)
  const [editingAliasIndex, setEditingAliasIndex] = useState<number | null>(null)

  // Hydrating the panel state from the initialData object when editing an existing mapping.
  // This logic reconstructs the flat lists for Fields and Aliases from the nested JSON.
  useEffect(() => {
    if (open) {
      if (initialData) {
        setId(initialData.id)
        setAgentType(initialData.agent_type || '')
        setDescription(initialData.description || '')
        setEventCode(initialData.event_code || '')
        setExcludeStr(initialData.exclude?.join(', ') || '')
        setIncludeStr(initialData.include?.join(', ') || '')
        setDefaultContext(initialData.default_context || '')
        setDefaultSource(initialData.default_source || '')
        setDefaultEncoding(initialData.default_encoding || '')

        // Parse fields into a displayable list
        const parsedFields: MappingFieldData[] = []
        if (initialData.fields) {
          Object.entries(initialData.fields).forEach(([fieldName, fieldData]) => {
            parsedFields.push({ name: fieldName, ...fieldData })
          })
        }
        setFields(parsedFields)

        // Parse aliases into a displayable list
        const parsedAliases: MappingValueAliasData[] = []
        if (initialData.value_aliases) {
          Object.entries(initialData.value_aliases).forEach(([fieldName, valueMap]) => {
            if (valueMap.default) {
              Object.entries(valueMap.default).forEach(([oldValue, newValue]) => {
                parsedAliases.push({ field: fieldName, oldValue, newValue })
              })
            }
          })
        }
        setAliases(parsedAliases)
      } else {
        // Reset state for "Create Mapping" mode
        setId('')
        setAgentType('')
        setDescription('')
        setEventCode('')
        setExcludeStr('')
        setIncludeStr('')
        setDefaultContext('')
        setDefaultSource('')
        setDefaultEncoding('')
        setFields([])
        setAliases([])
      }
    }
  }, [open, initialData])

  const handleSaveField = (fieldData: MappingFieldData) => {
    if (editingFieldIndex !== null) {
      const newFields = [...fields]
      newFields[editingFieldIndex] = fieldData
      setFields(newFields)
    } else {
      setFields([...fields, fieldData])
    }
  }

  const handleDeleteField = (_: MappingFieldData, idx: number) => {
    setFields(fields.filter((_, i) => i !== idx))
  }

  const handleSaveAlias = (aliasData: MappingValueAliasData) => {
    if (editingAliasIndex !== null) {
      const newAliases = [...aliases]
      newAliases[editingAliasIndex] = aliasData
      setAliases(newAliases)
    } else {
      setAliases([...aliases, aliasData])
    }
  }

  const handleDeleteAlias = (_: MappingValueAliasData, idx: number) => {
    setAliases(aliases.filter((_, i) => i !== idx))
  }

  /**
   * Transforms the UI list-based state back into the structured MappingData object.
   * It aggregates individual field and alias entries into nested Record objects.
   */
  const handleSave = () => {
    const fieldsObj: Record<string, Partial<MappingFieldData>> = {}
    fields.forEach(f => {
      const { name, ...rest } = f
      if (Object.keys(rest).length > 0) {
        fieldsObj[name] = rest
      }
    })

    const aliasesObj: Record<string, { default: Record<string, string> }> = {}
    aliases.forEach(a => {
      if (!aliasesObj[a.field]) {
        aliasesObj[a.field] = { default: {} }
      }
      aliasesObj[a.field].default[a.oldValue] = a.newValue
    })

    const data: MappingData = {
      id,
      agent_type: agentType || undefined,
      description: description || undefined,
      event_code: eventCode || undefined,
      exclude: excludeStr ? excludeStr.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      include: includeStr ? includeStr.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      default_context: defaultContext || undefined,
      default_source: defaultSource || undefined,
      default_encoding: defaultEncoding || undefined,
      fields: Object.keys(fieldsObj).length > 0 ? fieldsObj : undefined,
      value_aliases: Object.keys(aliasesObj).length > 0 ? aliasesObj : undefined
    }

    onSave(data)
    setOpen(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)', zIndex: 52 }} />
        <Dialog.Content 
          aria-describedby={undefined}
          style={{ 
          position: 'fixed', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          minWidth: 600, 
          padding: 24, 
          maxHeight: '80vh', 
          overflow: 'auto', 
          zIndex: 53,
          backgroundColor: 'var(--background-100)',
          borderRadius: 8,
          border: '1px solid var(--gray-alpha-400)',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        }}>
          <Stack dir="column" gap={16} ai="stretch">
          <Dialog.Title style={{ fontSize: 16, fontWeight: 'bold', margin: 0, color: 'var(--gray-900)' }}>
            {initialData ? 'Update Mapping Object' : 'Create Mapping Object'}
          </Dialog.Title>
          
          <Stack dir="row" gap={16} ai="flex-start">
            <Stack dir="column" gap={12} ai="stretch" style={{ flex: 1 }}>
              <Input label="Mapping ID" value={id} onChange={(e) => setId(e.target.value)} disabled={!!initialData} />
              <Input label="Agent Type" value={agentType} onChange={(e) => setAgentType(e.target.value)}  />
              <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)}  />
              <Input label="Event Code" value={eventCode} onChange={(e) => setEventCode(e.target.value)}  />
              <Input label="Exclude (comma separated)" value={excludeStr} onChange={(e) => setExcludeStr(e.target.value)}  />
            </Stack>
            <Stack dir="column" gap={12} ai="stretch" style={{ flex: 1 }}>
              <Input label="Include (comma separated)" value={includeStr} onChange={(e) => setIncludeStr(e.target.value)}  />
              <Input label="Default Context" value={defaultContext} onChange={(e) => setDefaultContext(e.target.value)}  />
              <Input label="Default Source" value={defaultSource} onChange={(e) => setDefaultSource(e.target.value)}  />
              <Input label="Default Encoding" value={defaultEncoding} onChange={(e) => setDefaultEncoding(e.target.value)}  />
            </Stack>
          </Stack>

          <Separator style={{ margin: '8px 0' }} />

          <Stack dir="row" jc="space-between" ai="center">
            <Label value="Fields" style={{ fontWeight: 'bold' }} />
            <Button variant="secondary" onClick={() => { setEditingField(null); setEditingFieldIndex(null); setIsFieldPanelOpen(true) }}>
              Add Field
            </Button>
            <MappingFieldPanel 
              open={isFieldPanelOpen} 
              setOpen={setIsFieldPanelOpen} 
              onSave={handleSaveField} 
              initialData={editingField} 
            />
          </Stack>
          <SummaryTable 
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'force_type', label: 'Force Type' },
              { key: 'is_timestamp', label: 'Is Timestamp' },
              { key: 'ecs', label: 'ECS' }
            ]} 
            data={fields}
            onEdit={(item, index) => {
              setEditingField(item)
              setEditingFieldIndex(index)
              setIsFieldPanelOpen(true)
            }}
            onDelete={handleDeleteField}
          />

          <Separator style={{ margin: '8px 0' }} />

          <Stack dir="row" jc="space-between" ai="center">
            <Label value="Value Aliases" style={{ fontWeight: 'bold' }} />
            <Button variant="secondary" onClick={() => { setEditingAlias(null); setEditingAliasIndex(null); setIsAliasPanelOpen(true) }}>
              Add Value Alias
            </Button>
            <MappingValueAliasPanel 
              open={isAliasPanelOpen} 
              setOpen={setIsAliasPanelOpen} 
              onSave={handleSaveAlias} 
              initialData={editingAlias} 
            />
          </Stack>
          <SummaryTable 
            columns={[
              { key: 'field', label: 'Field' },
              { key: 'oldValue', label: 'Old Value' },
              { key: 'newValue', label: 'New Value' }
            ]} 
            data={aliases}
            onEdit={(item, index) => {
              setEditingAlias(item)
              setEditingAliasIndex(index)
              setIsAliasPanelOpen(true)
            }}
            onDelete={handleDeleteAlias}
          />

          <Stack dir="row" gap={8} jc="flex-end" style={{ marginTop: 16 }}>
            <Button 
              variant="secondary" 
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="glass" 
              icon={initialData ? "Save" : "Plus"} 
              disabled={!id}
              onClick={handleSave}
            >
              {initialData ? 'Update Mapping' : 'Add Mapping'}
            </Button>
          </Stack>
        </Stack>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
