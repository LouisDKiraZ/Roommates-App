import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Text, useThemeColor } from "@/components/Themed";
import { AvatarStack } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useAppState } from "@/context/AppStateContext";
import { calendarEvents, cleaningTasks, expenses, getRoommate } from "@/mocks/data";
import { Accent, FontSize, FontWeight, Radius, Spacing } from "@/constants/theme";

export default function HomeScreen() {
  const { apartment, currentUser } = useAppState();
  const textMuted = useThemeColor({}, "textMuted");
  const border = useThemeColor({}, "border");

  if (!apartment || !currentUser) return null;

  const nextTask = cleaningTasks.find((t) => !t.done);
  const latestExpense = expenses[0];
  const nextEvent = calendarEvents[0];

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScreenHeader
          title={`Hi, ${currentUser.name} 👋`}
          subtitle={apartment.name}
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
            value={nextTask ? nextTask.title : "All done!"}
            meta={nextTask ? nextTask.dueLabel : "Nothing pending"}
            onPress={() => router.push("/(tabs)/cleaning")}
          />
          <SummaryCard
            icon="wallet-outline"
            accent={Accent.expenses}
            label="Latest expense"
            value={`$${latestExpense.amount.toFixed(2)}`}
            meta={latestExpense.title}
            onPress={() => router.push("/(tabs)/expenses")}
          />
          <SummaryCard
            icon="calendar-outline"
            accent={Accent.calendar}
            label="Next event"
            value={nextEvent.title}
            meta={nextEvent.date}
            onPress={() => router.push("/(tabs)/calendar")}
          />
          <SummaryCard
            icon="people-outline"
            accent={Accent.success}
            label="Roommates"
            value={`${apartment.roommates.length} people`}
            meta="Manage apartment"
            onPress={() => router.push("/(tabs)/apartment")}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This week</Text>
          <Card style={[styles.weekCard, { borderColor: border }]}>
            {cleaningTasks.slice(0, 3).map((task, i) => {
              const assignee = getRoommate(task.assigneeId);
              return (
                <View
                  key={task.id}
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
                    {assignee?.name}
                  </Text>
                </View>
              );
            })}
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
});
