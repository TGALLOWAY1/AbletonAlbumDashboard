import { describe, expect, it, vi } from "vitest";
import { fetchTrackAlbums } from "@/lib/data/tracks";

// Regression coverage for the /tracks grouping outage: selecting `genre`
// (migration 0021) made PostgREST reject the whole albums query on a project
// that had not applied the migration, so every track lost its album and the
// page filed the entire library under "Backlog". Album membership must
// survive a missing decorative column.

const ALBUM_IDS = ["alb-1", "alb-2"];

const UNDEFINED_COLUMN = {
  code: "42703",
  message: 'column albums.genre does not exist',
};

/** Minimal stand-in for the query builder chain `from().select().in()`. */
function fakeSupabase(
  responses: Record<string, { data: unknown; error: unknown }>,
) {
  const selected: string[] = [];
  const client = {
    from() {
      return {
        select(columns: string) {
          selected.push(columns);
          return {
            in: () =>
              Promise.resolve(
                responses[columns] ?? { data: null, error: UNDEFINED_COLUMN },
              ),
          };
        },
      };
    },
  };
  return {
    client: client as unknown as Parameters<typeof fetchTrackAlbums>[0],
    selected,
  };
}

describe("fetchTrackAlbums", () => {
  it("returns albums with their genre when the column exists", async () => {
    const { client, selected } = fakeSupabase({
      "id, title, genre": {
        data: [{ id: "alb-1", title: "Forestation", genre: "Dubstep" }],
        error: null,
      },
    });

    await expect(fetchTrackAlbums(client, ALBUM_IDS)).resolves.toEqual([
      { id: "alb-1", title: "Forestation", genre: "Dubstep" },
    ]);
    // One round trip when nothing is missing.
    expect(selected).toEqual(["id, title, genre"]);
  });

  it("keeps album membership when albums.genre is missing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { client, selected } = fakeSupabase({
      "id, title, genre": { data: null, error: UNDEFINED_COLUMN },
      "id, title": {
        data: [
          { id: "alb-1", title: "Forestation" },
          { id: "alb-2", title: "Nocturne" },
        ],
        error: null,
      },
    });

    // The whole point: the tracks still know their album, genre just unset.
    await expect(fetchTrackAlbums(client, ALBUM_IDS)).resolves.toEqual([
      { id: "alb-1", title: "Forestation", genre: null },
      { id: "alb-2", title: "Nocturne", genre: null },
    ]);
    expect(selected).toEqual(["id, title, genre", "id, title"]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("returns nothing, loudly, when the albums table itself is unreadable", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { client } = fakeSupabase({
      "id, title, genre": {
        data: null,
        error: { code: "PGRST205", message: "albums not found" },
      },
      "id, title": {
        data: null,
        error: { code: "PGRST205", message: "albums not found" },
      },
    });

    await expect(fetchTrackAlbums(client, ALBUM_IDS)).resolves.toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("skips the round trip entirely for tracks with no album", async () => {
    const { client, selected } = fakeSupabase({});
    await expect(fetchTrackAlbums(client, [])).resolves.toEqual([]);
    expect(selected).toEqual([]);
  });
});
