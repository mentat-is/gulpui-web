import React, { useEffect, useState } from 'react'
import { Header } from './components/header/Header'
import { Body } from './components/body/Body'
import { useApplication } from '@/context/Application.context'
import { SelectContextBanner } from '@/banners/SelectContextBanner';
import { AppSocket } from '@/class/AppSocket';
import { Context, Operation } from '@/class/Info';
import { File } from '@/class/Info';
import { toast } from 'sonner';

export function GulpPage() {
  const { app, spawnBanner, Info, api, setWs } = useApplication();
  const [rendered, setRendered] = useState<number>(0);


  useEffect(() => {
    (async () => {
      if (app.target.operations.some(o => !o.contexts) && !app.target.contexts.length) {
        const ops = await Info.operations_request();

        if (!ops?.length) return toast('No contexts found');

        await Info.operations_update(ops);
      }
    })();
  }, [app.target.operations]);

  useEffect(() => {
    const operation = Operation.selected(app);
    const context = Context.selected(app);
    const files = File.selected(app);

    if (!operation || !context.length || !files.length || app.target.files.length === rendered) return;

    setRendered(File.selected(app).length);

    setWs(new AppSocket(Info, app));

    (async () => {
      Info.events_reset();

      await Info.plugins_reload();
  
      await Info.notes_reload();
  
      await Info.links_reload();
  
      await Info.mapping_file_list();
  
      api<any>('/query_gulp', {
        method: 'POST',
        data: {
          ws_id: app.general.ws_id
        },
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          "flt": {
            "context": [
              ...context.map(c => c.name)
            ],
            "end_msec": app.target.bucket?.selected.max,
            "operation_id": [
              operation.id
            ],
            "start_msec": app.target.bucket?.selected.min
          },
          "options": {
              "search_after_loop": false,
              "sort": {
                "@timestamp": "desc"
              },
              "notes_on_match": false,
              "max_notes": 0,
              "include_query_in_results": false
            }
        })
      });
    })();
  }, [app.target.files, app.target.contexts]);

  useEffect(() => {
    (async () => {
      if (!app.target.bucket.timestamp.max) {
        await Info.fetchBucket();
      }
  
      if (!File.selected(app).length) {
        spawnBanner(<SelectContextBanner />);
      }
    })();
  }, [app.target.bucket, app.target.files]);

  return (
    <React.Fragment>
      <Header />
      <Body />
    </React.Fragment>
  )
};
