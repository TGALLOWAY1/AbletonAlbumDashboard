import { describe, expect, it } from "vitest";
import {
  DECISION_TO_REVIEW_STATUS,
  EXPERIMENT_TRANSITIONS,
  MAX_CANDIDATES_PER_EXPERIMENT,
  SUNO_CANDIDATE_DECISIONS,
  SUNO_EXPERIMENT_STATUSES,
  VERSION_REVIEW_STATUSES,
  canTransition,
  isTerminal,
  resolveKeepDecision,
  sunoActionDescription,
  sunoBadgeLabel,
  type SunoCandidateDecision,
} from "@/lib/suno";

describe("experiment state machine", () => {
  // The transition map is the single source of truth for the experiment
  // lifecycle — every guard in the server actions goes through canTransition.
  it("allows exactly the transitions from the spec", () => {
    expect(EXPERIMENT_TRANSITIONS.ready_to_send).toEqual([
      "waiting_for_results",
    ]);
    expect(EXPERIMENT_TRANSITIONS.waiting_for_results).toEqual([
      "reviewing",
      "discarded",
    ]);
    expect(EXPERIMENT_TRANSITIONS.reviewing).toEqual([
      "selected",
      "discarded",
    ]);
    expect(EXPERIMENT_TRANSITIONS.selected).toEqual([
      "integrated",
      "reviewing",
      "discarded",
    ]);
  });

  it("covers every status", () => {
    for (const status of SUNO_EXPERIMENT_STATUSES) {
      expect(EXPERIMENT_TRANSITIONS[status], status).toBeDefined();
    }
  });

  it("treats only integrated and discarded as terminal", () => {
    expect(isTerminal("integrated")).toBe(true);
    expect(isTerminal("discarded")).toBe(true);
    expect(isTerminal("ready_to_send")).toBe(false);
    expect(isTerminal("waiting_for_results")).toBe(false);
    expect(isTerminal("reviewing")).toBe(false);
    expect(isTerminal("selected")).toBe(false);
  });

  it("never lets a terminal experiment reopen", () => {
    for (const from of ["integrated", "discarded"] as const) {
      expect(EXPERIMENT_TRANSITIONS[from]).toHaveLength(0);
      for (const to of SUNO_EXPERIMENT_STATUSES) {
        expect(
          canTransition(from, to),
          `${from} -> ${to} must be forbidden`,
        ).toBe(false);
      }
    }
  });

  it("rejects transitions not in the map", () => {
    expect(canTransition("ready_to_send", "reviewing")).toBe(false);
    expect(canTransition("ready_to_send", "discarded")).toBe(false);
    expect(canTransition("waiting_for_results", "selected")).toBe(false);
    expect(canTransition("reviewing", "integrated")).toBe(false);
    expect(canTransition("reviewing", "ready_to_send")).toBe(false);
    expect(canTransition("selected", "waiting_for_results")).toBe(false);
  });
});

describe("decision → review status mapping", () => {
  it("maps every decision onto a valid version review status", () => {
    for (const decision of SUNO_CANDIDATE_DECISIONS) {
      const status = DECISION_TO_REVIEW_STATUS[decision];
      expect(VERSION_REVIEW_STATUSES, decision).toContain(status);
    }
    expect(DECISION_TO_REVIEW_STATUS.unreviewed).toBe("inbox");
    expect(DECISION_TO_REVIEW_STATUS.keep).toBe("keeper");
    expect(DECISION_TO_REVIEW_STATUS.mine).toBe("mined");
    expect(DECISION_TO_REVIEW_STATUS.reject).toBe("rejected");
  });
});

describe("guardrails", () => {
  it("caps candidates at 4 per experiment", () => {
    expect(MAX_CANDIDATES_PER_EXPERIMENT).toBe(4);
  });
});

describe("sunoActionDescription", () => {
  it("produces the lifecycle descriptions", () => {
    expect(sunoActionDescription("send", "Night Drive", "darker drop")).toBe(
      'Send "Night Drive" to Suno: darker drop',
    );
    expect(sunoActionDescription("return", "Night Drive", "darker drop")).toBe(
      "Return Suno variations for review",
    );
    expect(sunoActionDescription("review", "Night Drive", "darker drop")).toBe(
      "Review Suno variations: darker drop",
    );
  });
});

describe("sunoBadgeLabel", () => {
  it("labels every non-terminal status", () => {
    expect(sunoBadgeLabel({ status: "ready_to_send", unreviewedCount: 0 })).toBe(
      "Suno: ready to send",
    );
    expect(
      sunoBadgeLabel({ status: "waiting_for_results", unreviewedCount: 0 }),
    ).toBe("Suno: waiting");
    expect(sunoBadgeLabel({ status: "reviewing", unreviewedCount: 3 })).toBe(
      "Suno: 3 to review",
    );
    expect(sunoBadgeLabel({ status: "reviewing", unreviewedCount: 0 })).toBe(
      "Suno: pick a keeper",
    );
    expect(sunoBadgeLabel({ status: "selected", unreviewedCount: 0 })).toBe(
      "Suno: ready to integrate",
    );
  });

  it("hides the badge for terminal experiments", () => {
    expect(sunoBadgeLabel({ status: "integrated", unreviewedCount: 0 })).toBe(
      null,
    );
    expect(sunoBadgeLabel({ status: "discarded", unreviewedCount: 2 })).toBe(
      null,
    );
  });
});

describe("resolveKeepDecision (one keeper per experiment)", () => {
  const candidates = (
    decisions: SunoCandidateDecision[],
  ): { id: string; decision: SunoCandidateDecision }[] =>
    decisions.map((decision, i) => ({ id: `c${i}`, decision }));

  it("keeps directly when no keeper exists", () => {
    const result = resolveKeepDecision(
      candidates(["unreviewed", "reject"]),
      "c0",
      false,
    );
    expect(result).toEqual({ ok: true, demoteCandidateId: null });
  });

  it("flags the conflict when a keeper exists and replace is not confirmed", () => {
    const result = resolveKeepDecision(
      candidates(["keep", "unreviewed"]),
      "c1",
      false,
    );
    expect(result).toEqual({ ok: false, reason: "keeper_exists" });
  });

  it("demotes exactly the old keeper when replacement is confirmed", () => {
    const result = resolveKeepDecision(
      candidates(["keep", "unreviewed", "mine"]),
      "c1",
      true,
    );
    expect(result).toEqual({ ok: true, demoteCandidateId: "c0" });
  });

  it("is a no-op demotion when the target is already the keeper", () => {
    const result = resolveKeepDecision(candidates(["keep"]), "c0", false);
    expect(result).toEqual({ ok: true, demoteCandidateId: null });
  });
});
