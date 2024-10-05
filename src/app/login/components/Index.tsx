import { useApplication } from "@/context/Application.context";
import { Button } from "@/ui/Button";
import s from '../Login.module.css';
import {  useState } from "react";
import { λIndex } from "@/dto/Index.dto";
import { Icon } from "@/ui/Icon";

export function IndexesChooser() {
  const { app, Info } = useApplication();
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const awaitResponse = (index: λIndex) => setLoading(prevLoading => ({ ...prevLoading, [index.name]: true }));

  const handle = (index: λIndex) => {
    awaitResponse(index);
    Info.index_select(index);
    setLoading({})
  }

  return (
    <div className={s.chooser}>
      <p className={s.cluster}><Icon name='Combine' />Choose database index</p>
      {app.target.indexes.map((index) => {
        return (
          <Button
            loading={loading[index.name]}
            key={index.name}
            className={s.index_button}
            onClick={() => handle(index)}
            img='Workflow'>{index.name}</Button>
        )
      })}
    </div>
  );
};  
