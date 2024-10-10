import { Button } from '@/ui/Button';
import s from '../../Gulp.module.css';
import { useApplication } from '@/context/Application.context';

interface ControlsProps {
  scrollX: number;
  setScrollX: React.Dispatch<React.SetStateAction<number>>;
}

export function Controls({ scrollX, setScrollX }: ControlsProps) {
  const { Info, timeline, app } = useApplication();

  const resetScaleAndScroll = () => {
    setScrollX(0);
    Info.setTimelineScale(1)
  }

  const zoom = (out: boolean = false) => {
    const width = Info.width;
    const timelineWidth = timeline.current?.clientWidth || 1
    const newScale = out ? (app.timeline.scale - app.timeline.scale / 4) : (app.timeline.scale + app.timeline.scale / 4)

    const diff = scrollX + timelineWidth / 2;
    const left = Math.round(diff * (newScale * timelineWidth) / width - diff);

    Info.setTimelineScale(newScale);
    setScrollX(scrollX => scrollX + left);
  }

  return (
    <div className={s.controls}>
      <Button onClick={() => zoom(true)} img='ZoomOut'>Zoom Out</Button>
      <Button onClick={resetScaleAndScroll} img='AlignHorizontalSpaceBetween'>Zoom Fit</Button>
      <Button onClick={() => zoom(false)} img='ZoomIn'>Zoom In</Button>
    </div>
  )
}