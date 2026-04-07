"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { env, normalizeBrowserUrl } from "@/lib/config/env";
import type { ApiResponse, MatchEvent, MatchListItem } from "@/types/api-contract";

type StreamMode = "sse" | "polling";
type StreamStatus = "idle" | "connecting" | "live" | "fallback";

interface LiveMessagePayload {
  updatedAt?: string;
  matches?: MatchListItem[];
  events?: MatchEvent[];
  matchId?: string;
}

interface UseLiveStreamOptions {
  enabled?: boolean;
  selectedMatchId?: string;
  onRefetchLive: () => void;
  onRefetchEvents?: () => void;
}

const parsePayload = (value: string): LiveMessagePayload | null => {
  try {
    const parsed = JSON.parse(value) as LiveMessagePayload;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const buildStreamUrl = (selectedMatchId?: string) => {
  const configuredUrl = normalizeBrowserUrl(env.liveSseUrl, false).trim();

  if (!configuredUrl || typeof window === "undefined") {
    return null;
  }

  const streamUrl = new URL(configuredUrl, window.location.origin);
  const liveRoot = streamUrl.pathname.match(/^(.*\/live)(?:\/.*)?$/)?.[1] ?? streamUrl.pathname.replace(/\/+$/, "");

  streamUrl.pathname = selectedMatchId
    ? `${liveRoot}/matches/${encodeURIComponent(selectedMatchId)}/events/stream`
    : `${liveRoot}/events/stream`;
  streamUrl.search = "";
  streamUrl.hash = "";

  return streamUrl.toString();
};

const mergeApiResponse = <T,>(oldData: unknown, nextData: T): ApiResponse<T> => {
  const safeOld = oldData as ApiResponse<T> | undefined;
  return {
    success: true,
    data: nextData,
    meta: safeOld?.meta,
    error: null
  };
};

export function useLiveStream({
  enabled = true,
  selectedMatchId,
  onRefetchLive,
  onRefetchEvents
}: UseLiveStreamOptions) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<StreamMode>(env.liveSseUrl ? "sse" : "polling");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [messageCount, setMessageCount] = useState(0);
  const [sseConnected, setSseConnected] = useState(false);

  const onRefetchLiveRef = useRef(onRefetchLive);
  const onRefetchEventsRef = useRef(onRefetchEvents);
  const lastRefetchAtRef = useRef(0);

  const hasSse = env.liveSseUrl.trim().length > 0;

  useEffect(() => {
    onRefetchLiveRef.current = onRefetchLive;
  }, [onRefetchLive]);

  useEffect(() => {
    onRefetchEventsRef.current = onRefetchEvents;
  }, [onRefetchEvents]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (!hasSse || mode === "polling") {
      const pollingId = window.setInterval(() => {
        onRefetchLiveRef.current();
        onRefetchEventsRef.current?.();
        setLastUpdatedAt(new Date().toISOString());
      }, Math.max(5_000, env.livePollingMs));

      return () => {
        window.clearInterval(pollingId);
      };
    }

    const streamUrl = buildStreamUrl(selectedMatchId);

    if (!streamUrl) {
      setMode("polling");
      return;
    }

    const source = new EventSource(streamUrl);
    const backgroundSyncId = window.setInterval(() => {
      onRefetchLiveRef.current();
      onRefetchEventsRef.current?.();
    }, Math.max(10_000, env.liveSlowPollingMs));

    source.onopen = () => {
      setSseConnected(true);
      setLastUpdatedAt(new Date().toISOString());
    };

    source.onmessage = (event) => {
      setMessageCount((current) => current + 1);
      const now = Date.now();
      const payload = parsePayload(event.data);

      if (payload?.matches && payload.matches.length >= 0) {
        queryClient.setQueriesData(
          { queryKey: ["matches-live"] },
          (old) => mergeApiResponse(old, payload.matches as MatchListItem[])
        );
      }

      const matchId = payload?.matchId ?? selectedMatchId;
      if (payload?.events && matchId) {
        queryClient.setQueriesData(
          { queryKey: ["match-events", matchId] },
          (old) => mergeApiResponse(old, payload.events as MatchEvent[])
        );
      }

      if (!payload?.matches && !payload?.events && now - lastRefetchAtRef.current > 5_000) {
        lastRefetchAtRef.current = now;
        onRefetchLiveRef.current();
        onRefetchEventsRef.current?.();
      }

      setLastUpdatedAt(payload?.updatedAt ?? new Date().toISOString());
    };

    source.onerror = () => {
      source.close();
      window.clearInterval(backgroundSyncId);
      setSseConnected(false);
      setMode("polling");
    };

    return () => {
      source.close();
      window.clearInterval(backgroundSyncId);
    };
  }, [enabled, hasSse, mode, queryClient, selectedMatchId]);

  const status: StreamStatus = !enabled
    ? "idle"
    : !hasSse || mode === "polling"
      ? "fallback"
      : sseConnected
        ? "live"
        : "connecting";

  return useMemo(
    () => ({
      mode,
      status,
      messageCount,
      hasSse,
      lastUpdatedAt
    }),
    [hasSse, lastUpdatedAt, messageCount, mode, status]
  );
}
