import React from 'react';
import s from './styles/Card.module.css'
import { cn } from './utils';

interface DescriptionOptions {
  text: string;
  button: JSX.Element
}

export interface CardProps {
  description?: string | DescriptionOptions;
  children: any;
  className?: string | string[];
}

export function Card({ description, children, className }: CardProps) {
  return (
    <div className={cn(className, s._)}>
      <div className={s.content}>
        {children}
      </div>
      {description && (
        <div className={s.description}>
          {typeof description === 'string'
            ? <p>{description}</p>
            : (
              <React.Fragment>
                <p>{description.text}</p>
                {description.button}
              </React.Fragment>
            )}
        </div>
      )}
    </div>
  )
}
