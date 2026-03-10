import { useState, useEffect } from 'react'
import { Stack } from '@/ui/Stack'
import { Input } from '@/ui/Input'
import { Button } from '@/ui/Button'
import * as Dialog from '@radix-ui/react-dialog'
import { Label } from '@/ui/Label'
import { Select } from '@/ui/Select'
import { Checkbox } from '@/ui/Checkbox'
import { Icon } from '@impactium/icons'

/**
 * MappingFieldData defines the structure for a single field configuration 
 * within a mapping object.
 */
export interface MappingFieldData {
  name: string
  flatten_json?: boolean
  force_type?: string
  multiplier?: number
  is_timestamp?: string
  is_gulp_type?: string
  extra_doc_with_event_code?: string
  ecs?: string[]
  timestamp_format?: string
}

interface MappingFieldPanelProps {
  initialData?: MappingFieldData | null
  onSave: (data: MappingFieldData) => void
  open: boolean
  setOpen: (open: boolean) => void
}

/**
 * MappingFieldPanel is a modal dialog for adding or editing a specific field configuration.
 * It provides inputs for all Gulp-supported field transformations like flattening, 
 * type forcing, multipliers, and ECS field mappings.
 */
export function MappingFieldPanel({ initialData, onSave, open, setOpen }: MappingFieldPanelProps) {
  const [name, setName] = useState('')
  const [flattenJson, setFlattenJson] = useState(false)
  const [forceType, setForceType] = useState('none')
  const [multiplier, setMultiplier] = useState('')
  const [isTimestamp, setIsTimestamp] = useState('none')
  const [isGulpType, setIsGulpType] = useState('none')
  const [extraDocWithEventCode, setExtraDocWithEventCode] = useState('')
  const [ecsStr, setEcsStr] = useState('')
  const [timestampFormat, setTimestampFormat] = useState('')

  useEffect(() => {
    if (open) {
      if (initialData) {
        setName(initialData.name)
        setFlattenJson(initialData.flatten_json || false)
        setForceType(initialData.force_type || 'none')
        setMultiplier(initialData.multiplier !== undefined && initialData.multiplier !== null ? String(initialData.multiplier) : '')
        setIsTimestamp(initialData.is_timestamp || 'none')
        setIsGulpType(initialData.is_gulp_type || 'none')
        setExtraDocWithEventCode(initialData.extra_doc_with_event_code || '')
        setEcsStr(initialData.ecs?.join(', ') || '')
        setTimestampFormat(initialData.timestamp_format || '')
      } else {
        setName('')
        setFlattenJson(false)
        setForceType('none')
        setMultiplier('')
        setIsTimestamp('none')
        setIsGulpType('none')
        setExtraDocWithEventCode('')
        setEcsStr('')
        setTimestampFormat('')
      }
    }
  }, [open, initialData])

  /**
   * Constructs the MappingFieldData object from local state and performs cleanup 
   * of undefined/empty properties before calling onSave.
   */
  const handleSave = () => {
    const data: MappingFieldData = {
      name,
      flatten_json: flattenJson ? true : undefined,
      force_type: forceType !== 'none' ? forceType : undefined,
      multiplier: multiplier !== '' && !isNaN(Number(multiplier)) ? Number(multiplier) : undefined,
      is_timestamp: isTimestamp !== 'none' ? isTimestamp : undefined,
      is_gulp_type: isGulpType !== 'none' ? isGulpType : undefined,
      extra_doc_with_event_code: extraDocWithEventCode || undefined,
      ecs: ecsStr ? ecsStr.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      timestamp_format: timestampFormat || undefined
    }

    // Clean up undefined properties to keep the resulting JSON clean
    Object.keys(data).forEach(key => {
      if (data[key as keyof MappingFieldData] === undefined) {
        delete data[key as keyof MappingFieldData]
      }
    })

    onSave(data)
    
    // Reset state if it's a new entry (Add mode)
    if (initialData) {
      setOpen(false)
    } else {
      setName('')
      setFlattenJson(false)
      setForceType('none')
      setMultiplier('')
      setIsTimestamp('none')
      setIsGulpType('none')
      setExtraDocWithEventCode('')
      setEcsStr('')
      setTimestampFormat('')
    }
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
          minWidth: 400, 
          padding: 16, 
          maxHeight: '80vh', 
          overflow: 'auto', 
          zIndex: 53,
          backgroundColor: 'var(--background-100)',
          borderRadius: 8,
          border: '1px solid var(--gray-alpha-400)',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        }}>
        <Stack dir="column" gap={12} ai="stretch">
          <Dialog.Title style={{ fontSize: 13, fontWeight: 'normal', margin: 0, color: 'var(--gray-900)' }}>
            {initialData ? 'Update Field' : 'Add Field'}
          </Dialog.Title>
          
          <Input 
            label="Field Name" 
            placeholder="e.g. field1" 
            value={name} 
            onChange={(e) => setName(e.target.value)}
          />

          <Stack ai="center" gap={8} style={{ padding: '8px 0' }}>
            <Checkbox id="flatten_json" checked={flattenJson} onCheckedChange={(c) => setFlattenJson(!!c)} />
            <Label htmlFor="flatten_json" value="Flatten JSON" cursor="pointer" />
          </Stack>

          <Stack dir="column" gap={6} ai="flex-start" data-input>
            <Label value="Force Type" />
            <Select.Root value={forceType} onValueChange={setForceType}>
              <Select.Trigger value={forceType} data-no-icon style={{ width: '100%' }}>
                {forceType === 'none' ? 'None' : forceType}
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="none">None</Select.Item>
                <Select.Item value="str">str</Select.Item>
                <Select.Item value="int">int</Select.Item>
                <Select.Item value="float">float</Select.Item>
              </Select.Content>
            </Select.Root>
          </Stack>

          <Input 
            label="Multiplier" 
            placeholder="e.g. 1000" 
            type="number"
            value={multiplier} 
            onChange={(e) => setMultiplier(e.target.value)} 
            variant="highlighted"
            icon="ChevronRight" 
          />

          <Stack dir="column" gap={6} ai="flex-start" data-input>
            <Label value="Is Timestamp" />
            <Select.Root value={isTimestamp} onValueChange={setIsTimestamp}>
              <Select.Trigger value={isTimestamp} data-no-icon style={{ width: '100%' }}>
                {isTimestamp === 'none' ? 'None' : isTimestamp}
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="none">None</Select.Item>
                <Select.Item value="chrome">chrome</Select.Item>
                <Select.Item value="windows_filetime">windows_filetime</Select.Item>
                <Select.Item value="generic">generic</Select.Item>
              </Select.Content>
            </Select.Root>
          </Stack>

          <Stack dir="column" gap={6} ai="flex-start" data-input>
            <Label value="Is Gulp Type" />
            <Select.Root value={isGulpType} onValueChange={setIsGulpType}>
              <Select.Trigger value={isGulpType} data-no-icon style={{ width: '100%' }}>
                {isGulpType === 'none' ? 'None' : isGulpType}
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="none">None</Select.Item>
                <Select.Item value="context_id">context_id</Select.Item>
                <Select.Item value="context_name">context_name</Select.Item>
                <Select.Item value="source_id">source_id</Select.Item>
                <Select.Item value="source_name">source_name</Select.Item>
              </Select.Content>
            </Select.Root>
          </Stack>

          <Input 
            label="Extra Doc With Event Code" 
            placeholder="e.g. some_code" 
            value={extraDocWithEventCode} 
            onChange={(e) => setExtraDocWithEventCode(e.target.value)}
          />
          
          <Input 
            label="ECS Fields (comma separated)" 
            placeholder="e.g. file.name, file.hash.sha256" 
            value={ecsStr} 
            onChange={(e) => setEcsStr(e.target.value)} 
          />

          <Input 
            label="Timestamp Format" 
            placeholder="e.g. %Y-%m-%d %H:%M:%S" 
            value={timestampFormat} 
            onChange={(e) => setTimestampFormat(e.target.value)} 
          />

          <Stack dir="row" gap={8} jc="flex-end" style={{ marginTop: 8 }}>
            <Button 
              variant="secondary" 
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="tertiary" 
              disabled={!name} 
              onClick={handleSave}
            >
              {initialData ? 'Update' : 'Add'}
            </Button>
          </Stack>
        </Stack>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
