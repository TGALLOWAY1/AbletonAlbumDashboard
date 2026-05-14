"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CoverImageUpload } from "@/components/cover-image-upload";
import { SubmitButton } from "@/components/submit-button";
import { createAlbum, type CreateAlbumState } from "@/app/actions/album";

const INITIAL_STATE: CreateAlbumState = { error: null };

export function NewAlbumForm({
  coverPathPrefix,
  disabled,
}: {
  coverPathPrefix: string;
  disabled: boolean;
}) {
  const [state, formAction] = useActionState(createAlbum, INITIAL_STATE);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Album details</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-5">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="Untitled album"
              maxLength={120}
              disabled={disabled}
            />
          </div>

          <div className="grid gap-2">
            <Label>Cover</Label>
            <CoverImageUpload
              name="cover_image_url"
              pathPrefix={coverPathPrefix}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="start_date">Start date</Label>
            <Input
              id="start_date"
              name="start_date"
              type="date"
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground">
              When this album becomes the focus. Used to order the upcoming
              gallery.
            </p>
          </div>

          {state.error && (
            <div
              role="alert"
              className="rounded-md border border-danger/40 bg-danger/5 p-3 text-sm text-danger"
            >
              {state.error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button asChild variant="ghost">
              <Link href="/albums">Cancel</Link>
            </Button>
            {disabled ? (
              <Button type="submit" disabled>
                Create album
              </Button>
            ) : (
              <SubmitButton pendingText="Creating…">Create album</SubmitButton>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
