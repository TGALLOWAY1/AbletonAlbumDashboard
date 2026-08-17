"use client";

import { useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export type ChecklistItem = {
  id: string;
  description: string;
  done: boolean;
};

let tempCounter = 0;
const tempId = () => `tmp-${++tempCounter}`;

export function SessionTodoChecklist({
  items,
  onChange,
  showDone = true,
  placeholder = "Add a task…",
  className,
}: {
  items: ChecklistItem[];
  onChange: (next: ChecklistItem[]) => void;
  showDone?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState("");

  const addItem = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...items, { id: tempId(), description: trimmed, done: false }]);
    setDraft("");
  };

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {items.length > 0 && (
        <ul className="flex flex-col gap-1">
          {items.map((item, idx) => (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded-md border border-border bg-surface px-2 py-1.5"
            >
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50" />
              {showDone && (
                <Checkbox
                  checked={item.done}
                  onCheckedChange={(v) => {
                    const next = [...items];
                    next[idx] = { ...item, done: v === true };
                    onChange(next);
                  }}
                />
              )}
              <Input
                value={item.description}
                onChange={(e) => {
                  const next = [...items];
                  next[idx] = { ...item, description: e.target.value };
                  onChange(next);
                }}
                className={cn(
                  "h-7 flex-1 border-none bg-transparent px-1 shadow-none focus-visible:ring-0",
                  item.done && "text-muted-foreground line-through",
                )}
              />
              <button
                type="button"
                onClick={() => onChange(items.filter((_, i) => i !== idx))}
                className="text-muted-foreground hover:text-danger"
                aria-label="Remove task"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
          placeholder={placeholder}
          className="h-8"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          disabled={!draft.trim()}
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </div>
    </div>
  );
}
