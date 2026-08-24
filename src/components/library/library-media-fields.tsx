"use client";

import * as React from "react";
import { ImageIcon, Loader2, Music, X } from "lucide-react";
import { useToast } from "@/components/toast";
import { prepareImageUpload } from "@/lib/image-downscale";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import {
  ARTWORK_ACCEPT,
  LIBRARY_ARTWORK_BUCKET,
  LIBRARY_PREVIEW_BUCKET,
  PREVIEW_ACCEPT,
  libraryObjectKey,
} from "@/lib/library-storage";
import { cn } from "@/lib/utils";

export type LibraryMedia = {
  /** Object key in the private previews bucket. */
  previewPath: string | null;
  /** Public URL in the artwork bucket. */
  artworkUrl: string | null;
};

/**
 * The preview-audio and artwork pair shared by both capture forms.
 *
 * Uploads go straight from the browser to Supabase Storage — the same path
 * `audio-version-list.tsx` uses for track bounces — and only the resulting
 * key/URL is handed to the server action. Keeping large files out of the
 * server action avoids the request body limit entirely.
 */
export function LibraryMediaFields({
  folder,
  value,
  onChange,
  /** Collections have artwork but nothing to audition. */
  showPreview = true,
  /**
   * Reported so the parent form can disable its submit button. Saving while an
   * upload is still in flight would persist the old (or null) media value and
   * leave the finished upload behind as an unreferenced object.
   */
  onUploadingChange,
}: {
  folder: string;
  value: LibraryMedia;
  onChange: (next: LibraryMedia) => void;
  showPreview?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  // A count rather than a flag per field, so two uploads finishing in either
  // order can't clear the parent's gate while one is still running.
  const [inFlight, setInFlight] = React.useState(0);
  const onUpload = React.useCallback(
    (uploading: boolean) => setInFlight((n) => n + (uploading ? 1 : -1)),
    [],
  );

  React.useEffect(() => {
    onUploadingChange?.(inFlight > 0);
  }, [inFlight, onUploadingChange]);

  return (
    <div className={cn("grid gap-3", showPreview && "sm:grid-cols-2")}>
      {showPreview && (
        <UploadField
          label="Preview audio"
          hint="A short loop you can audition."
          icon={Music}
          accept={PREVIEW_ACCEPT}
          bucket={LIBRARY_PREVIEW_BUCKET}
          folder={folder}
          filled={Boolean(value.previewPath)}
          filledLabel={value.previewPath?.split("/").pop() ?? ""}
          onUploaded={(key) => onChange({ ...value, previewPath: key })}
          onClear={() => onChange({ ...value, previewPath: null })}
          onBusyChange={onUpload}
        />
      )}
      <UploadField
        label="Artwork"
        hint="Optional — a waveform is drawn if you skip it."
        icon={ImageIcon}
        accept={ARTWORK_ACCEPT}
        bucket={LIBRARY_ARTWORK_BUCKET}
        folder={folder}
        publicUrl
        filled={Boolean(value.artworkUrl)}
        filledLabel={value.artworkUrl?.split("/").pop() ?? ""}
        onUploaded={(url) => onChange({ ...value, artworkUrl: url })}
        onClear={() => onChange({ ...value, artworkUrl: null })}
        onBusyChange={onUpload}
      />
    </div>
  );
}

function UploadField({
  label,
  hint,
  icon: Icon,
  accept,
  bucket,
  folder,
  publicUrl,
  filled,
  filledLabel,
  onUploaded,
  onClear,
  onBusyChange,
}: {
  label: string;
  hint: string;
  icon: typeof Music;
  accept: string;
  bucket: string;
  folder: string;
  publicUrl?: boolean;
  filled: boolean;
  filledLabel: string;
  onUploaded: (value: string) => void;
  onClear: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const upload = async (file: File) => {
    setBusy(true);
    onBusyChange(true);
    try {
      const supabase = getBrowserSupabase();
      // Artwork goes through the same downscale as track covers; audio files
      // are not an image type and pass through untouched.
      const prepared = await prepareImageUpload(file);
      const key = libraryObjectKey(folder, `upload.${prepared.extension}`);
      const { error } = await supabase.storage.from(bucket).upload(key, prepared.body, {
        contentType: prepared.contentType || undefined,
        // Keys are unique per upload, so every object here is immutable.
        cacheControl: "31536000",
      });
      if (error) throw error;

      if (publicUrl) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(key);
        onUploaded(data.publicUrl);
      } else {
        onUploaded(key);
      }
    } catch (err) {
      toast(
        err instanceof Error
          ? err.message
          : `Couldn't upload that ${label.toLowerCase()}.`,
      );
    } finally {
      setBusy(false);
      onBusyChange(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        aria-label={label}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className={cn(
            "inline-flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm transition-colors hover:bg-surface-2 disabled:opacity-60",
            filled ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <Icon className="h-4 w-4 shrink-0" />
          )}
          <span className="min-w-0 truncate">
            {busy ? "Uploading…" : filled ? filledLabel : "Choose file"}
          </span>
        </button>
        {filled && !busy && (
          <button
            type="button"
            onClick={onClear}
            aria-label={`Remove ${label.toLowerCase()}`}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-danger"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <span className="text-xs text-muted-foreground">{hint}</span>
    </div>
  );
}
