"use client";

import { useState, type ReactNode } from "react";

/** Tabs for the areas of mathematics; each panel is rendered on the server and only shown or hidden here. */
export function DomainTabs({ tabs }: { tabs: Array<{ id: string; label: string; content: ReactNode }> }) {
  const [active, setActive] = useState(tabs[0]?.id);
  if (tabs.length <= 1) return <>{tabs[0]?.content}</>;
  return (
    <div>
      <div role="tablist" aria-label="영역" className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={active === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setActive(t.id)}
            className={`rounded-full px-4 py-2 text-sm font-bold ring-1 transition ${active === t.id ? "bg-brand text-white ring-brand" : "bg-white text-muted ring-black/10 hover:text-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} role="tabpanel" id={`panel-${t.id}`} aria-labelledby={`tab-${t.id}`} hidden={active !== t.id}>
          {t.content}
        </div>
      ))}
    </div>
  );
}
