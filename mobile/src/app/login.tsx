import { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getSupabase } from "~/data/supabase";
import { useColors } from "~/theme/theme";
import { Button } from "~/ui/Button";
import { Segmented, TextField } from "~/ui/Controls";
import { Text } from "~/ui/Text";

export default function Login() {
  const c = useColors();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async () => {
    const sb = getSupabase();
    if (!sb || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "signup") {
        const { data, error } = await sb.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        if (!data.session) setMessage({ ok: true, text: "Account created. Confirm your email, then sign in." });
      } else {
        const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Something went wrong." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "center", padding: 24 }}>
        <View style={{ width: "100%", maxWidth: 420, alignSelf: "center", gap: 20 }}>
          <View style={{ gap: 6 }}>
            <Text variant="largeTitle">Décalage</Text>
            <Text variant="callout" tone="secondary">
              Interpreter performance training: memory, consecutive and simultaneous practice with meaning-based feedback.
            </Text>
          </View>
          <Segmented label="Mode" value={mode} onChange={setMode} options={[{ value: "signin", label: "Sign In" }, { value: "signup", label: "Create Account" }]} />
          <TextField
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            autoComplete="email"
            returnKeyType="next"
            accessibilityLabel="Email"
          />
          <TextField
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            textContentType={mode === "signup" ? "newPassword" : "password"}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            returnKeyType="go"
            onSubmitEditing={submit}
            accessibilityLabel="Password"
          />
          {message && (
            <Text variant="subheadline" tone={message.ok ? "good" : "bad"} accessibilityLiveRegion="polite">
              {message.text}
            </Text>
          )}
          <Button title={mode === "signin" ? "Sign In" : "Create Account"} onPress={submit} loading={busy} disabled={!email.trim() || password.length < 8} />
          <Text variant="caption1" tone="tertiary" style={{ textAlign: "center" }}>
            Automated feedback is for training and is not a professional certification.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
