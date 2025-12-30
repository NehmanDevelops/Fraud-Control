
/// <reference types="react" />
/// <reference types="react-dom" />

// Fix for Recharts + React 18 type incompatibility
// See: https://github.com/recharts/recharts/issues/3615
import type { ReactNode } from 'react';

declare module 'recharts' {
  export interface ResponsiveContainerProps {
    children: ReactNode;
  }
  export interface AreaChartProps {
    children: ReactNode;
  }
  export interface LineChartProps {
    children: ReactNode;
  }
  export interface PieChartProps {
    children: ReactNode;
  }
  export interface BarChartProps {
    children: ReactNode;
  }
  export interface PieProps {
    children: ReactNode;
  }
}

declare namespace NodeJS {
  interface Process{
    env: ProcessEnv
  }
  interface ProcessEnv {
    /**
     * By default, there are two modes in Vite:
     * 
     * * `development` is used by vite and vite serve
     * * `production` is used by vite build
     * 
     * You can overwrite the default mode used for a command by passing the --mode option flag.
     * 
     */
    readonly NODE_ENV: 'development' | 'production'
  }
}

declare var process: NodeJS.Process

declare module '*.gif' {
  const src: string
  export default src
}

declare module '*.jpg' {
  const src: string
  export default src
}

declare module '*.jpeg' {
  const src: string
  export default src
}

declare module '*.png' {
  const src: string
  export default src
}

declare module '*.webp' {
    const src: string
    export default src
}

declare module '*.svg' {
  import * as React from 'react'

  export const ReactComponent: React.FunctionComponent<React.SVGProps<
    SVGSVGElement
  > & { title?: string }>

  const src: string;
  export default src
}

declare module '*.module.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}

declare module '*.module.scss' {
  const classes: { readonly [key: string]: string }
  export default classes
}

declare module '*.module.sass' {
  const classes: { readonly [key: string]: string }
  export default classes
}
