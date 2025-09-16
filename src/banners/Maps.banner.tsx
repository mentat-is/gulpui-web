import { Banner as UIBanner } from '@/ui/Banner'
import { cn } from '@impactium/utils'
import {
  APIProvider,
  Map as VisMap,
  GoogleMapsContext,
  latLngEquals,
} from '@vis.gl/react-google-maps'
import {
  useState,
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'
import s from './styles/MapsBanner.module.css'
import type { Ref } from 'react'
import { Button } from '@/ui/Button'

export namespace Maps {
  export interface Props {
    ip?: string
    lat: number
    lng: number
  }
  export const Banner = ({ ip, lat, lng }: Maps.Props) => {
    const [fullscreen, setFullscreen] = useState<boolean>(false)

    const ToggleFullscreen = () => {
      return (
        <Button
          variant="glass"
          img={fullscreen ? 'Minimize' : 'Maximize'}
          onClick={() => setFullscreen((v) => !v)}
        />
      )
    }

    return (
      <UIBanner
        title={ip ? `Location of ${ip}` : 'Maps'}
        className={cn(s.banner, fullscreen && s.fullscreen)}
        done={<ToggleFullscreen />}
      >
        <APIProvider apiKey={'AIzaSyDhBmfhciBYS9xUAifZaCQTJu4tVYr16TQ'}>
          <VisMap
            style={{
              width: fullscreen ? '100%' : '600px',
              height: fullscreen ? '100%' : '400px',
            }}
            defaultCenter={{
              lat,
              lng,
            }}
            mapId="739af084373f96fe"
            defaultZoom={8}
            gestureHandling="greedy"
            disableDefaultUI
          >
            <Circle.Element
              center={{ lat, lng }}
              radius={18000}
              fillColor={'#3b82f6 '}
              strokeColor={'#0c4cb3'}
              strokeOpacity={1}
              strokeWeight={3}
              fillOpacity={0.3}
            />
          </VisMap>
        </APIProvider>
      </UIBanner>
    )
  }

  export namespace Circle {
    export interface Events {
      onClick?: (e: google.maps.MapMouseEvent) => void
      onDrag?: (e: google.maps.MapMouseEvent) => void
      onDragStart?: (e: google.maps.MapMouseEvent) => void
      onDragEnd?: (e: google.maps.MapMouseEvent) => void
      onMouseOver?: (e: google.maps.MapMouseEvent) => void
      onMouseOut?: (e: google.maps.MapMouseEvent) => void
      onRadiusChanged?: (r: ReturnType<google.maps.Circle['getRadius']>) => void
      onCenterChanged?: (p: ReturnType<google.maps.Circle['getCenter']>) => void
    }

    export type Props = google.maps.CircleOptions & Circle.Events

    export type Reference = Ref<google.maps.Circle | null>

    function useCircle({
      onClick,
      onDrag,
      onDragStart,
      onDragEnd,
      onMouseOver,
      onMouseOut,
      onRadiusChanged,
      onCenterChanged,
      radius,
      center,
      ...props
    }: Circle.Props) {
      const callbacks = useRef<Record<string, (e: unknown) => void>>({})
      Object.assign(callbacks.current, {
        onClick,
        onDrag,
        onDragStart,
        onDragEnd,
        onMouseOver,
        onMouseOut,
        onRadiusChanged,
        onCenterChanged,
      })

      const circle = useRef(new google.maps.Circle()).current
      circle.setOptions(props)

      useEffect(() => {
        if (!center) return
        if (!latLngEquals(center, circle.getCenter())) circle.setCenter(center)
      }, [center])

      useEffect(() => {
        if (radius === undefined || radius === null) return
        if (radius !== circle.getRadius()) circle.setRadius(radius)
      }, [radius])

      const map = useContext(GoogleMapsContext)?.map

      useEffect(() => {
        if (!map) {
          return
        }

        circle.setMap(map)

        return () => {
          circle.setMap(null)
        }
      }, [map])

      useEffect(() => {
        if (!circle) return

        const gme = google.maps.event
          ;[
            ['click', 'onClick'],
            ['drag', 'onDrag'],
            ['dragstart', 'onDragStart'],
            ['dragend', 'onDragEnd'],
            ['mouseover', 'onMouseOver'],
            ['mouseout', 'onMouseOut'],
          ].forEach(([eventName, eventCallback]) => {
            gme.addListener(circle, eventName, (e: google.maps.MapMouseEvent) => {
              const callback = callbacks.current[eventCallback]
              if (callback) callback(e)
            })
          })
        gme.addListener(circle, 'radius_changed', () => {
          const newRadius = circle.getRadius()
          callbacks.current.onRadiusChanged?.(newRadius)
        })
        gme.addListener(circle, 'center_changed', () => {
          const newCenter = circle.getCenter()
          callbacks.current.onCenterChanged?.(newCenter)
        })

        return () => {
          gme.clearInstanceListeners(circle)
        }
      }, [circle])

      return circle
    }

    export const Element = forwardRef(
      (props: Circle.Props, ref: Circle.Reference) => {
        const circle = useCircle(props)

        useImperativeHandle(ref, () => circle)

        return null
      },
    )

    Element.displayName = 'Element'
  }
}
