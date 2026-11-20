import { router, Stack, useLocalSearchParams } from "expo-router";
import { Alert, View } from "react-native";
import { DIFFICULTY, EXERCISE_TYPES, langPairLabel, SUBJECTS } from "@/lib/exercises/catalog";
import { Report } from "~/exercise/Report";
import { useData } from "~/data/store";
import { Button } from "~/ui/Button";
import { Badge, Card, EmptyState } from "~/ui/Controls";
import { Screen } from "~/ui/Screen";
import { Text } from "~/ui/Text";
import { formatDate, startExercise } from "~/ui/helpers";

export default function SessionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ready, visibleSessions, deleteSession } = useData();
  const s = visibleSessions.find((x) => x.id === id);
  if (!ready) return <Screen><View /></Screen>;
  if (!s)
    return (
      <Screen>
        <Card>
          <EmptyState title="Session not found" message="It may have been deleted." />
        </Card>
      </Screen>
    );
  const c = s.config;
  const confirmDelete = () =>
    Alert.alert("Delete this session?", "Its feedback and transcript will be removed. This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete Session", style: "destructive", onPress: async () => (await deleteSession(s.id), router.back()) },
    ]);
  return (
    <Screen contentStyle={{ paddingTop: 12 }}>
      <Stack.Screen options={{ title: formatDate(s.createdAt) }} />
      <View style={{ gap: 8 }}>
        <Text variant="title2">{s.exerciseTitle}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {s.isSample && <Badge tone="warn">Sample data</Badge>}
          <Badge>{EXERCISE_TYPES[c.type].label}</Badge>
          <Badge>{c.type === "dialogue" ? "EN ⇄ ES" : langPairLabel(c.sourceLang, c.targetLang)}</Badge>
          <Badge>{SUBJECTS[c.subject].label}</Badge>
          <Badge>{`Level ${c.difficulty} · ${DIFFICULTY[c.difficulty].label}`}</Badge>
        </View>
      </View>
      <Report evaluation={s.evaluation} config={c} sourceText={s.sourceText} transcript={s.response.transcript} />
      <View style={{ gap: 12 }}>
        <Button title="Practise again" onPress={() => startExercise({ ...c, contentSource: c.contentSource === "ai" ? "library" : c.contentSource })} />
        {!s.isSample && <Button title="Delete Session" variant="destructive" onPress={confirmDelete} />}
      </View>
    </Screen>
  );
}
