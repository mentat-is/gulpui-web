import { useApplication } from "@/context/Application.context";
import { useLanguage } from "@/context/Language.context";
import { Button } from "@/ui/Button";
import { SelectContextBanner } from "@/banners/SelectContextBanner";
import s from '../../Gulp.module.css';

export function Logout() {
  const { lang } = useLanguage();
  const { spawnBanner, logout } = useApplication();

  return (
    <div className={s.logout}>
      <Button variant='outline' img='https://cdn.impactium.fun/ui/table/add.svg' onClick={() => spawnBanner(<SelectContextBanner />)} />
      <Button style={{width: 'min-content', alignSelf: 'center', justifySelf: 'self-end'}} variant='outline' img='https://cdn.impactium.fun/ui/action/exit.svg' onClick={logout}>{lang.logout}</Button>
    </div>
  )
}