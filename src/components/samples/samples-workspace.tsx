"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MonitorX } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SourceBrowser } from "@/components/samples/source-browser";
import {
  SampleList,
  type ListFilter,
  type ListSort,
} from "@/components/samples/sample-list";
import {
  SamplePreview,
  type PreviewHandle,
} from "@/components/samples/sample-preview";
import { FavoritesLibrary } from "@/components/samples/favorites-library";
import {
  copyFileToFavorites,
  ensureDestPath,
  isFsAccessSupported,
  listEntries,
  pickFavoritesRoot,
  pickSourceDirectory,
  verifyPermission,
} from "@/lib/samples/fs-access";
import {
  loadFavoritesRoot,
  loadSourceHandles,
  saveFavoritesRoot,
  saveSourceHandles,
} from "@/lib/samples/handle-store";
import { buildSampleKey, guessSampleType } from "@/lib/samples/sample-key";
import {
  dirKey,
  type DirSelection,
  type LockedDest,
  type SampleVM,
  type SourceRef,
  type StatusMap,
} from "@/lib/samples/types";
import { upsertSampleStatus } from "@/app/actions/samples";
import { useToast } from "@/components/toast";
import type { ReviewStatus, SampleRow } from "@/lib/types";

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

export function SamplesWorkspace({
  initialStatuses,
}: {
  initialStatuses: Record<string, SampleRow>;
}) {
  const { toast } = useToast();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [sources, setSources] = useState<SourceRef[]>([]);
  const [favoritesRoot, setFavoritesRoot] =
    useState<FileSystemDirectoryHandle | null>(null);
  const [activeFolderKey, setActiveFolderKey] = useState<string | null>(null);
  const [samples, setSamples] = useState<SampleVM[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [lockedDest, setLockedDest] = useState<LockedDest | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ListFilter>("all");
  const [sort, setSort] = useState<ListSort>("name");

  const [statuses, setStatuses] = useState<StatusMap>(() => {
    const m: StatusMap = {};
    for (const [key, row] of Object.entries(initialStatuses)) {
      m[key] = row.review_status as ReviewStatus;
    }
    return m;
  });

  const previewRef = useRef<PreviewHandle>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = isFsAccessSupported();
      if (cancelled) return;
      setSupported(ok);
      if (!ok) return;
      const [srcHandles, favRoot] = await Promise.all([
        loadSourceHandles(),
        loadFavoritesRoot(),
      ]);
      if (cancelled) return;
      setSources(srcHandles.map((h) => ({ name: h.name, handle: h })));
      if (favRoot) setFavoritesRoot(favRoot);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = samples;
    if (q) list = list.filter((s) => s.name.toLowerCase().includes(q));
    if (filter !== "all") {
      list = list.filter((s) => {
        const st = statuses[s.key] ?? "not_reviewed";
        return filter === "not_reviewed"
          ? st === "not_reviewed"
          : st !== "not_reviewed";
      });
    }
    const sorted = [...list].sort((a, b) =>
      sort === "type"
        ? a.type.localeCompare(b.type) || a.name.localeCompare(b.name)
        : a.name.localeCompare(b.name),
    );
    return sorted;
  }, [samples, search, filter, sort, statuses]);

  const selectedSample = useMemo(
    () => visible.find((s) => s.key === selectedKey) ?? null,
    [visible, selectedKey],
  );
  const selectedStatus: ReviewStatus = selectedSample
    ? (statuses[selectedSample.key] ?? "not_reviewed")
    : "not_reviewed";

  const addSource = useCallback(async () => {
    try {
      const handle = await pickSourceDirectory();
      setSources((prev) => {
        if (prev.some((s) => s.name === handle.name)) return prev;
        const next = [...prev, { name: handle.name, handle }];
        void saveSourceHandles(next.map((s) => s.handle));
        return next;
      });
    } catch {
      /* user cancelled the picker */
    }
  }, []);

  const pickFavorites = useCallback(async () => {
    try {
      const handle = await pickFavoritesRoot();
      setFavoritesRoot(handle);
      setLockedDest(null);
      void saveFavoritesRoot(handle);
    } catch {
      /* cancelled */
    }
  }, []);

  const selectFolder = useCallback(async (sel: DirSelection) => {
    setActiveFolderKey(dirKey(sel.rootName, sel.segments));
    const { files } = await listEntries(sel.handle);
    const vms: SampleVM[] = files.map((f) => {
      const rel = [...sel.segments, f.name].join("/");
      return {
        key: buildSampleKey(sel.rootName, rel),
        name: f.name,
        relPath: `${sel.rootName}/${rel}`,
        type: guessSampleType(f.name),
        handle: f.handle,
      };
    });
    setSamples(vms);
    setSelectedKey(vms.length ? vms[0].key : null);
  }, []);

  const persistStatus = useCallback(
    async (
      vm: SampleVM,
      status: ReviewStatus,
      favoriteDest: string | null,
    ) => {
      const prev = statuses[vm.key] ?? "not_reviewed";
      setStatuses((m) => ({ ...m, [vm.key]: status }));
      try {
        await upsertSampleStatus({
          sampleKey: vm.key,
          originalPath: vm.relPath,
          originalFileName: vm.name,
          reviewStatus: status,
          favoriteDest,
        });
      } catch (e) {
        setStatuses((m) => ({ ...m, [vm.key]: prev }));
        toast((e as Error).message);
      }
    },
    [statuses, toast],
  );

  const advance = useCallback(() => {
    const idx = visible.findIndex((s) => s.key === selectedKey);
    const next = visible[idx + 1];
    if (next) setSelectedKey(next.key);
  }, [visible, selectedKey]);

  const addToFavorites = useCallback(
    async (vm: SampleVM) => {
      if (!favoritesRoot) {
        toast("Set a Favorites folder first.");
        return;
      }
      if (!lockedDest) {
        toast("Lock a destination folder in the Favorites panel first.");
        return;
      }
      try {
        const granted = await verifyPermission(favoritesRoot, true);
        if (!granted) {
          toast("Permission to write to the Favorites folder was denied.");
          return;
        }
        const destDir = await ensureDestPath(favoritesRoot, lockedDest.segments);
        const res = await copyFileToFavorites(vm.handle, destDir, vm.name);
        if (
          res.duplicate &&
          !confirm(
            `"${vm.name}" already exists in ${lockedDest.label}. Mark as favorited anyway?`,
          )
        ) {
          return;
        }
        await persistStatus(
          vm,
          "added_to_favorites",
          lockedDest.segments.join("/"),
        );
        advance();
      } catch (e) {
        toast((e as Error).message);
      }
    },
    [favoritesRoot, lockedDest, persistStatus, advance, toast],
  );

  const markReviewed = useCallback(
    async (vm: SampleVM) => {
      await persistStatus(vm, "reviewed_not_added", null);
      advance();
    },
    [persistStatus, advance],
  );

  useEffect(() => {
    if (supported !== true) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (isTypingTarget(e.target)) return;
      const idx = visible.findIndex((s) => s.key === selectedKey);
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (visible[idx + 1]) setSelectedKey(visible[idx + 1].key);
          else if (idx < 0 && visible[0]) setSelectedKey(visible[0].key);
          break;
        case "ArrowUp":
          e.preventDefault();
          if (visible[idx - 1]) setSelectedKey(visible[idx - 1].key);
          break;
        case "Enter":
          e.preventDefault();
          previewRef.current?.toggle();
          break;
        case "a":
        case "A":
          if (selectedSample) void addToFavorites(selectedSample);
          break;
        case "s":
        case "S":
          if (selectedSample) void markReviewed(selectedSample);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    supported,
    visible,
    selectedKey,
    selectedSample,
    addToFavorites,
    markReviewed,
  ]);

  if (supported === null) return null;

  if (supported === false) {
    return (
      <Card className="flex flex-col items-center gap-3 p-8 text-center">
        <MonitorX className="h-10 w-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Browser not supported</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          The Samples page reads audio from your filesystem using the File
          System Access API, which is only available in Chromium-based desktop
          browsers (Chrome, Edge, Arc). Please open this page in one of those.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid h-[calc(100vh-14rem)] grid-cols-1 gap-3 lg:grid-cols-[260px_1fr_300px]">
      <Card className="overflow-hidden p-0">
        <SourceBrowser
          sources={sources}
          activeKey={activeFolderKey}
          onAddSource={addSource}
          onSelectFolder={selectFolder}
        />
      </Card>

      <Card className="grid grid-rows-[1fr_auto] overflow-hidden p-0">
        <div className="min-h-0">
          <SampleList
            samples={visible}
            statuses={statuses}
            selectedKey={selectedKey}
            onSelect={(vm) => setSelectedKey(vm.key)}
            search={search}
            onSearchChange={setSearch}
            filter={filter}
            onFilterChange={setFilter}
            sort={sort}
            onSortChange={setSort}
            searchRef={searchRef}
          />
        </div>
        <div className="h-64 border-t border-border">
          <SamplePreview
            ref={previewRef}
            sample={selectedSample}
            status={selectedStatus}
            onAdd={addToFavorites}
            onReject={markReviewed}
          />
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <FavoritesLibrary
          root={favoritesRoot}
          lockedDest={lockedDest}
          onPickRoot={pickFavorites}
          onLock={setLockedDest}
          onUnlock={() => setLockedDest(null)}
        />
      </Card>
    </div>
  );
}
