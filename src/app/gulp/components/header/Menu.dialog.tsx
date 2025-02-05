import { Button, Stack } from '@impactium/components';
import s from '../../Gulp.module.css';
import { UploadBanner } from '@/banners/Upload.banner';
import { useApplication } from '@/context/Application.context';
import { SelectFiles } from '@/banners/SelectFiles.banner';
import { LimitsBanner } from '@/banners/Limits.banner';
import { UploadSigmaRuleBanner } from '@/banners/UploadSigmaRule.banner';
import { QueryExternal } from '@/banners/QueryExternal.banner';
import { StorylineBanner } from '../Storyline';
import { OperationBanner } from '@/banners/Operation.banner';
import { useWindows } from '@/ui/Windows';
import { Enrichment } from '@/banners/Enrichment.banner';
import { Permissions } from '@/banners/Permissions.banner';
// @ts-ignore
import C2S from 'canvas2svg';
import { toast } from 'sonner';
import { Logger } from '@/dto/Logger.class';

export function Menu() {
  const { spawnBanner, destroyDialog } = useApplication();
  const { setWindows } = useWindows();

  const backToOperations = () => {
    destroyDialog();
    setWindows([]);
    spawnBanner(<OperationBanner />);
  }

  const enrichment = () => {
    spawnBanner(<Enrichment.Banner />)
  }

  const exportCanvasAsSvg = () => {
    try {
      const canvas = document.getElementById('canvas') as HTMLCanvasElement;
      if (!canvas) {
        console.log('dsa')
        return;
      }
  
      const { width, height } = canvas;
  
      const ctx = new C2S(width, height)
  
      // @ts-ignore
      window.__UNSUPORTED_FORCE_RENDER_OF_CANVAS__DONT_USE_IT_OR_YOU_WILL_BE_FIRED____λuthor_ℳark(true, ctx);
  
      const svg = ctx.getSerializedSvg(true);
  
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = 'gulp_canvas.svg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      Logger.error(e);
      toast('Out of memory', {
        description: 'This feature requires minimum 64GB of RAM'
      });
    }
  }

  return (
    <Stack title='Menu' className={s.menu} dir='column' ai='flex-start' gap={12}>
      <Button variant='secondary' title='Upload files' img='Upload' onClick={() => spawnBanner(<UploadBanner />)} />
      <Button variant='secondary' title='Query external source' img='ServerCrash' onClick={() => spawnBanner(<QueryExternal.Banner />)} />
      <Button variant='secondary' title='Upload sigma rule' img='Sigma' onClick={() => spawnBanner(<UploadSigmaRuleBanner />)} />
      <Button variant='secondary' title='Select files and contexts' img='FileStack' onClick={() => spawnBanner(<SelectFiles.Banner />)} />
      <Button variant='secondary' title='Open storyline' img='Scroll' onClick={() => spawnBanner(<StorylineBanner />)} />
      <Button variant='secondary' title='Change workflow frame' img='AlignHorizontalSpaceAround' onClick={() => spawnBanner(<LimitsBanner />)} />
      <Button variant='secondary' title='Export canvas' img='ImageDown' onClick={exportCanvasAsSvg} />
      <Button variant='secondary' title='Data enrichment' img='PrismColor' onClick={enrichment} />
      <Stack flex />
      {<Button variant='secondary' title='Manage Permissions' img='UserSettings' onClick={() => spawnBanner(<Permissions.Banner />)} />}
      <Button variant='secondary' title='Back to operations' img='Undo2' onClick={backToOperations} />
      <Button variant='secondary' img='LogOut' title='Logout' onClick={window.location.reload} />
    </Stack>
  )
}
