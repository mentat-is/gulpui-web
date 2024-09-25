import { useState } from "react";
import { useApplication } from "@/context/Application.context";
import { Button } from "@/ui/Button";
import s from '../Login.module.css';
import { CreateOperationBanner } from "@/banners/CreateOperationBanner";
import { useLanguage } from "@/context/Language.context";
import { Index } from "@/class/Info";
import { Banner } from "@/ui/Banner";
import { λOperation } from "@/dto";
import { Icon } from "@/ui/Icon";
import { Separator } from "@/ui/Separator";

export function OperationsChooser() {
  const { app, Info, api, spawnBanner } = useApplication();
  const { lang } = useLanguage();
  const [loading, setLoading] = useState<{ [key: number]: boolean }>({});

  const deleteOperation = (operation_id: number) => {
    setLoading(prevLoading => ({ ...prevLoading, [operation_id]: true }));

    api('/operation_delete', {
      method: 'DELETE',
      data: {
        operation_id,
        index: Index.selected(app)
      }
    }).then(() => {
      Info.operations_reload().then(_ => setLoading(loading => ({ ...loading, [operation_id]: false })));
    });
  };

  const spawnBannerToRequestDelete = (operation: λOperation) => {
    spawnBanner(
      <Banner title={`Delete operation -> ${operation.name}`}>
        <Button
          loading={loading[operation.id]}
          onClick={() => deleteOperation(operation.id)}
          variant='destructive'
          img='Trash2'>Yes, delete!</Button>
      </Banner>
    )
  }

  return (
    <div className={s.chooser}>
      <p className={s.cluster}><Icon name='Hexagon' />Choose operation node</p>
      {app.target.operations.map((operation) => (
        <div className={s.unit_group} key={operation.id}>
          <Button onClick={() => Info.operations_select(operation)} img='Workflow'>{operation.name}</Button>
          <Button
            size='icon'
            onClick={() => spawnBannerToRequestDelete(operation)}
            variant='destructive'
            img='Trash2' />
          </div>
      ))}
      <Separator />
      <Button
        variant='outline'
        img='Plus'
        style={{ width: '100%' }}
        onClick={() => spawnBanner(<CreateOperationBanner />)}>{lang.operation.create}</Button>
    </div>
  );
};
