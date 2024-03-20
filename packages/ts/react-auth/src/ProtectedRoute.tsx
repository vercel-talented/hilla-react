import { useContext, type JSX } from 'react';
import type { RouteObject } from 'react-router-dom';
import { type IndexRouteObject, Navigate, type NonIndexRouteObject, useLocation } from 'react-router-dom';
import { type AccessProps, AuthContext } from './useAuth.js';

type CustomMetadata = Record<string, any>;

type HandleWithAuth = Readonly<{ handle?: AccessProps & CustomMetadata }>;

type Override<T, E> = E & Omit<T, keyof E>;

type IndexRouteObjectWithAuth = Override<IndexRouteObject, HandleWithAuth>;
type NonIndexRouteObjectWithAuth = Override<
  Override<NonIndexRouteObject, HandleWithAuth>,
  {
    children?: RouteObjectWithAuth[];
  }
>;
export type RouteObjectWithAuth = IndexRouteObjectWithAuth | NonIndexRouteObjectWithAuth;

interface ProtectedRouteProps {
  redirectPath: string;
  access: AccessProps;
  element: JSX.Element;
}

function ProtectedRoute({ redirectPath, access, element }: ProtectedRouteProps): JSX.Element | null {
  const {
    state: { initializing, loading, user },
    hasAccess,
  } = useContext(AuthContext);

  const location = useLocation();

  if (initializing || loading) {
    return <div></div>;
  }

  if (!hasAccess(access)) {
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  return element;
}

function* traverse<T extends RouteObject>(routes: T[]): Generator<T, undefined, undefined> {
  for (const route of routes) {
    yield route;
    if (route.children) {
      yield* traverse(route.children as T[]);
    }
  }
}

/**
 * Adds protection to routes that require authentication.
 * These routes should contain the {@link AccessProps.loginRequired} and/or
 * {@link AccessProps.rolesAllowed} properties.
 *
 * @param routes - the routes to check if any of them needs to be protected
 * @param redirectPath - the path to redirect to if the route is
 * protected and the user is not authenticated.
 * @returns the routes extended with protection if needed
 */
export function protectRoutes(routes: RouteObjectWithAuth[], redirectPath: string = '/login'): RouteObjectWithAuth[] {
  for (const route of traverse(routes)) {
    const { handle } = route;
    const requiresAuth = handle?.loginRequired ?? handle?.requiresLogin ?? handle?.rolesAllowed?.length;

    if (requiresAuth) {
      route.element = (
        <ProtectedRoute
          redirectPath={redirectPath}
          access={handle as AccessProps}
          element={route.element as JSX.Element}
        />
      );
    }
  }

  return routes;
}
