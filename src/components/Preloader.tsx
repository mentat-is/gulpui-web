import { Spinner, Stack } from '@impactium/components'
import s from './styles/Preloader.module.css'
import { Shimmer } from '@/ui/Shimmer'

export function Preloader() {
  return (
    <Stack className={s.main} ai='center' jc='center' dir='column' gap={24}>
      <img src='/gulp-solar.svg' style={{ marginBottom: '5%' }} />
      <Stack dir='column' gap={12} style={{ marginBottom: '1%' }}>
        <Shimmer duration={2} as='h1' color='var(--gray-800)'>[ gULP ]</Shimmer>
        <Shimmer color='var(--gray-500)'>generic universal log processor</Shimmer>
      </Stack>
      <Spinner color='var(--text-white)' size={32} />
    </Stack>
  )
}
