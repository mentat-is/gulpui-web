import { Banner } from "@/ui/Banner";
import { Button, Stack } from "@impactium/components";
import React, { useCallback, useEffect, useState } from "react";
import { CreateOperationBanner } from "./CreateOperation.banner";
import { useApplication } from "@/context/Application.context";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger
} from "@/ui/ContextMenu";
import { Operation } from "@/class/Info";
import { SelectFilesBanner } from "./SelectFiles.banner";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/ui/Select";
import { λOperation } from "@/dto";
import { GlyphMap } from "@/dto/Glyph.dto";
import { Icon } from "@impactium/icons";

export namespace OperationBanner {
  export interface Props extends Banner.Props {

  }
}

export function OperationBanner({ ...props }: OperationBanner.Props) {
  const { Info, spawnBanner } = useApplication();
  const [loading, setLoading] = useState<boolean>(false);

  const InitializeNewOperaion = useCallback(() => {
    const handleSubtitleButtonClick = (ev: React.MouseEvent<HTMLButtonElement>) => {
      ev.preventDefault();

      spawnBanner(<CreateOperationBanner />);
    }
    
    return (
      <Button variant='ghost' onClick={handleSubtitleButtonClick}>
        Initialize new operaion
      </Button>
    )
  }, []);

  useEffect(() => {
    if (Info.app.target.operations.length === 0) {
      setLoading(true);
      Info.operation_list().then(() => setLoading(false));
    }
  }, []);

  const DoneButton = useCallback(() => {
    const handleDoneButtonClick = (ev: React.MouseEvent<HTMLButtonElement>) => {
      ev.preventDefault();

      spawnBanner(<SelectFilesBanner />);
    }
    return (
      <Button disabled={!Operation.selected(Info.app)} onClick={handleDoneButtonClick} size='icon' variant='glass' img='Check' />
    )
  }, [loading, Info.app.target.operations]);

  const NoOperations = useCallback(() => {
    return <SelectItem value='X'>There is no operations</SelectItem>
  }, []);

  const Trigger = useCallback(() => {
    const selected = Operation.selected(Info.app);

    if (!selected) {
      return (
        <SelectTrigger>Select operation or create new one</SelectTrigger>
      )
    }

    return (
      <SelectTrigger>
        <Stack>
          <Icon name={GlyphMap.get(selected.glyph_id!) || 'BookDashed'} />
          {selected.name}
        </Stack>
      </SelectTrigger>
    )
  }, [Info.app.target.operations])

  return (
    <Banner title='Choose operation' subtitle={<InitializeNewOperaion />} done={<DoneButton />} {...props}>
      <Select defaultValue={Operation.selected(Info.app)?.name} onValueChange={(name) => Info.operations_select(Info.app.target.operations.find(o => o.name === name)!)}>
        <Trigger />
        <SelectContent>
          {Info.app.target.operations.length ? Info.app.target.operations.map((operation) => (
            <SelectItem value={operation.name}>
              <Icon name={GlyphMap.get(operation.glyph_id!) || 'BookDashed'} />
              {operation.name}
            </SelectItem>
          )) : <NoOperations />}
        </SelectContent>
      </Select>
    </Banner>
  );
}