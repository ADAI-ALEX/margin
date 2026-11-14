"use client";
/**
 * Accessible tabs (automatic activation): arrows, Home and End move between tabs. The consumer renders
 * the panels with `tabPanelProps(prefix, id, active)` so ids and labelling stay consistent.
 */
export interface TabDef<T extends string> { id: T; label: string; badge?: string | number }

export function TabList<T extends string>({ prefix, tabs, value, onChange, label, className }: {
  prefix: string; tabs: readonly TabDef<T>[]; value: T; onChange: (id: T) => void; label: string; className?: string;
}) {
  const onKey = (e: React.KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.id === value);
    let k = -1;
    if (e.key === "ArrowRight") k = (i + 1) % tabs.length;
    else if (e.key === "ArrowLeft") k = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") k = 0;
    else if (e.key === "End") k = tabs.length - 1;
    if (k < 0) return;
    e.preventDefault();
    onChange(tabs[k].id);
    document.getElementById(`${prefix}-tab-${tabs[k].id}`)?.focus();
  };
  return (
    <div className={`ui-tabs ${className ?? ""}`} role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button key={t.id} type="button" role="tab" id={`${prefix}-tab-${t.id}`} aria-controls={`${prefix}-panel-${t.id}`} aria-selected={value === t.id}
          tabIndex={value === t.id ? 0 : -1} className="ui-tab" onClick={() => onChange(t.id)} onKeyDown={onKey}>
          {t.label}{t.badge != null && <span className="ui-tab-badge num">{t.badge}</span>}
        </button>
      ))}
    </div>
  );
}

export function tabPanelProps(prefix: string, id: string, active: string) {
  return { role: "tabpanel" as const, id: `${prefix}-panel-${id}`, "aria-labelledby": `${prefix}-tab-${id}`, hidden: active !== id, tabIndex: 0 };
}
