import { useCallback, useState } from 'react';
import { Banner } from '../ui/Banner';
import { Button, Input } from '@impactium/components';
import { useApplication } from '../context/Application.context';
import { Stack } from '@impactium/components';
import s from './styles/CreateOperationBanner.module.css'
import { λGlyph } from '@/dto/Dataset';
import { Index } from '@/class/Info';
import { OperationBanner } from './Operation.banner';
import { Glyph } from '@/ui/Glyph';
import { λIndex } from '@/dto/Index.dto';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/ui/Select';

export function CreateOperationBanner() {
  const { app, Info, spawnBanner } = useApplication();
  const [name, setName] = useState<string>('');
  const [index, setIndex] = useState<λIndex['name'] | null>(null);
  const [icon, setIcon] = useState<λGlyph['id'] | null>(Glyph.List.keys().next().value || null);
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const createOperation = () => {
    if (!index) {
      return;
    }

    api<any>('/operation_create', {
      method: 'POST',
      setLoading,
      query: {
        name,
        index,
      },
      deassign: true,
      body: description.toString(),
    }, Info.sync).then(() => {
      spawnBanner(<OperationBanner />);
    });
  };

  const DoneButton = useCallback(() => {
    return (
      <Button
        variant='glass'
        disabled={!name || !description || !index}
        loading={loading}
        img='Check'
        onClick={createOperation} />
    )
  }, [name, description, loading, index]);

  const selectIndexHandler = (value: string) => {
    setIndex(value as λIndex['name']);
  } 

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
      <Select onValueChange={selectIndexHandler}>
        <SelectTrigger value={index || ''}>
          {index}
        </SelectTrigger>
        <SelectContent>
          {app.target.indexes.map(index => {
            return <SelectItem value={index.name}>{index.name}</SelectItem>
          })}
        </SelectContent>
      </Select>
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
        <Glyph.Chooser icon={icon} setIcon={setIcon} />
      </Stack>
    </Banner>
  )
}