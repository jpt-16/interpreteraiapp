import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, View } from "react-native";
import { SUBJECTS } from "@/lib/exercises/catalog";
import type { Lang, Subject } from "@/lib/types";
import { useData } from "~/data/store";
import { Button } from "~/ui/Button";
import { Chips, Segmented, TextField } from "~/ui/Controls";
import { Screen } from "~/ui/Screen";
import { Text } from "~/ui/Text";

type Domain = Subject | "general";

export default function TermSheet() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { terms, saveTerm, deleteTerm } = useData();
  const existing = id ? terms.find((t) => t.id === id) : undefined;
  const [sourceLang, setSourceLang] = useState<Lang>(existing?.sourceLang ?? "en");
  const [source, setSource] = useState(existing?.source ?? "");
  const [target, setTarget] = useState(existing?.target ?? "");
  const [domain, setDomain] = useState<Domain>((existing?.domain as Domain) ?? "general");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const valid = source.trim().length > 0 && target.trim().length > 0;

  const save = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await saveTerm({ id: existing?.id, sourceLang, source: source.trim(), target: target.trim(), domain, notes: notes.trim() || undefined });
      router.back();
    } catch {
      Alert.alert("Could not save", "Please try again.");
      setSaving(false);
    }
  };

  const remove = () =>
    Alert.alert("Delete this term?", "It will be removed from your glossary.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete Term", style: "destructive", onPress: async () => existing && (await deleteTerm(existing.id), router.back()) },
    ]);

  return (
    <Screen contentStyle={{ paddingTop: 16 }}>
      <Stack.Screen
        options={{
          title: existing ? "Edit Term" : "New Term",
          headerLeft: () => (
            <Text variant="body" tone="accent" onPress={() => router.back()} accessibilityRole="button">
              Cancel
            </Text>
          ),
          headerRight: () => (
            <Text variant="body" tone={valid ? "accent" : "tertiary"} weight="600" onPress={save} accessibilityRole="button" accessibilityState={{ disabled: !valid }}>
              Save
            </Text>
          ),
        }}
      />
      <View style={{ gap: 8 }}>
        <Text variant="footnote" tone="secondary">
          SOURCE LANGUAGE
        </Text>
        <Segmented label="Source language" value={sourceLang} onChange={setSourceLang} options={[{ value: "en", label: "English" }, { value: "es", label: "Spanish" }]} />
      </View>
      <View style={{ gap: 8 }}>
        <Text variant="footnote" tone="secondary">
          TERM
        </Text>
        <TextField value={source} onChangeText={setSource} placeholder={sourceLang === "en" ? "ejection fraction" : "fracción de eyección"} autoCapitalize="none" maxLength={200} accessibilityLabel="Term" />
      </View>
      <View style={{ gap: 8 }}>
        <Text variant="footnote" tone="secondary">
          EQUIVALENT
        </Text>
        <TextField value={target} onChangeText={setTarget} placeholder={sourceLang === "en" ? "fracción de eyección" : "ejection fraction"} autoCapitalize="none" maxLength={200} accessibilityLabel="Equivalent" />
      </View>
      <View style={{ gap: 8 }}>
        <Text variant="footnote" tone="secondary">
          DOMAIN
        </Text>
        <Chips
          label="Domain"
          value={domain}
          onChange={setDomain}
          options={[{ value: "general" as Domain, label: "General" }, ...(Object.keys(SUBJECTS) as Subject[]).map((s) => ({ value: s as Domain, label: SUBJECTS[s].label }))]}
        />
      </View>
      <View style={{ gap: 8 }}>
        <Text variant="footnote" tone="secondary">
          NOTES
        </Text>
        <TextField value={notes} onChangeText={setNotes} placeholder="Context, register, client preference…" multiline maxLength={1000} accessibilityLabel="Notes" style={{ minHeight: 90 }} />
      </View>
      {existing && <Button title="Delete Term" variant="destructive" onPress={remove} />}
    </Screen>
  );
}
