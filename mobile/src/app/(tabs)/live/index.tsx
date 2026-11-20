import { View } from "react-native";
import { DIFFICULTY, LANGUAGES, SUBJECTS } from "@/lib/exercises/catalog";
import { SCENARIOS } from "@/lib/exercises/scenarios";
import { useData } from "~/data/store";
import { useColors } from "~/theme/theme";
import { Badge, Card } from "~/ui/Controls";
import { Row } from "~/ui/Row";
import { Screen, Section } from "~/ui/Screen";
import { Text } from "~/ui/Text";
import { startExercise } from "~/ui/helpers";

export default function LiveScreen() {
  const { status } = useData();
  const c = useColors();
  return (
    <Screen>
      <Text variant="subheadline" tone="secondary" style={{ paddingHorizontal: 4 }}>
        Dialogue interpreting between two parties. You switch direction every turn, as in a real assignment.
      </Text>

      <Section title="Scenarios" footer="Each turn is evaluated separately, then combined into one score.">
        {SCENARIOS.map((s) => (
          <Row
            key={s.id}
            onPress={() =>
              startExercise({
                type: "dialogue",
                sourceLang: s.parties[0].lang,
                targetLang: s.parties[1].lang,
                difficulty: s.difficulty,
                subject: s.subject,
                length: "medium",
                contentSource: "library",
                scenarioId: s.id,
              })
            }
            title={
              <View style={{ gap: 6 }}>
                <Text variant="headline">{s.title}</Text>
                <Text variant="subheadline" tone="secondary">
                  {s.setting}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  <Badge>{SUBJECTS[s.subject].label}</Badge>
                  <Badge>{`Level ${s.difficulty} · ${DIFFICULTY[s.difficulty].label}`}</Badge>
                  <Badge>{`${s.turns.length} turns`}</Badge>
                  <Badge tone="accent">{s.parties.map((p) => LANGUAGES[p.lang].label).join(" ⇄ ")}</Badge>
                </View>
              </View>
            }
            chevron
            accessibilityHint="Starts this dialogue simulation"
          />
        ))}
      </Section>

      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text variant="headline">Adaptive AI role-play</Text>
          <Badge>Planned</Badge>
        </View>
        <Text variant="subheadline" tone="secondary">
          Next on the roadmap: AI-voiced parties that react to your rendition in real time, with interruptions and clarification requests. It will use the same Gemini integration as evaluation
          {status?.evaluation.live ? ", which is already configured." : " (needs GEMINI_API_KEY on the server)."} The scripted scenarios above work today.
        </Text>
      </Card>
      <View style={{ height: 1, backgroundColor: c.background }} />
    </Screen>
  );
}
