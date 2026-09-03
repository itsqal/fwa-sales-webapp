"use client";

import { useCallback, useState } from "react";

export interface ListState {
  page: number;
  perPage: number;
  q: string;
  status?: string;
  setPage: (page: number) => void;
  setPerPage: (perPage: number) => void;
  setQ: (q: string) => void;
  setStatus: (status: string | undefined) => void;
}

/**
 * Page / perPage / search / status for a server-paginated list.
 *
 * Changing what is being filtered returns to page 1 — otherwise a search that
 * narrows twenty pages to one leaves the operator on page 14 looking at an
 * empty table and concluding there are no results.
 */
export function useListState(initialPerPage = 10): ListState {
  const [page, setPage] = useState(1);
  const [perPage, setPerPageValue] = useState(initialPerPage);
  const [q, setQValue] = useState("");
  const [status, setStatusValue] = useState<string | undefined>(undefined);

  const setPerPage = useCallback((value: number) => {
    setPerPageValue(value);
    setPage(1);
  }, []);

  const setQ = useCallback((value: string) => {
    setQValue(value);
    setPage(1);
  }, []);

  const setStatus = useCallback((value: string | undefined) => {
    setStatusValue(value);
    setPage(1);
  }, []);

  return { page, perPage, q, status, setPage, setPerPage, setQ, setStatus };
}
