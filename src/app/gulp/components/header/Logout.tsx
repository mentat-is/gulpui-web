import { useApplication } from "@/context/Application.context";
import { useLanguage } from "@/context/Language.context";
import { Button } from "@/ui/Button";
import { SelectContextBanner } from "@/banners/SelectContextBanner";
import s from '../../Gulp.module.css';
import { icons } from "lucide-react";
import { PluginsViewerBanner } from "@/banners/PluginsViewerBanner";

export function Logout() {
  const { lang } = useLanguage();
  const { spawnBanner, logout } = useApplication();

  return (
    <div className={s.logout}>
      <Button variant='outline' img='Blocks' onClick={() => spawnBanner(<PluginsViewerBanner />)} />
      <Button variant='outline' img='Wrench' onClick={() => spawnBanner(<SelectContextBanner />)} />
      <Button style={{width: 'min-content', alignSelf: 'center', justifySelf: 'self-end'}} variant='outline' img='LogOut' onClick={logout}>{lang.logout}</Button>
    </div>
  )
}
