"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { grade } from "@/domain/items/answer";
import type { Item, StudentAnswer } from "@/domain/items/types";
import { ItemPanel } from "@/app/learn/ItemPanel";
import type { ItemView } from "@/app/learn/views";

/** Answer boxes with units, graded in the browser (no account or database needed). */
export function KeypadDemo({ items }: { items: Array<{ item: Item; view: ItemView }> }) {
  const [results, setResults] = useState<Record<string, string>>({});
  const submit = (item: Item) => (answer: StudentAnswer) => {
    const r = grade(item, answer);
    setResults((prev) => ({ ...prev, [item.id]: `${r.status}${r.formMessage ? `: ${r.formMessage}` : ""} (${r.shown})` }));
  };
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map(({ item, view }) => (
        <Card key={item.id}>
          <ItemPanel item={view} readAloud={false} disabled={false} onSubmit={submit(item)} />
          <p className="mt-3 text-sm font-bold" role="status" data-testid={`demo-result-${item.id}`}>
            {results[item.id] ?? ""}
          </p>
        </Card>
      ))}
    </div>
  );
}
