import { describe, expect, it } from "vitest";
import {
  advanceQueue,
  hasPlayableNeighbour,
  queueSignature,
  type PlayableAsset,
} from "@/lib/data/library";

function asset(id: string, playable = true): PlayableAsset {
  return {
    id,
    kind: "preset",
    name: id,
    subtitle: "",
    previewUrl: playable ? `https://example.test/${id}.wav` : undefined,
  };
}

describe("advanceQueue", () => {
  const queue = [asset("a"), asset("b"), asset("c")];

  it("steps forward and backward through the set", () => {
    expect(advanceQueue(queue, "a", "next")?.id).toBe("b");
    expect(advanceQueue(queue, "b", "next")?.id).toBe("c");
    expect(advanceQueue(queue, "c", "previous")?.id).toBe("b");
  });

  it("clamps at both ends rather than wrapping", () => {
    expect(advanceQueue(queue, "c", "next")).toBeNull();
    expect(advanceQueue(queue, "a", "previous")).toBeNull();
  });

  it("skips assets that have no preview", () => {
    const gappy = [asset("a"), asset("b", false), asset("c")];
    expect(advanceQueue(gappy, "a", "next")?.id).toBe("c");
    expect(advanceQueue(gappy, "c", "previous")?.id).toBe("a");
  });

  it("returns null when nothing beyond the current item is playable", () => {
    const gappy = [asset("a"), asset("b", false), asset("c", false)];
    expect(advanceQueue(gappy, "a", "next")).toBeNull();
  });

  it("handles a single-item queue", () => {
    const single = [asset("only")];
    expect(advanceQueue(single, "only", "next")).toBeNull();
    expect(advanceQueue(single, "only", "previous")).toBeNull();
  });

  it("handles an empty queue", () => {
    expect(advanceQueue([], null, "next")).toBeNull();
    expect(advanceQueue([], "a", "next")).toBeNull();
  });

  it("starts from the appropriate end when nothing is playing", () => {
    expect(advanceQueue(queue, null, "next")?.id).toBe("a");
    expect(advanceQueue(queue, null, "previous")?.id).toBe("c");
  });

  it("recovers when the playing asset has been filtered out of the set", () => {
    // The user searched while "z" was playing; "z" is no longer visible, so
    // next should re-enter the new result set from its head rather than dead-end.
    expect(advanceQueue(queue, "z", "next")?.id).toBe("a");
    expect(advanceQueue(queue, "z", "previous")?.id).toBe("c");
  });

  it("skips unplayable items when re-entering a set", () => {
    const gappy = [asset("a", false), asset("b")];
    expect(advanceQueue(gappy, null, "next")?.id).toBe("b");
  });
});

describe("queueSignature", () => {
  it("is stable for an equivalent queue", () => {
    expect(queueSignature([asset("a"), asset("b")])).toBe(
      queueSignature([asset("a"), asset("b")]),
    );
  });

  it("changes when an asset's preview is replaced", () => {
    // The regression this guards: editing an asset leaves its id and position
    // untouched, so a queue compared by id alone would keep serving the old
    // URL and storage path.
    const before = [{ ...asset("a"), previewUrl: "https://old.test/a.wav" }];
    const after = [{ ...asset("a"), previewUrl: "https://new.test/a.wav" }];
    expect(queueSignature(before)).not.toBe(queueSignature(after));
  });

  it("changes when an asset gains a preview it previously lacked", () => {
    expect(queueSignature([asset("a", false)])).not.toBe(
      queueSignature([asset("a", true)]),
    );
  });

  it("changes when a name or subtitle is edited", () => {
    const renamed = [{ ...asset("a"), name: "Renamed" }];
    expect(queueSignature([asset("a")])).not.toBe(queueSignature(renamed));
  });

  it("changes when order or membership changes", () => {
    expect(queueSignature([asset("a"), asset("b")])).not.toBe(
      queueSignature([asset("b"), asset("a")]),
    );
    expect(queueSignature([asset("a")])).not.toBe(
      queueSignature([asset("a"), asset("b")]),
    );
  });

  it("cannot collide across differently split fields", () => {
    // Separators are control characters, so a name containing the text of a
    // neighbouring field can't forge another queue's signature.
    const tricky = [{ ...asset("a"), name: "b", subtitle: "a" }];
    expect(queueSignature(tricky)).not.toBe(queueSignature([asset("a")]));
  });
});

describe("hasPlayableNeighbour", () => {
  it("mirrors advanceQueue so transport buttons disable at the ends", () => {
    const queue = [asset("a"), asset("b")];
    expect(hasPlayableNeighbour(queue, "a", "previous")).toBe(false);
    expect(hasPlayableNeighbour(queue, "a", "next")).toBe(true);
    expect(hasPlayableNeighbour(queue, "b", "next")).toBe(false);
  });
});
