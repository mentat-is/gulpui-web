import { useState } from "react";
import { useApplication } from "@/context/Application.context";
import { Button } from "@/ui/Button";
import s from '../Login.module.css';
import { CreateOperationBanner } from "@/banners/CreateOperationBanner";
import { useLanguage } from "@/context/Language.context";
import { Index } from "@/class/Info";
import { Banner } from "@/ui/Banner";
import { λOperation } from "@/dto";

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
          img='https://cdn.impactium.fun/ui/trash/full.svg'>Yes, delete!</Button>
      </Banner>
    )
  }

  return (
    <div className={s.chooser}>
      <p className={s.cluster}><img src='https://cdn.impactium.fun/ui/specific/node.svg' />Choose operation node</p>
      {app.target.operations.map((operation) => (
        <div className={s.unit_group} key={operation.id}>
          <Button onClick={() => Info.operations_select(operation)} img='https://cdn.impactium.fun/ui/dummy/circle-small.svg'>{operation.name}</Button>
          <Button
            size='icon'
            onClick={() => spawnBannerToRequestDelete(operation)}
            variant='destructive'
            img='https://cdn.impactium.fun/ui/trash/full.svg' />
          </div>
      ))}
      <Button
        variant='outline'
        img='https://cdn.impactium.fun/ui/action/add-plus.svg'
        onClick={() => spawnBanner(<CreateOperationBanner />)}>{lang.operation.create}</Button>
    </div>
  );
};
