import Cookies from "universal-cookie";
import { useApplication } from "@/context/Application.context";
import { useLanguage } from "@/context/Language.context";
import { BaseInfo } from "@/dto";
import { Button } from "@/ui/Button";
import { parseTokensFromCookies, ui } from "@/ui/utils";
import { SelectContextBanner } from "@/banners/SelectContextBanner";
import s from '../../Gulp.module.css';
import { IngestBanner } from "@/banners/IngestBanner";

export function Logout() {
  const { lang } = useLanguage();
  const { spawnBanner, logout } = useApplication();

  return (
    <div className={s.logout}>
      <Button variant='ghost' img={ui('action/upload')} onClick={() => spawnBanner(<IngestBanner />)}>Upload</Button>
      <Button variant='outline' img='https://cdn.impactium.fun/ui/table/add.svg' onClick={() => spawnBanner(<SelectContextBanner />)} />
      <Button style={{width: 'min-content', alignSelf: 'center', justifySelf: 'self-end'}} variant='outline' img='https://cdn.impactium.fun/ui/action/exit.svg' onClick={logout}>{lang.logout}</Button>
    </div>
  )
}