import React from 'react';
import card from './styles/Card.module.css'
import { cn } from './utils';

interface DescriptionOptions {
  text: string;
  button: JSX.Element
}

export interface Card {
  description?: string | DescriptionOptions;
  children: any;
  className?: string | string[];
}

export function Card({ description, children, className }: Card) {
  return (
    <div className={cn(className, card._)}>
      <div className={card.content}>
        {children}
      </div>
      {description && (
        <div className={card.description}>
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
