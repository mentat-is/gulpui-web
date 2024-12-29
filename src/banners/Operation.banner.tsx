import { Banner } from "@/ui/Banner";
import { Button } from "@impactium/components";
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

  useEffect(() => {
    const selectedOperation = Operation.selected(Info.app);

    if (selectedOperation) {
      spawnBanner(<SelectFilesBanner />);
    }
  }, [Info.app.target.operations]);

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
    return <p style={{ fontSize: 12, color: 'var(--text-dimmed)', width: '100%', textAlign: 'center' }}>No operations on database. <code style={{ fontFamily: 'var(--font-mono)'}}>Click upper to create!</code></p>
  }, []);

  return (
    <Banner title='Choose operation' subtitle={<InitializeNewOperaion />} done={<DoneButton />} {...props}>
      {Info.app.target.operations.length ? Info.app.target.operations.map((operation, i) => (
        <ContextMenu>
          <ContextMenuTrigger style={{ width: '100%' }}>
            <Button tabIndex={i * 1} onClick={() => Info.operations_select(operation)} img={'ScanSearch'}>{operation.name}</Button>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuSub>
              <ContextMenuSubTrigger img='Trash2'>Delete!</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem onClick={() => Info.deleteOperation(operation, setLoading)} img='Trash2'>Yes, delete operation {operation.name}!</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuContent>
        </ContextMenu>
      )) : <NoOperations />}
    </Banner>
  );
}