import { AudioQuality, IOSOutputFormat, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState, type RecordingOptions } from "expo-audio";
import { useCallback, useState } from "react";
import { Platform } from "react-native";

/**
 * 16 kHz mono speech. iOS records linear PCM (WAV), which Gemini accepts directly;
 * Android records AAC (M4A). Audio stays in the app's cache and is deleted after transcription.
 */
const OPTIONS: RecordingOptions = {
  extension: Platform.OS === "ios" ? ".wav" : ".m4a",
  sampleRate: 16000,
  numberOfChannels: 1,
  bitRate: 64000,
  isMeteringEnabled: true,
  android: { outputFormat: "mpeg4", audioEncoder: "aac" },
  ios: {
    outputFormat: IOSOutputFormat.LINEARPCM,
    audioQuality: AudioQuality.HIGH,
    sampleRate: 16000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: { mimeType: "audio/webm", bitsPerSecond: 64000 },
};

export const recordingMime = () => (Platform.OS === "ios" ? "audio/wav" : Platform.OS === "web" ? "audio/webm" : "audio/mp4");

export function useRenditionRecorder() {
  const recorder = useAudioRecorder(OPTIONS);
  const state = useAudioRecorderState(recorder, 100);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    setError(null);
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setError("Microphone access is off. Enable it in Settings, or type your rendition instead.");
        return false;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      return true;
    } catch {
      setError("Could not start recording.");
      return false;
    }
  }, [recorder]);

  const stop = useCallback(async () => {
    const durationSec = recorder.currentTime;
    try {
      await recorder.stop();
    } finally {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
    }
    return { uri: recorder.uri, durationSec };
  }, [recorder]);

  // iOS reports metering in dB (−160…0); map the speech range to 0…1.
  const level = state.isRecording && state.metering !== undefined ? Math.max(0, Math.min(1, (state.metering + 55) / 55)) : 0;
  return { isRecording: state.isRecording, elapsed: state.durationMillis / 1000, level, error, start, stop };
}
