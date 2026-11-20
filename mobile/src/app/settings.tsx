import { useState } from "react";
import { Alert, Share, Switch, View } from "react-native";
import { useData } from "~/data/store";
import { API_URL, hasApi, hasSupabase } from "~/data/config";
import { useColors } from "~/theme/theme";
import { Badge, Segmented, TextField } from "~/ui/Controls";
import { Icon } from "~/ui/Icon";
import { Row } from "~/ui/Row";
import { Screen, Section } from "~/ui/Screen";
import { Text } from "~/ui/Text";
import type { Lang } from "@/lib/types";

function Service({ name, live, detail }: { name: string; live: boolean; detail: string }) {
  return <Row title={name} subtitle={detail} trailing={<Badge tone={live ? "good" : "warn"}>{live ? "Live" : "Demo"}</Badge>} />;
}

export default function SettingsScreen() {
  const { prefs, updatePrefs, status, auth, email, signOut, sessions, terms, deleteAllSessions } = useData();
  const c = useColors();
  const [name, setName] = useState(prefs.displayName);

  const exportData = () =>
    Share.share({ title: "Décalage export", message: JSON.stringify({ exportedAt: new Date().toISOString(), preferences: prefs, sessions, glossary: terms }, null, 2) });

  const eraseHistory = () =>
    Alert.alert("Delete practice history?", "All your sessions, evaluations and transcripts will be removed. This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete History", style: "destructive", onPress: () => deleteAllSessions() },
    ]);

  const rate = prefs.speechRateMultiplier;
  const step = (d: number) => updatePrefs({ speechRateMultiplier: Math.round(Math.min(1.3, Math.max(0.8, rate + d)) * 20) / 20 });

  return (
    <Screen contentStyle={{ paddingTop: 12 }}>
      <Section title="Profile">
        <View style={{ padding: 12 }}>
          <TextField
            value={name}
            onChangeText={setName}
            onEndEditing={() => name.trim() && name.trim() !== prefs.displayName && updatePrefs({ displayName: name.trim() })}
            placeholder="Display name"
            autoCapitalize="words"
            textContentType="name"
            autoComplete="name"
            returnKeyType="done"
            accessibilityLabel="Display name"
            style={{ backgroundColor: c.cardElevated }}
          />
        </View>
        <View style={{ padding: 12, gap: 8 }}>
          <Text variant="footnote" tone="secondary">
            Default direction
          </Text>
          <Segmented
            label="Default direction"
            value={prefs.defaultSourceLang}
            onChange={(v: Lang) => updatePrefs({ defaultSourceLang: v, defaultTargetLang: v === "en" ? "es" : "en" })}
            options={[{ value: "en", label: "English → Spanish" }, { value: "es", label: "Spanish → English" }]}
          />
        </View>
        <Row
          title="Speech rate"
          subtitle="Applied on top of each difficulty level's base speed."
          trailing={
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <Text onPress={() => step(-0.05)} accessibilityRole="button" accessibilityLabel="Slower" style={{ padding: 8 }}>
                <Icon name="minus" size={18} color={c.accent} weight="semibold" />
              </Text>
              <Text variant="body" tabular style={{ minWidth: 48, textAlign: "center" }}>
                {rate.toFixed(2)}×
              </Text>
              <Text onPress={() => step(0.05)} accessibilityRole="button" accessibilityLabel="Faster" style={{ padding: 8 }}>
                <Icon name="plus" size={18} color={c.accent} weight="semibold" />
              </Text>
            </View>
          }
        />
      </Section>

      <Section
        title="Privacy"
        footer="Recordings are never stored: audio is sent to the server only to be transcribed, then discarded. Transcripts and scores stay on this device, or in your account if you sign in."
      >
        <Row
          title="Show sample data"
          subtitle="Adds clearly labelled simulated sessions. Never saved to your history."
          trailing={<Switch value={prefs.showSampleData} onValueChange={(v) => updatePrefs({ showSampleData: v })} accessibilityLabel="Show sample data" />}
        />
        <Row title="Export my data" icon="share" onPress={exportData} />
        <Row title="Delete practice history" destructive onPress={eraseHistory} />
      </Section>

      <Section
        title="Services"
        footer={
          hasApi
            ? `Connected to ${API_URL}. AI features use the server's Gemini key, which never reaches this app. If the server uses Gemini's free tier, check Google's terms on how prompts may be used, and use a paid key for confidential material.`
            : "No server configured (EXPO_PUBLIC_API_URL), so everything runs on this device in demo mode."
        }
      >
        <Service
          name="AI evaluation"
          live={Boolean(status?.evaluation.live)}
          detail={status?.evaluation.live ? `Meaning-based evaluation with ${status.evaluation.model}.` : "Demo evaluator: concept matching against annotated meaning units, on this device."}
        />
        <Service
          name="Voice transcription"
          live={Boolean(status?.stt.live)}
          detail={status?.stt.live ? `Recorded renditions are transcribed by ${status.stt.provider}.` : "Not configured. Type your rendition or dictate with the keyboard's microphone key."}
        />
        <Service
          name="Passage voices"
          live={Boolean(status?.tts.live)}
          detail={status?.tts.live ? `Studio voices via ${status.tts.provider}.` : "Using the iPhone's built-in voices."}
        />
        <Service
          name="AI-written passages"
          live={Boolean(status?.passageGeneration.live)}
          detail={status?.passageGeneration.live ? "Fresh annotated passages on demand." : "Using the curated library and generated detail briefings."}
        />
        <Service name="Account & sync" live={hasSupabase} detail={hasSupabase ? "History syncs to your private account." : "History stays on this device."} />
      </Section>

      {hasSupabase && auth === "signedIn" && (
        <Section title="Account" footer={email ?? undefined}>
          <Row
            title="Sign Out"
            destructive
            onPress={() =>
              Alert.alert("Sign out?", undefined, [
                { text: "Cancel", style: "cancel" },
                { text: "Sign Out", style: "destructive", onPress: () => signOut() },
              ])
            }
          />
        </Section>
      )}

      <Text variant="footnote" tone="secondary" style={{ paddingHorizontal: 16, textAlign: "center" }}>
        Automated feedback is for training only. Scores are not an official assessment or professional certification.
      </Text>
    </Screen>
  );
}
