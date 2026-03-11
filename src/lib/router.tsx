"use client";

import Link from "next/link.js";
import { useParams as useNextParams, usePathname, useRouter, useSearchParams as useNextSearchParams } from "next/navigation.js";
import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  type AnchorHTMLAttributes,
  type PropsWithChildren,
  type ReactNode,
} from "react";

type NavigateOptions = {
  replace?: boolean;
  state?: Record<string, unknown>;
};

type SetSearchParamsOptions = {
  replace?: boolean;
};

type LocationLike = {
  pathname: string;
  search: string;
  hash: string;
  state: null;
};

const RouteParamsContext = createContext<Record<string, string | undefined> | null>(null);
const OutletContext = createContext<ReactNode | null>(null);

const appendStateToHref = (target: string, state?: Record<string, unknown>) => {
  if (!state || typeof state.from !== "string" || state.from.length === 0) {
    return target;
  }

  const url = new URL(target, "http://localhost");
  if (!url.searchParams.has("from")) {
    url.searchParams.set("from", state.from);
  }

  return `${url.pathname}${url.search}${url.hash}`;
};

export const RouteParamsProvider = ({
  params,
  children,
}: PropsWithChildren<{ params: Record<string, string | undefined> }>) => {
  return <RouteParamsContext.Provider value={params}>{children}</RouteParamsContext.Provider>;
};

export const OutletProvider = ({
  children,
  outlet,
}: PropsWithChildren<{ outlet?: ReactNode }>) => {
  return <OutletContext.Provider value={outlet ?? null}>{children}</OutletContext.Provider>;
};

export const useLocation = (): LocationLike => {
  const pathname = usePathname() ?? "/";
  const searchParams = useNextSearchParams();
  const search = searchParams.toString();
  const hash = typeof window !== "undefined" ? window.location.hash : "";

  return {
    pathname,
    search: search ? `?${search}` : "",
    hash,
    state: null,
  };
};

export const useNavigate = () => {
  const router = useRouter();

  return useCallback(
    (target: string | number, options?: NavigateOptions) => {
      if (typeof target === "number") {
        window.history.go(target);
        return;
      }

      const href = appendStateToHref(target, options?.state);
      startTransition(() => {
        if (options?.replace) {
          router.replace(href);
        } else {
          router.push(href);
        }
      });
    },
    [router]
  );
};

export const useParams = <T extends Record<string, string | undefined>>() => {
  const overrideParams = useContext(RouteParamsContext);
  const nextParams = useNextParams<Record<string, string | string[]>>();

  if (overrideParams) {
    return overrideParams as T;
  }

  const normalized = Object.fromEntries(
    Object.entries(nextParams).map(([key, value]) => [key, Array.isArray(value) ? value.at(-1) : value])
  );

  return normalized as T;
};

export const useSearchParams = (): [
  URLSearchParams,
  (nextParams: URLSearchParams | string[][] | Record<string, string> | string, options?: SetSearchParamsOptions) => void,
] => {
  const pathname = usePathname() ?? "/";
  const current = useNextSearchParams();
  const router = useRouter();
  const snapshot = new URLSearchParams(current.toString());

  const setSearchParams = useCallback(
    (
      nextParams: URLSearchParams | string[][] | Record<string, string> | string,
      options?: SetSearchParamsOptions
    ) => {
      const params = new URLSearchParams(nextParams);
      const href = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      startTransition(() => {
        if (options?.replace) {
          router.replace(href);
        } else {
          router.push(href);
        }
      });
    },
    [pathname, router]
  );

  return [snapshot, setSearchParams];
};

export const Navigate = ({ to, replace, state }: { to: string; replace?: boolean; state?: Record<string, unknown> }) => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(to, { replace, state });
  }, [navigate, replace, state, to]);

  return null;
};

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  to: string;
  replace?: boolean;
  state?: Record<string, unknown>;
};

export const RouterLink = ({ to, replace, state, ...props }: LinkProps) => {
  return <Link href={appendStateToHref(to, state)} replace={replace} {...props} />;
};

export const LinkShim = RouterLink;
export const NavLink = RouterLink;

export const LinkComponent = LinkShim;

export const Outlet = () => {
  return <>{useContext(OutletContext)}</>;
};

export {
  LinkComponent as Link,
};
