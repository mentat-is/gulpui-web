import { useApplication } from '@/context/Application.context'
import s from './styles/NotesWindow.module.css'
import { Banner } from '@/ui/Banner'
import { λNote } from '@/dto/Dataset'
import { Table } from './Table'

interface FloatingWindowProps {
  onClose: () => void
  focus: (note: λNote) => void
}

export function NotesWindow({ onClose }: FloatingWindowProps) {
  const { app } = useApplication()

  return (
    <Banner title="Notes" onClose={onClose} className={s.main}>
      <Table values={app.target.notes} />
    </Banner>
  )
}
