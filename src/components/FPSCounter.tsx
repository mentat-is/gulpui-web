import { useEffect, useReducer, useRef } from 'react'

type Position = number | `${number}px` | 'auto';

interface FPSCounterProps {
  top?: Position;
  right?: Position;
  left?: Position;
  bottom?: Position;
  height?: number;
  width?: number;
}

export function FPSCounter({
  top = 'auto',
  right = 'auto',
  bottom = 'auto',
  left = 'auto',
  height = 29,
  width = 70
}: FPSCounterProps) {
  const [state, dispatch] = useReducer(
    state => {
      const currentTime = Date.now()
      if (currentTime > state.prevTime + 1000) {
        const nextFPS = [
          ...new Array(
            Math.floor((currentTime - state.prevTime - 1000) / 1000)
          ).fill(0),
          Math.max(
            1,
            Math.round((state.frames * 1000) / (currentTime - state.prevTime))
          )
        ]
        return {
          max: Math.max(state.max, ...nextFPS),
          len: Math.min(state.len + nextFPS.length, width),
          fps: [...state.fps, ...nextFPS].slice(-width),
          frames: 1,
          prevTime: currentTime
        }
      } else {
        return { ...state, frames: state.frames + 1 }
      }
    },
    {
      len: 0,
      max: 0,
      frames: 0,
      prevTime: Date.now(),
      fps: []
    }
  )

  const request = useRef<number>(0);
  const tick = () => {
    dispatch()
    request.current = requestAnimationFrame(tick)
  }

  useEffect(() => {
    request.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(request.current)
  }, [])

  const { fps, max, len } = state

  return (
    <div
      style={{
        zIndex: 20,
        position: 'relative',
        height: 46,
        width: width + 6,
        padding: 3,
        backgroundColor: '#000',
        color: '#00ffff',
        fontSize: '9px',
        lineHeight: '10px',
        fontWeight: 'bold',
        boxSizing: 'border-box',
        pointerEvents: 'none',
        top,
        right,
        bottom,
        left
      }}
    >
      <span>{fps[len - 1]} FPS</span>
      <div
        style={{
          position: 'absolute',
          left: 3,
          right: 3,
          bottom: 3,
          height,
          background: '#282844',
          boxSizing: 'border-box'
        }}
      >
        {fps.map((frame: number, i: number) => (
          <div
            key={`fps-${i}`}
            style={{
              position: 'absolute',
              bottom: 0,
              right: `${len - 1 - i}px`,
              height: `${(height * frame) / max}px`,
              width: 1,
              background: '#00ffff',
              boxSizing: 'border-box'
            }}
          />
        ))}
      </div>
    </div>
  )
}
