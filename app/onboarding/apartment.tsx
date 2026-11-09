import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Text, useThemeColor } from "@/components/Themed";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { TextField } from "@/components/ui/TextField";
import { useAppState } from "@/context/AppStateContext";
import { FontSize, FontWeight, Spacing } from "@/constants/theme";

type Mode = "choose" | "create" | "join";

export default function ApartmentOnboardingScreen() {
  const { createApartment, requestToJoinApartment, myJoinRequest, cancelMyJoinRequest, logout } =
    useAppState();
  const [mode, setMode] = useState<Mode>("choose");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const textMuted = useThemeColor({}, "textMuted");
  const danger = useThemeColor({}, "danger");

  async function handleCreate() {
    setError(null);
    setSubmitting(true);
    try {
      await createApartment(name, address);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create the apartment.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleJoin() {
    setError(null);
    setSubmitting(true);
    try {
      await requestToJoinApartment(code);
      setCode("");
      setMode("choose");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send that request.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelRequest() {
    setSubmitting(true);
    try {
      await cancelMyJoinRequest();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.replace("/(auth)/welcome");
  }

  return (
    <Screen>
      {mode !== "choose" && (
        <Pressable
          onPress={() => {
            setError(null);
            setMode("choose");
          }}
          style={styles.back}>
          <Ionicons name="chevron-back" size={24} />
        </Pressable>
      )}

      <View style={styles.content}>
        {mode === "choose" && (
          <>
            <Text style={styles.title}>One last step</Text>
            <Text style={[styles.subtitle, { color: textMuted }]}>
              Create a new apartment, or request to join one with an invite code.
            </Text>

            {myJoinRequest ? (
              <Card style={styles.pendingCard}>
                <View style={styles.pendingRow}>
                  <Ionicons name="time-outline" size={20} color={textMuted} />
                  <Text style={styles.pendingTitle}>Request pending</Text>
                </View>
                <Text style={[styles.pendingBody, { color: textMuted }]}>
                  You asked to join <Text style={{ fontWeight: FontWeight.semibold as any }}>
                    {myJoinRequest.apartmentName}
                  </Text>
                  . Its owner needs to accept before you can get in.
                </Text>
                <Button
                  label={submitting ? "Cancelling..." : "Cancel request"}
                  variant="ghost"
                  onPress={handleCancelRequest}
                />
              </Card>
            ) : (
              <>
                <OptionCard
                  icon="add-circle-outline"
                  title="Create an apartment"
                  description="Set up a new place and invite your roommates."
                  onPress={() => setMode("create")}
                />
                <OptionCard
                  icon="key-outline"
                  title="Join with an invite code"
                  description="Your roommate already set things up — request to join."
                  onPress={() => setMode("join")}
                />
              </>
            )}

            <View style={styles.logout}>
              <Button label="Log out" variant="ghost" icon="log-out-outline" onPress={handleLogout} />
            </View>
          </>
        )}

        {mode === "create" && (
          <>
            <Text style={styles.title}>Create your apartment</Text>
            <Text style={[styles.subtitle, { color: textMuted }]}>
              You&apos;ll get an invite code to share with your roommates.
            </Text>
            <View style={styles.form}>
              <TextField
                label="Apartment name"
                placeholder="e.g. Maple Street Flat"
                value={name}
                onChangeText={setName}
              />
              <TextField
                label="Address"
                placeholder="e.g. 12 Maple Street, Apt 4B"
                value={address}
                onChangeText={setAddress}
              />
            </View>
            {error && <Text style={[styles.formError, { color: danger }]}>{error}</Text>}
            <Button
              label={submitting ? "Creating..." : "Create apartment"}
              onPress={handleCreate}
            />
          </>
        )}

        {mode === "join" && (
          <>
            <Text style={styles.title}>Join an apartment</Text>
            <Text style={[styles.subtitle, { color: textMuted }]}>
              Ask a roommate for their invite code. Its owner will need to accept your request.
            </Text>
            <View style={styles.form}>
              <TextField
                label="Invite code"
                placeholder="e.g. MAPLE-7K2Q"
                autoCapitalize="characters"
                autoCorrect={false}
                value={code}
                onChangeText={setCode}
              />
            </View>
            {error && <Text style={[styles.formError, { color: danger }]}>{error}</Text>}
            <Button
              label={submitting ? "Sending request..." : "Request to join"}
              onPress={handleJoin}
            />
          </>
        )}
      </View>
    </Screen>
  );
}

function OptionCard({
  icon,
  title,
  description,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
}) {
  const primary = useThemeColor({}, "primary");
  const primaryMuted = useThemeColor({}, "primaryMuted");
  const textMuted = useThemeColor({}, "textMuted");

  return (
    <Pressable onPress={onPress}>
      <Card style={styles.optionCard}>
        <View style={[styles.optionIcon, { backgroundColor: primaryMuted }]}>
          <Ionicons name={icon} size={22} color={primary} />
        </View>
        <View style={styles.optionTexts}>
          <Text style={styles.optionTitle}>{title}</Text>
          <Text style={[styles.optionDescription, { color: textMuted }]}>{description}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={textMuted} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: {
    marginLeft: Spacing.md,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    alignSelf: "flex-start",
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold as any,
  },
  subtitle: {
    fontSize: FontSize.md,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  form: {
    marginTop: Spacing.md,
  },
  formError: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  optionTexts: {
    flex: 1,
  },
  optionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
  },
  optionDescription: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  pendingCard: {
    marginBottom: Spacing.lg,
  },
  pendingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  pendingTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
  },
  pendingBody: {
    fontSize: FontSize.sm,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  logout: {
    marginTop: Spacing.md,
  },
});
