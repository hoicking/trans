"use client";

import * as React from "react";
import type { TranslationProject } from "@/lib/types";

const storageKey = "trans.workspace.v1";

export function useProjects() {
  const [projects, setProjects] = React.useState<TranslationProject[]>([]);
  const [activeProjectId, setActiveProjectId] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/projects", { cache: "no-store" });
        if (!response.ok) throw new Error(await response.text());
        const payload = (await response.json()) as { projects: TranslationProject[] };
        if (cancelled) return;
        setProjects(payload.projects);
        setActiveProjectId(payload.projects[0]?.id ?? null);
        window.localStorage.removeItem(storageKey);
      } catch {
        const raw = window.localStorage.getItem(storageKey);
        if (cancelled || !raw) return;
        try {
          const parsed = JSON.parse(raw) as TranslationProject[];
          setProjects(parsed);
          setActiveProjectId(parsed[0]?.id ?? null);
        } catch {
          window.localStorage.removeItem(storageKey);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    projects,
    setProjects,
    activeProjectId,
    setActiveProjectId,
    isLoading
  };
}
