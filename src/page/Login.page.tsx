import { Stack } from "@impactium/components";
import s from './styles/LoginPage.module.css';
import { Auth } from "@/page/Auth.page";

export function LoginPage() {
  return (
    <Stack dir='row' gap={0} className={s.wrapper}>
      <Auth.Page />
    </Stack>
  )
}