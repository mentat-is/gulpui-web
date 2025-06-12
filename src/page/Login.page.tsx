import Matrix from "@/components/Matrix";
import { Stack } from "@impactium/components";
import s from './styles/LoginPage.module.css';
import { Auth } from "@/page/Auth.page";

export function LoginPage() {
  return (
    <Stack dir='row' gap={0} className={s.wrapper}>
      <Matrix
        glitchColors={['#2b4539', '#00ff00', '#008000']}
        glitchSpeed={50}
        centerVignette={true}
        outerVignette={true}
        smooth={true} />
      <Auth.Page />
    </Stack>
  )
}