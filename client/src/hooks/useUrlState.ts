/**
 * useUrlState — Syncs category/search state to URL query params.
 *
 * Why: Without this, selecting "Technology" then pressing F5 loses the filter.
 * With this: the URL becomes /?cat=technology&q=climate, so the state survives
 * refresh, browser history, and sharing.
 *
 * Zero dependencies beyond wouter. No network calls.
 */
import { useCallback, useMemo } from "react";
import { useLocation } from "wouter";

export interface UrlState {
  categoryId: string | null;
  categorySlug: string | null;
  search: string;
  region: string | null;
}

function parseUrlState(): UrlState {
  if (typeof window === "undefined") {
    return { categoryId: null, categorySlug: null, search: "" };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    categoryId:   params.get("cat") || null,
    categorySlug: params.get("slug") || null,
    search:       params.get("q") || "",
    region:       params.get("region") || null,
  };
}

function buildSearch(state: UrlState): string {
  const params = new URLSearchParams();
  if (state.categoryId)   params.set("cat", state.categoryId);
  if (state.categorySlug) params.set("slug", state.categorySlug);
  if (state.search)       params.set("q", state.search);
  if (state.region)       params.set("region", state.region);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function useUrlState() {
  const [location, setLocation] = useLocation();

  const state = useMemo(() => parseUrlState(), [location]);

  const setState = useCallback(
    (updater: Partial<UrlState>) => {
      const current = parseUrlState();
      const next: UrlState = { ...current, ...updater };
      // Build the new URL: keep the base path, replace query string
      const basePath = window.location.pathname;
      const qs = buildSearch(next);
      setLocation(basePath + qs, { replace: false });
    },
    [setLocation]
  );

  const setCategoryId = useCallback(
    (id: string | null, slug?: string | null) => {
      setState({ categoryId: id, categorySlug: slug ?? null, search: "" });
    },
    [setState]
  );

  const setSearch = useCallback(
    (q: string) => {
      setState({ search: q, categoryId: null, categorySlug: null });
    },
    [setState]
  );

  const setRegion = useCallback(
    (region: string | null) => {
      setState({ region });
    },
    [setState]
  );

  const clear = useCallback(() => {
    setState({ categoryId: null, categorySlug: null, search: "", region: null });
  }, [setState]);

  return {
    categoryId:   state.categoryId,
    categorySlug: state.categorySlug,
    search:       state.search,
    region:       state.region,
    setCategoryId,
    setSearch,
    setRegion,
    clear,
  };
}
