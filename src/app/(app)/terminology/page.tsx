"use client";
import { Download, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FieldLabel, Segmented, Select, TextInput } from "@/components/ui/Fields";
import { PageHeader } from "@/components/ui/PageHeader";
import { useData } from "@/lib/data/store";
import { SUBJECTS } from "@/lib/exercises/catalog";
import type { Lang, Subject, TermEntry } from "@/lib/types";

type Domain = Subject | "general";
const DOMAINS: { value: Domain; label: string }[] = [
  { value: "general", label: "General" },
  ...(Object.keys(SUBJECTS) as Subject[]).map((s) => ({ value: s, label: SUBJECTS[s].label })),
];

const empty = { source: "", target: "", sourceLang: "en" as Lang, domain: "general" as Domain, notes: "" };

function csvEscape(v: string) {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

export default function TerminologyPage() {
  const { terms, saveTerm, deleteTerm, mode } = useData();
  const [form, setForm] = useState<typeof empty & { id?: string }>(empty);
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState<Domain | "all">("all");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return terms.filter(
      (t) =>
        (domain === "all" || t.domain === domain) &&
        (!q || t.source.toLowerCase().includes(q) || t.target.toLowerCase().includes(q) || t.notes?.toLowerCase().includes(q)),
    );
  }, [terms, query, domain]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.source.trim() || !form.target.trim()) return;
    setBusy(true);
    try {
      await saveTerm({ ...form, source: form.source.trim(), target: form.target.trim(), notes: form.notes.trim() || undefined });
      setForm({ ...empty, sourceLang: form.sourceLang, domain: form.domain });
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () => {
    const lines = [["source_lang", "source", "target", "domain", "notes"].join(",")];
    for (const t of terms) lines.push([t.sourceLang, t.source, t.target, t.domain, t.notes ?? ""].map(csvEscape).join(","));
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "glossary.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importCsv = async (file: File) => {
    const rows = parseCsv(await file.text());
    const header = rows[0]?.map((h) => h.trim().toLowerCase()) ?? [];
    const hasHeader = header.includes("source") && header.includes("target");
    const idx = (name: string, fallback: number) => (hasHeader ? header.indexOf(name) : fallback);
    let added = 0;
    for (const r of rows.slice(hasHeader ? 1 : 0)) {
      const source = r[idx("source", 0)]?.trim();
      const target = r[idx("target", 1)]?.trim();
      if (!source || !target) continue;
      const langRaw = r[idx("source_lang", 2)]?.trim();
      const domRaw = r[idx("domain", 3)]?.trim() as Domain;
      await saveTerm({
        source,
        target,
        sourceLang: langRaw === "es" ? "es" : "en",
        domain: DOMAINS.some((d) => d.value === domRaw) ? domRaw : "general",
        notes: r[idx("notes", 4)]?.trim() || undefined,
      });
      added++;
    }
    setMessage(`Imported ${added} term${added === 1 ? "" : "s"}.`);
  };

  const edit = (t: TermEntry) => setForm({ id: t.id, source: t.source, target: t.target, sourceLang: t.sourceLang, domain: t.domain, notes: t.notes ?? "" });

  return (
    <div className="animate-rise">
      <PageHeader
        title="Vocabulary & Terminology"
        description="Your assignment glossary. Preferred equivalents are passed to the AI evaluator when it judges terminology."
        actions={
          <>
            <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])} />
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <Upload size={15} /> Import CSV
            </Button>
            <Button variant="secondary" onClick={exportCsv} disabled={!terms.length}>
              <Download size={15} /> Export
            </Button>
          </>
        }
      />
      {message && <p className="mb-4 text-[13px] text-good">{message}</p>}

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <Card className="lg:sticky lg:top-8 lg:self-start">
          <CardHeader title={form.id ? "Edit term" : "Add term"} />
          <CardBody>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <FieldLabel>Source language</FieldLabel>
                <Segmented
                  value={form.sourceLang}
                  onChange={(v: Lang) => setForm((f) => ({ ...f, sourceLang: v }))}
                  options={[
                    { value: "en", label: "English" },
                    { value: "es", label: "Spanish" },
                  ]}
                />
              </div>
              <div>
                <FieldLabel>Term</FieldLabel>
                <TextInput value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} placeholder={form.sourceLang === "en" ? "ejection fraction" : "fracción de eyección"} maxLength={200} required />
              </div>
              <div>
                <FieldLabel>Equivalent</FieldLabel>
                <TextInput value={form.target} onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))} placeholder={form.sourceLang === "en" ? "fracción de eyección" : "ejection fraction"} maxLength={200} required />
              </div>
              <div>
                <FieldLabel>Domain</FieldLabel>
                <Select value={form.domain} onChange={(v) => setForm((f) => ({ ...f, domain: v as Domain }))} options={DOMAINS} />
              </div>
              <div>
                <FieldLabel>Notes</FieldLabel>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  maxLength={1000}
                  placeholder="Context, register, client preference…"
                  className="w-full rounded-lg border border-line-strong bg-surface-2 p-3 text-sm text-ink outline-none placeholder:text-faint focus:border-accent"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={busy} className="flex-1">
                  <Plus size={15} /> {form.id ? "Save changes" : "Add to glossary"}
                </Button>
                {form.id && (
                  <Button variant="ghost" onClick={() => setForm(empty)}>
                    Cancel
                  </Button>
                )}
              </div>
              <p className="text-[11.5px] text-faint">{mode === "supabase" ? "Saved to your account (private to you)." : "Demo mode: saved in this browser only."}</p>
            </form>
          </CardBody>
        </Card>

        <Card>
          <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row">
            <div className="relative flex-1">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search terms" className="pl-8" aria-label="Search terms" />
            </div>
            <Select ariaLabel="Filter by domain" value={domain} onChange={(v) => setDomain(v as Domain | "all")} className="sm:w-[180px]" options={[{ value: "all", label: "All domains" }, ...DOMAINS]} />
          </div>
          {filtered.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-[13px]">
                <thead className="text-[11.5px] uppercase tracking-wider text-muted">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Term</th>
                    <th className="px-4 py-2.5 font-medium">Equivalent</th>
                    <th className="px-4 py-2.5 font-medium">Domain</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id} className="border-t border-line align-top">
                      <td className="px-4 py-3">
                        <div className="text-ink">{t.source}</div>
                        <div className="text-[11.5px] text-faint">{t.sourceLang.toUpperCase()}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-ink-2">{t.target}</div>
                        {t.notes && <div className="mt-0.5 text-[12px] text-muted">{t.notes}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge>{DOMAINS.find((d) => d.value === t.domain)?.label ?? t.domain}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button aria-label={`Edit ${t.source}`} onClick={() => edit(t)} className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-ink">
                            <Pencil size={14} />
                          </button>
                          <button aria-label={`Delete ${t.source}`} onClick={() => deleteTerm(t.id)} className="rounded-md p-1.5 text-muted hover:bg-bad-soft hover:text-bad">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title={terms.length ? "No terms match" : "Your glossary is empty"}
              description={terms.length ? "Try a different search or domain." : "Add the terms you prepare for assignments. CSV columns: source_lang, source, target, domain, notes."}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
