import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

const lerp = (a: number, b: number, n: number): number => (1 - n) * a + n * b;

const getMousePos = (e: MouseEvent, container: HTMLDivElement) => {
  if (container) {
    const bounds = container.getBoundingClientRect();
    return {
      x: e.clientX - bounds.left,
      y: e.clientY - bounds.top,
    };
  }
  return { x: e.clientX, y: e.clientY };
};

namespace Crosshair {
  export interface Props {
    containerRef: React.RefObject<HTMLDivElement>;
  }
}

const Crosshair = ({ containerRef }: Crosshair.Props) => {
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const lineHorizontalRef = useRef<HTMLDivElement | null>(null);
  const lineVerticalRef = useRef<HTMLDivElement | null>(null);
  const filterXRef = useRef<SVGFETurbulenceElement | null>(null);
  const filterYRef = useRef<SVGFETurbulenceElement | null>(null);

  let mouse = { x: 0, y: 0 };

  // TODO: Исправить типизацию
  useEffect(() => {
    const handleMouseMove = (ev: any) => {
      mouse = getMousePos(ev, containerRef.current!);

      if (containerRef?.current) {
        const bounds = containerRef.current.getBoundingClientRect();
        if (
          ev.clientX < bounds.left ||
          ev.clientX > bounds.right ||
          ev.clientY < bounds.top ||
          ev.clientY > bounds.bottom
        ) {
          gsap.to([lineHorizontalRef.current, lineVerticalRef.current], { opacity: 0 });
        } else {
          gsap.to([lineHorizontalRef.current, lineVerticalRef.current], { opacity: 1 });
        }
      }
    };

    const target = containerRef?.current || window;
    target.addEventListener('mousemove', handleMouseMove);

    const renderedStyles = {
      tx: { previous: 0, current: 0, amt: 0.15 },
      ty: { previous: 0, current: 0, amt: 0.15 },
    };

    gsap.set([lineHorizontalRef.current, lineVerticalRef.current], { opacity: 0 });

    const onMouseMove = () => {
      renderedStyles.tx.previous = renderedStyles.tx.current = mouse.x;
      renderedStyles.ty.previous = renderedStyles.ty.current = mouse.y;

      gsap.to([lineHorizontalRef.current, lineVerticalRef.current], {
        duration: 0.3,
        ease: 'Power3.easeOut',
        opacity: 1,
      });

      requestAnimationFrame(render);

      target.removeEventListener('mousemove', onMouseMove);
    };

    target.addEventListener('mousemove', onMouseMove);

    const primitiveValues = { turbulence: 0 };

    const tl = gsap.timeline({
      paused: true,
      onStart: () => {
        lineHorizontalRef.current!.style.filter = `url(#filter-noise-x)`;
        lineVerticalRef.current!.style.filter = `url(#filter-noise-y)`;
      },
      onUpdate: () => {
        if (filterXRef.current && filterYRef.current) {
          filterXRef.current.setAttribute('baseFrequency', primitiveValues.turbulence.toString());
          filterYRef.current.setAttribute('baseFrequency', primitiveValues.turbulence.toString());
        }
      },
      onComplete: () => {
        if (lineHorizontalRef.current && lineVerticalRef.current) {
          lineHorizontalRef.current.style.filter = lineVerticalRef.current.style.filter = 'none';
        }
      },
    }).to(primitiveValues, {
      duration: 0.5,
      ease: 'power1',
      startAt: { turbulence: 1 },
      turbulence: 0,
    });

    const enter = () => tl.restart();
    const leave = () => tl.progress(1).kill();

    const render = () => {
      renderedStyles.tx.current = mouse.x;
      renderedStyles.ty.current = mouse.y;

      for (const key in renderedStyles) {
        renderedStyles[key as keyof typeof renderedStyles].previous = lerp(
          renderedStyles[key as keyof typeof renderedStyles].previous,
          renderedStyles[key as keyof typeof renderedStyles].current,
          renderedStyles[key as keyof typeof renderedStyles].amt
        );
      }

      if (lineHorizontalRef.current && lineVerticalRef.current) {
        gsap.set(lineVerticalRef.current, { x: renderedStyles.tx.previous });
        gsap.set(lineHorizontalRef.current, { y: renderedStyles.ty.previous });
      }

      requestAnimationFrame(render);
    };

    const links = containerRef?.current
      ? containerRef.current.querySelectorAll<HTMLAnchorElement>('a')
      : document.querySelectorAll<HTMLAnchorElement>('a');

    links.forEach((link) => {
      link.addEventListener('mouseenter', enter);
      link.addEventListener('mouseleave', leave);
    });

    return () => {
      target.removeEventListener('mousemove', handleMouseMove);
      target.removeEventListener('mousemove', onMouseMove);
      links.forEach((link) => {
        link.removeEventListener('mouseenter', enter);
        link.removeEventListener('mouseleave', leave);
      });
    };
  }, [containerRef]);

  return (
    <div
      ref={cursorRef}
      className="cursor"
      style={{
        position: containerRef ? 'absolute' : 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 4,
      }}
    >
      <svg style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }}>
        <defs>
          <filter id="filter-noise-x">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.000001"
              numOctaves={1}
              ref={filterXRef}
            />
            <feDisplacementMap in="SourceGraphic" scale={40} />
          </filter>
          <filter id="filter-noise-y">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.000001"
              numOctaves={1}
              ref={filterYRef}
            />
            <feDisplacementMap in="SourceGraphic" scale={40} />
          </filter>
        </defs>
      </svg>
      <div
        ref={lineHorizontalRef}
        style={{
          position: 'absolute',
          width: '100%',
          height: '1px',
          background: 'white',
          pointerEvents: 'none',
          transform: 'translateY(50%)',
          opacity: 0,
        }}
      ></div>
      <div
        ref={lineVerticalRef}
        style={{
          position: 'absolute',
          height: '100%',
          width: '1px',
          background: 'white',
          pointerEvents: 'none',
          transform: 'translateX(50%)',
          opacity: 0,
        }}
      ></div>
    </div>
  );
};

export default Crosshair;
