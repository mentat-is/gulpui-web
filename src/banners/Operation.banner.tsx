import { Banner } from "@/ui/Banner";
import { Button, Stack } from "@impactium/components";
import React, { useCallback, useEffect, useState } from "react";
import { CreateOperationBanner } from "./CreateOperation.banner";
import { useApplication } from "@/context/Application.context";
import { Operation } from "@/class/Info";
import { SelectFilesBanner } from "./SelectFiles.banner";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/ui/Select";
import { Icon } from "@impactium/icons";
import { Glyph } from "@/ui/Glyph";
import { λOperation } from "@/dto";
import { go } from "@/ui/utils";

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
    go(() => go(() => {
      setLoading(true);
      Info.sync().then(() => setLoading(false));
    }));
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

    return (
      <SelectTrigger>
        <Stack>
          <Icon name={Operation.icon((selected || {}) as λOperation)} />
          <p>{selected ? selected.name : 'Select operation or create new one'}</p>
        </Stack>
      </SelectTrigger>
    )
  }, [Info.app.target.operations])

  return (
    <Banner title='Choose operation' subtitle={<InitializeNewOperaion />} done={<DoneButton />} {...props}>
      <Select defaultValue={Operation.selected(Info.app)?.id} onValueChange={(id) => Info.operations_select(Info.app.target.operations.find(o => o.id === id)!)}>
        <Trigger />
        <SelectContent>
          {Info.app.target.operations.length ? Info.app.target.operations.map((operation) => (
            <SelectItem value={operation.id}>
              <Icon name={Operation.icon(operation)} />
              {operation.name}
            </SelectItem>
          )) : <NoOperations />}
        </SelectContent>
      </Select>
    </Banner>
  );
}