import { router, Stack } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Share, View } from "react-native";
import { SUBJECTS } from "@/lib/exercises/catalog";
import { useData } from "~/data/store";
import { useColors } from "~/theme/theme";
import { Badge, EmptyState, SearchField } from "~/ui/Controls";
import { Icon } from "~/ui/Icon";
import { Row } from "~/ui/Row";
import { Screen, Section } from "~/ui/Screen";
import { Text } from "~/ui/Text";

function domainLabel(d: string) {
  return d === "general" ? "General" : (SUBJECTS as Record<string, { label: string }>)[d]?.label ?? d;
}

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export default function GlossaryScreen() {
  const { terms } = useData();
  const c = useColors();
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? terms.filter((t) => `${t.source} ${t.target} ${t.notes ?? ""}`.toLowerCase().includes(q)) : terms;
  }, [terms, query]);

  const exportCsv = () => {
    const lines = ["source_lang,source,target,domain,notes", ...terms.map((t) => [t.sourceLang, t.source, t.target, t.domain, t.notes ?? ""].map(csvCell).join(","))];
    Share.share({ title: "Glossary", message: lines.join("\n") });
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => router.push("/term")} accessibilityRole="button" accessibilityLabel="Add term" hitSlop={12} style={{ padding: 4 }}>
              <Icon name="plus" size={22} color={c.accent} weight="semibold" />
            </Pressable>
          ),
        }}
      />
      <Text variant="subheadline" tone="secondary" style={{ paddingHorizontal: 4 }}>
        Your assignment glossary. Preferred equivalents are passed to the AI evaluator when it judges terminology.
      </Text>
      <SearchField value={query} onChangeText={setQuery} placeholder="Search terms" />

      {filtered.length ? (
        <Section title={`${filtered.length} term${filtered.length === 1 ? "" : "s"}`}>
          {filtered.map((t) => (
            <Row
              key={t.id}
              onPress={() => router.push({ pathname: "/term", params: { id: t.id } })}
              title={`${t.source}`}
              subtitle={`${t.target}${t.notes ? `\n${t.notes}` : ""}`}
              trailing={
                <View style={{ gap: 4, alignItems: "flex-end" }}>
                  <Badge>{t.sourceLang.toUpperCase()}</Badge>
                  <Badge tone="accent">{domainLabel(t.domain)}</Badge>
                </View>
              }
              chevron
            />
          ))}
        </Section>
      ) : (
        <EmptyState
          title={terms.length ? "No terms match" : "Your glossary is empty"}
          message={terms.length ? "Try a different search." : "Add the terms you prepare for assignments. Tap + to add one."}
        />
      )}
      {terms.length > 0 && <Row title="Export as CSV" icon="share" onPress={exportCsv} />}
    </Screen>
  );
}
