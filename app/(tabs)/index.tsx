import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Text, useThemeColor } from "@/components/Themed";
import { AvatarStack } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useAppState } from "@/context/AppStateContext";
import { assignTasksToRoommates } from "@/lib/cleaning";
import { Accent, FontSize, FontWeight, Radius, Spacing } from "@/constants/theme";
import { isEventActiveAt } from "@/lib/calendarRecurrence";

export default function HomeScreen() {
  const { apartment, currentUser, calendarEvents, cleaningTasks, expenses, toggleCleaningTask } =
    useAppState();
  const textMuted = useThemeColor({}, "textMuted");
  const border = useThemeColor({}, "border");

  // Presence is time-sensitive, so re-check once a minute while this screen
  // is mounted instead of only on the render that happened to load it.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const roommates = useMemo(() => apartment?.roommates ?? [], [apartment?.roommates]);

  const tasks = useMemo(
    () => assignTasksToRoommates(cleaningTasks, roommates),
    [cleaningTasks, roommates]
  );

  if (!apartment || !currentUser) return null;

  const nextTask = tasks.find((t) => !t.done);
  const latestExpense = expenses[0];

  const awayNow = apartment.roommates.filter((r) =>
    calendarEvents.some((e) => e.userId === r.id && isEventActiveAt(e, now))
  );
  const othersHomeNow = apartment.roommates.filter(
    (r) => r.id !== currentUser.id && !awayNow.some((a) => a.id === r.id)
  );

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader
          title={`Hi, ${currentUser.name} 👋`}
          subtitle={apartment.name}
          logo={require("@/assets/logo.jpg")}
          actionIcon="notifications-outline"
          onActionPress={() => Alert.alert("Notifications", "Nothing new yet.")}
        />

        <View style={styles.section}>
          <Card style={styles.apartmentCard}>
            <View style={styles.apartmentInfo}>
              <Text style={styles.apartmentName}>{apartment.name}</Text>
              <Text style={{ color: textMuted, fontSize: FontSize.sm }}>{apartment.address}</Text>
            </View>
            <AvatarStack
              avatars={apartment.roommates.map((r) => ({
                id: r.id,
                initials: r.initials,
                color: r.avatarColor,
              }))}
            />
          </Card>
        </View>

        <View style={[styles.grid, styles.section]}>
          <SummaryCard
            icon="sparkles-outline"
            accent={Accent.cleaning}
            label="Next chore"
            value={nextTask ? nextTask.title : tasks.length === 0 ? "No chores yet" : "All done!"}
            meta={nextTask ? nextTask.dueLabel : tasks.length === 0 ? "Nothing scheduled" : "Nothing pending"}
            onPress={() => router.push("/(tabs)/cleaning")}
          />
          <SummaryCard
            icon="wallet-outline"
            accent={Accent.expenses}
            label="Latest expense"
            value={latestExpense ? `$${latestExpense.amount.toFixed(2)}` : "No expenses yet"}
            meta={latestExpense ? latestExpense.title : "Nothing logged"}
            onPress={() => router.push("/(tabs)/expenses")}
          />
          <SummaryCard
            icon={othersHomeNow.length > 0 ? "people-outline" : "person-outline"}
            accent={Accent.calendar}
            label="Right now"
            value={othersHomeNow.length === 0 ? "You're alone" : `${othersHomeNow.length} home`}
            meta={awayNow.length === 0 ? "Everyone's in" : `${awayNow.length} away`}
            onPress={() => router.push("/(tabs)/calendar")}
          />
          <SummaryCard
            icon="people-outline"
            accent={Accent.success}
            label="Roommates"
            value={`${apartment.roommates.length} ${apartment.roommates.length === 1 ? "person" : "people"}`}
            meta="Manage apartment"
            onPress={() => router.push("/(tabs)/apartment")}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This week</Text>
          <Card style={[styles.weekCard, { borderColor: border }]}>
            {tasks.length === 0 ? (
              <View style={styles.emptyWeek}>
                <Ionicons name="sparkles-outline" size={24} color={textMuted} />
                <Text style={[styles.emptyWeekText, { color: textMuted }]}>
                  No chores yet this week
                </Text>
              </View>
            ) : (
              tasks.slice(0, 3).map((task, i) => {
                const assignee = apartment.roommates.find((r) => r.id === task.assigneeId);
                const assigneeName = assignee ? (assignee.isYou ? "You" : assignee.name) : "Unassigned";
                return (
                  <Pressable
                    key={task.id}
                    onPress={() => toggleCleaningTask(task.id)}
                    style={[
                      styles.weekRow,
                      i > 0 && { borderTopWidth: 1, borderTopColor: border },
                    ]}>
                    <Ionicons
                      name={task.done ? "checkmark-circle" : "ellipse-outline"}
                      size={20}
                      color={task.done ? Accent.success : textMuted}
                    />
                    <Text style={[styles.weekTaskTitle, task.done && styles.weekTaskDone]}>
                      {task.title}
                    </Text>
                    <Text style={{ color: textMuted, fontSize: FontSize.xs }}>
                      {assigneeName}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
}

function SummaryCard({
  icon,
  accent,
  label,
  value,
  meta,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  label: string;
  value: string;
  meta: string;
  onPress: () => void;
}) {
  const textMuted = useThemeColor({}, "textMuted");

  return (
    <Pressable style={styles.summaryCard} onPress={onPress}>
      <Card>
        <View style={[styles.summaryIcon, { backgroundColor: `${accent}1F` }]}>
          <Ionicons name={icon} size={20} color={accent} />
        </View>
        <Text style={[styles.summaryLabel, { color: textMuted }]}>{label}</Text>
        <Text style={styles.summaryValue} numberOfLines={1}>
          {value}
        </Text>
        <Text style={[styles.summaryMeta, { color: textMuted }]} numberOfLines={1}>
          {meta}
        </Text>
      </Card>
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
  apartmentCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  apartmentInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  apartmentName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  summaryCard: {
    width: "48%",
    marginBottom: Spacing.md,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  summaryLabel: {
    fontSize: FontSize.xs,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
  },
  summaryMeta: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold as any,
    marginBottom: Spacing.md,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  weekCard: {
    padding: 0,
    overflow: "hidden",
  },
  weekRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  weekTaskTitle: {
    flex: 1,
    fontSize: FontSize.sm,
  },
  weekTaskDone: {
    textDecorationLine: "line-through",
    opacity: 0.5,
  },
  emptyWeek: {
    padding: Spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWeekText: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
});
