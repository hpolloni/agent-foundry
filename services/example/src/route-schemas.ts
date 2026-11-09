import type { RouteOptions } from 'fastify';

const METHODS_WITH_BODY: ReadonlySet<string> = new Set(['POST', 'PUT', 'PATCH']);

function isNonEmptyObject(value: unknown): boolean {
  return typeof value === 'object' && value !== null && Object.keys(value).length > 0;
}

/** Return the first required schema that the route does not define, or undefined. */
function missingSchema(route: RouteOptions): string | undefined {
  const methods = Array.isArray(route.method) ? route.method : [route.method];
  // Every route must declare its response shape, so responses never leak unvalidated data.
  if (!isNonEmptyObject(route.schema?.response)) return 'response';
  if (route.url.includes(':') && route.schema?.params === undefined) return 'params';
  if (methods.some((method) => METHODS_WITH_BODY.has(method)) && route.schema?.body === undefined) {
    return 'body';
  }
  return undefined;
}

/**
 * `onRoute` hook. Throws when a route does not define the Zod schemas that the project requires:
 * `response` always, `params` for a path with parameters, and `body` for POST, PUT, and PATCH.
 */
export function assertRouteSchemas(route: RouteOptions): void {
  const missing = missingSchema(route);
  if (missing !== undefined) {
    throw new Error(`Route ${String(route.method)} ${route.url} has no ${missing} schema`);
  }
}
