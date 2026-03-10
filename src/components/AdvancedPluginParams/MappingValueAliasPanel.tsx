import { useState, useEffect } from 'react'
import { Stack } from '@/ui/Stack'
import { Input } from '@/ui/Input'
import { Button } from '@/ui/Button'
import * as Dialog from '@radix-ui/react-dialog'
import { Label } from '@/ui/Label'

/**
 * MappingValueAliasData represents a value translation rule for a specific field.
 */
export interface MappingValueAliasData {
  field: string
  oldValue: string
  newValue: string
}

interface MappingValueAliasPanelProps {
  initialData?: MappingValueAliasData | null
  onSave: (data: MappingValueAliasData) => void
  open: boolean
  setOpen: (open: boolean) => void
}

/**
 * MappingValueAliasPanel is a modal dialog for configuring value translations.
 * It maps an 'oldValue' found in the source data to a 'newValue' in the output 
 * for a designated field.
 */
export function MappingValueAliasPanel({ initialData, onSave, open, setOpen }: MappingValueAliasPanelProps) {
  const [field, setField] = useState('')
  const [oldValue, setOldValue] = useState('')
  const [newValue, setNewValue] = useState('')

  useEffect(() => {
    if (open) {
      if (initialData) {
        setField(initialData.field)
        setOldValue(initialData.oldValue)
        setNewValue(initialData.newValue)
      } else {
        setField('')
        setOldValue('')
        setNewValue('')
      }
    }
  }, [open, initialData])

  /**
   * Constructs the MappingValueAliasData and triggers the save callback.
   */
  const handleSave = () => {
    onSave({ field, oldValue, newValue })
    
    // Reset state for "Add" mode
    if (initialData) {
      setOpen(false)
    } else {
      setField('')
      setOldValue('')
      setNewValue('')
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
          minWidth: 320, 
          padding: 16, 
          zIndex: 53,
          backgroundColor: 'var(--background-100)',
          borderRadius: 8,
          border: '1px solid var(--gray-alpha-400)',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        }}>
        <Stack dir="column" gap={12} ai="stretch">
          <Dialog.Title style={{ fontSize: 13, fontWeight: 'normal', margin: 0, color: 'var(--gray-900)' }}>
            {initialData ? 'Update Value Alias' : 'Add Value Alias'}
          </Dialog.Title>
          <Input 
            label="Field Name" 
            placeholder="e.g. network.direction" 
            value={field} 
            onChange={(e) => setField(e.target.value)} 
            
          />
          
          <Input 
            label="Old Value" 
            placeholder="Original string to match" 
            value={oldValue} 
            onChange={(e) => setOldValue(e.target.value)} 
             
          />
          
          <Input 
            label="New Value" 
            placeholder="Replacement string" 
            value={newValue} 
            onChange={(e) => setNewValue(e.target.value)} 
             
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
              disabled={!field || !oldValue || !newValue} 
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
