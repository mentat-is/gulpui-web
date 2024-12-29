import { useEffect, useRef, useState } from 'react';
import Cookies from 'universal-cookie';
import s from './Login.module.css';
import { useApplication } from '@/context/Application.context';
import { Card } from '@/ui/Card';
import { Index, Pattern } from '@/class/Info';
import { toast } from 'sonner';
import { Login, λOperation } from '@/dto';
import React from 'react';
import { Input } from '@/ui/Input';
import { Separator } from '@/ui/Separator';
import { λIndex } from '@/dto/Index.dto';
import { CreateOperationBanner } from '@/banners/CreateOperation.banner';
import { UploadBanner } from '@/banners/Upload.banner';
import { SelectFilesBanner } from '@/banners/SelectFiles.banner';
import { Logger } from '@/dto/Logger.class';
import { Stack, Button } from '@impactium/components';
import { GeneralSettings } from '@/components/GeneralSettings';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger } from '@/ui/ContextMenu';

export function LoginPage() {
  const { Info, app, spawnBanner } = useApplication();
  const [stage, setStage] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  
  const handleIndexSelection = async (index: λIndex) => {
    setLoading(true);
    Info.index_select(index);
  };
  /** 
   * При выборе индекса фетчим {λOperation[], λContext[], λPlugin[]} и перехоим на третий этап
  */
  useEffect(() => {
    if (!Index.selected(app)) return;
    
    Info.operation_list().then(() => {
      setStage(2) 
      setLoading(false);
    });
  }, [app.target.indexes]);

  return (
    <div className={s.page}>
      <Card className={s.wrapper}>
        <div className={s.logo}>
          <img src='/gulp-geist.svg' alt='' />
          <h1>Gulp</h1>
          <i>Web Client</i>
        </div>
        <div className={s.content}>
        {stage === 0
          ? null
          : stage === 1
            ? (
              <div className={s.chooser}>
                {app.target.indexes.map((index) => 
                  <Button
                    loading={loading}
                    key={index.name}
                    className={s.index_button}
                    onClick={() => handleIndexSelection(index)}
                    img='Workflow'>{index.name}</Button>
                )}
              </div>
              )
            :  stage === 2 
              ? null
              : (
                <>
                  <p>🦆 Quack! You found me! Let's keep it our little secret 😉</p>
                  <div className={s.back}>
                    <Button onClick={() => spawnBanner(<UploadBanner />)} variant='ghost'>Upload files</Button>
                    <Button onClick={() => setStage(2)}>Back to operations</Button>
                  </div>
                </>
              )
        }
        </div>
      </Card>
      <GeneralSettings />
    </div>
  )
}