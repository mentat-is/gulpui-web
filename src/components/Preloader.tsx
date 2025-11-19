import { Stack } from '@/ui/Stack'
import s from './styles/Preloader.module.css'
import { Shimmer } from '@/ui/Shimmer'
import { Spinner } from '@/ui/Spinner'
import { Logo } from './Logo'

export function Preloader() {
  return (
    <Stack className={s.main} ai='center' jc='center' dir='column' gap={24}>
      <Logo style={{ marginBottom: '7.6%' }} />
      <Stack dir='column' gap={12} style={{ marginBottom: '1%' }}>
        <Shimmer duration={2} as='h1' color='var(--gray-800)'>[ gULP ]</Shimmer>
        <Shimmer color='var(--gray-500)'>generic universal log processor</Shimmer>
      </Stack>
      <Spinner color='var(--accent)' size={32} />
    </Stack>
  )
}
