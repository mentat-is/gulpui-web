import { Notification } from '@/ui/Notification'
import { useEffect, useState } from 'react'
import { Popover } from '@/ui/Popover'
import { Button } from '@/ui/Button'
import { Stack } from '@/ui/Stack'
import { Label } from '@/ui/Label'
import { toast } from 'sonner'

interface AdvancedPluginParamsProps {
  pluginParams: Record<string, any>
  updatePluginParams: (params: Record<string, any>) => void
  loadExample?: () => Promise<Record<string, any>>
}

export function AdvancedPluginParams({
  pluginParams,
  updatePluginParams,
  loadExample
}: AdvancedPluginParamsProps) {
  const [open, setOpen] = useState(false)
  const [jsonText, setJsonText] = useState('')
  const [example, setExample] = useState<string>('')

  useEffect(() => {
    if (open) {
      setJsonText(JSON.stringify(pluginParams || {}, null, 2))
    }
  }, [open, pluginParams])

  const onOpenChange = async (o: boolean) => {
    setOpen(o)
    if (o && loadExample) {
      try {
        const data = await loadExample()
        setExample(JSON.stringify(data, null, 2))
      } catch {
        setExample('')
      }
    }
  }

  const apply = () => {
    try {
      const parsed = JSON.parse(jsonText)
      updatePluginParams(parsed)
      toast.success('Plugin params applied!')
      setOpen(false)
    } catch {
      toast.error('Invalid JSON')
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>
        <Button variant="tertiary" icon="Code" style={{ width: '100%' }}>
          Advanced
        </Button>
      </Popover.Trigger>

      <Popover.Content style={{ minWidth: 420, maxHeight: '50vh', overflow: 'auto' }}>
        <Stack dir="column" gap={6}>
          <Label value="plugin_params (JSON)" />

          <textarea
            style={{ width: '100%', minHeight: 200, fontSize: 12 }}
            value={jsonText}
            onChange={e => setJsonText(e.target.value)}
          />

          <Stack dir="row" gap={8}>
            {loadExample && (
              <Popover.Root>
                <Popover.Trigger asChild>
                  <Button variant="secondary" icon="Info" style={{ width: '100%' }}>
                    Example
                  </Button>
                </Popover.Trigger>
                <Popover.Content side="left" align="end">
                  <Notification variant="warning" icon="Code">
                    Example plugin_params
                  </Notification>
                  <pre style={{ fontSize: 10 }}>{example || 'No example available'}</pre>
                </Popover.Content>
              </Popover.Root>
            )}

            <Button variant="tertiary" style={{ width: '100%' }} onClick={apply}>
              Apply
            </Button>
          </Stack>
        </Stack>
      </Popover.Content>
    </Popover.Root>
  )
}
