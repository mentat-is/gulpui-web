import { useState } from "react";
import { Banner } from "../ui/Banner";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { useApplication } from "../context/Application.context";
import { OperationCreate } from "../dto/OperationCreate.dto";
import { ColorPicker, ColorPickerPopover, ColorPickerTrigger } from "@/ui/Color";
import { GlyphsPopover } from "@/components/Glyphs.popover";
import { Stack } from "@impactium/components";
import s from './styles/CreateOperationBanner.module.css'
import { Card } from "@/ui/Card";
import { Separator } from "@/ui/Separator";

export function CreateOperationBanner() {
  const { Info, destroyBanner } = useApplication();
  const [name, setName] = useState<string>('');
  const [icon, setIcon] = useState<number>(-1);
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const createOperation = () => {
    const body: Record<string, any> = {
      name
    }

    if (icon >= 0) {
      body.glyph_id = icon;
    }

    api<OperationCreate>('/operation_create', {
      method: 'POST',
      setLoading,
      query: body,
      body: description,
    }, Info.operation_list).then(destroyBanner);
  };

  return (
    <Banner title='Create operation'>
      <Card>
        <Stack ai='center'>
          <p className={s.paramName}>Operation title:</p>
          <Input
            className={s.input}
            img='Heading'
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            placeholder='Operation title' />
        </Stack>
        <Separator />
        <Stack ai='center'>
          <p className={s.paramName}>Operation description:</p>
          <Input
            className={s.input}
            img='Text'
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            placeholder='Operation description' />
        </Stack>
        <Separator />
        <Stack ai='center'>
          <p className={s.paramName}>Operation icon:</p>
          <GlyphsPopover icon={icon} setIcon={setIcon} />
        </Stack>
      </Card>
      <Button
        className={s.doneButton}
        variant={name && description && icon ? 'default' : 'disabled'}
        loading={loading}
        img='Check'
        onClick={createOperation}>Done</Button>
    </Banner>
  )
}