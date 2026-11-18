import { useState } from "react";
import { Alert, Pressable, ScrollView, Share, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Text, useThemeColor } from "@/components/Themed";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useAppState } from "@/context/AppStateContext";
import { Accent, FontSize, FontWeight, Spacing } from "@/constants/theme";
import type { IncomingJoinRequest } from "@/types";

export default function ApartmentScreen() {
  const { apartment, currentUser, logout, incomingJoinRequests, respondToJoinRequest } =
    useAppState();
  const textMuted = useThemeColor({}, "textMuted");
  const border = useThemeColor({}, "border");

  const [respondingId, setRespondingId] = useState<string | null>(null);

  if (!apartment || !currentUser) return null;

  const isOwner = apartment.ownerId === currentUser.id;

  async function handleShareInvite() {
    if (!apartment) return;
    const message = `Join "${apartment.name}" on Roomly! Use invite code: ${apartment.inviteCode}`;
    try {
      await Share.share({ message });
      return;
    } catch {
      // react-native-web's Share isn't backed by a real browser API — fall
      // through to a clipboard copy below.
    }

    try {
      const clipboard = typeof navigator !== "undefined" ? navigator.clipboard : undefined;
      if (!clipboard) throw new Error("Clipboard unavailable");
      await clipboard.writeText(message);
      Alert.alert("Copied!", "Invite message copied to your clipboard.");
    } catch {
      // Clipboard access can also be denied (permissions, non-secure
      // context, etc.) — last resort is just showing the code to copy by hand.
      Alert.alert("Invite code", apartment.inviteCode);
    }
  }

  async function handleLogout() {
    await logout();
    router.replace("/(auth)/welcome");
  }

  async function handleRespond(request: IncomingJoinRequest, accept: boolean) {
    setRespondingId(request.id);
    try {
      await respondToJoinRequest(request.id, accept);
    } catch (err) {
      Alert.alert("Couldn't update that request", err instanceof Error ? err.message : undefined);
    } finally {
      setRespondingId(null);
    }
  }

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader title="Apartment" subtitle={apartment.name} />

        <View style={styles.section}>
          <Card>
            <View style={styles.row}>
              <Ionicons name="location-outline" size={18} color={textMuted} />
              <Text style={{ color: textMuted, marginLeft: Spacing.sm, flex: 1 }}>
                {apartment.address}
              </Text>
              <Pressable onPress={() => Alert.alert("Edit apartment", "Not implemented yet.")}>
                <Text style={styles.editLink}>Edit</Text>
              </Pressable>
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invite roommates</Text>
          <Card>
            <Text style={{ color: textMuted, fontSize: FontSize.sm }}>Invite code</Text>
            <Text style={styles.inviteCode}>{apartment.inviteCode}</Text>
            <Button label="Share invite" icon="share-outline" onPress={handleShareInvite} />
          </Card>
        </View>

        {isOwner && incomingJoinRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Join requests</Text>
            <Card style={styles.listCard}>
              {incomingJoinRequests.map((request, i) => (
                <View
                  key={request.id}
                  style={[
                    styles.requestRow,
                    i > 0 && { borderTopWidth: 1, borderTopColor: border },
                  ]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultName}>{request.requesterName}</Text>
                    <Text style={{ color: textMuted, fontSize: FontSize.xs }}>
                      @{request.requesterUsername}
                    </Text>
                  </View>
                  <View style={styles.requestActions}>
                    <Pressable
                      onPress={() => handleRespond(request, false)}
                      disabled={respondingId === request.id}
                      style={styles.declineButton}>
                      <Text style={{ color: textMuted, fontSize: FontSize.sm }}>Decline</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleRespond(request, true)}
                      disabled={respondingId === request.id}
                      style={styles.acceptButton}>
                      <Text style={styles.acceptButtonLabel}>Accept</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </Card>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Roommates ({apartment.roommates.length})</Text>
          <Card style={styles.listCard}>
            {apartment.roommates.map((roommate, i) => (
              <View
                key={roommate.id}
                style={[styles.roommateRow, i > 0 && { borderTopWidth: 1, borderTopColor: border }]}>
                <Avatar initials={roommate.initials} color={roommate.avatarColor} size={38} />
                <Text style={styles.roommateName}>{roommate.name}</Text>
                {roommate.id === apartment.ownerId && <Chip label="Owner" color={Accent.expenses} />}
                {roommate.id === currentUser.id && <Chip label="You" color={Accent.calendar} />}
              </View>
            ))}
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <Card style={styles.listCard}>
            <SettingsRow
              icon="notifications-outline"
              label="Notifications"
              onPress={() => Alert.alert("Notifications", "Not implemented yet.")}
            />
            <View style={[styles.divider, { borderTopColor: border }]} />
            <SettingsRow
              icon="color-palette-outline"
              label="Appearance"
              onPress={() => Alert.alert("Appearance", "Not implemented yet.")}
            />
          </Card>
        </View>

        <View style={styles.section}>
          <Button label="Log out" variant="ghost" icon="log-out-outline" onPress={handleLogout} />
        </View>
      </ScrollView>
    </Screen>
  );
}

function SettingsRow({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const textMuted = useThemeColor({}, "textMuted");

  return (
    <Pressable onPress={onPress} style={styles.settingsRow}>
      <Ionicons name={icon} size={18} color={textMuted} />
      <Text style={styles.settingsLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: Spacing.xxl,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold as any,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  editLink: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold as any,
  },
  inviteCode: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold as any,
    letterSpacing: 2,
    marginVertical: Spacing.sm,
  },
  listCard: {
    padding: 0,
    overflow: "hidden",
  },
  requestRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  requestActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  resultName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium as any,
  },
  declineButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  acceptButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 999,
    backgroundColor: Accent.success,
  },
  acceptButtonLabel: {
    color: "#FFFFFF",
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold as any,
  },
  roommateRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  roommateName: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium as any,
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  settingsLabel: {
    flex: 1,
    fontSize: FontSize.sm,
  },
  divider: {
    borderTopWidth: 1,
  },
});
