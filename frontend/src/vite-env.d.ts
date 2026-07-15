// src/vite-env.d.ts (or create src/pages.d.ts)
declare module '~react-pages' {
  import type { RouteObject } from 'react-router';
  const routes: RouteObject[];
  export default routes;
}