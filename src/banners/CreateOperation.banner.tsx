import { useCallback, useState } from 'react';
import { Banner } from '../ui/Banner';
import { Input } from '../ui/Input';
import { Button } from '@impactium/components';
import { useApplication } from '../context/Application.context';
import { OperationCreate } from '../dto/OperationCreate.dto';
import { GlyphsPopover } from '@/components/Glyphs.popover';
import { Stack } from '@impactium/components';
import s from './styles/CreateOperationBanner.module.css'
import { Card } from '@/ui/Card';
import { Separator } from '@/ui/Separator';
import { GlyphMap } from '@/dto/Glyph.dto';
import { λGlyph } from '@/dto/λGlyph.dto';

export function CreateOperationBanner() {
  const { Info, destroyBanner } = useApplication();
  const [name, setName] = useState<string>('');
  const [icon, setIcon] = useState<λGlyph['id'] | null>(GlyphMap.keys().next().value || null);
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const createOperation = () => {
    const body: Record<string, any> = {
      name
    }

    if (icon) {
      body.glyph_id = icon;
    }

    api<OperationCreate>('/operation_create', {
      method: 'POST',
      setLoading,
      query: body,
      body: description,
    }, Info.operation_list).then(destroyBanner);
  };

  const DoneButton = useCallback(() => {
    return (
      <Button
        variant='glass'
        disabled={!name || !description}
        loading={loading}
        img='Check'
        onClick={createOperation} />
    )
  }, [name, description, loading]);

  return (
    <Banner title='Create an Operation' done={<DoneButton />}>
      <Stack ai='center'>
        <p className={s.paramName}>Operation name:</p>
        <Input
          className={s.input}
          img='Heading'
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder='Operation name' />
      </Stack>
      <Stack ai='center'>
        <p className={s.paramName}>Operation description:</p>
        <Input
          className={s.input}
          img='Text'
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          placeholder='Operation description' />
      </Stack>
      <Stack ai='center'>
        <p className={s.paramName}>Operation icon:</p>
        <GlyphsPopover icon={icon} setIcon={setIcon} />
      </Stack>
    </Banner>
  )
}