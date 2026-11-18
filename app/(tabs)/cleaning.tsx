import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Text, useThemeColor } from "@/components/Themed";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Fab } from "@/components/ui/Fab";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { cleaningTasks, getRoommate, roommates } from "@/mocks/data";
import { Accent, FontSize, FontWeight, Radius, Spacing } from "@/constants/theme";
import type { TaskFrequency } from "@/types";

const frequencyLabel: Record<TaskFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
};

export default function CleaningScreen() {
  const textMuted = useThemeColor({}, "textMuted");
  const pendingCount = cleaningTasks.filter((t) => !t.done).length;

  return (
    <Screen edges={["top"]}>
      <ScreenHeader
        title="Cleaning"
        subtitle={`${pendingCount} task${pendingCount === 1 ? "" : "s"} left this week`}
        actionIcon="repeat-outline"
        onActionPress={() => Alert.alert("Rotation settings", "Not implemented yet.")}
      />

      <View style={styles.rotationRow}>
        <AvatarStack
          avatars={roommates.map((r) => ({ id: r.id, initials: r.initials, color: r.avatarColor }))}
          size={30}
        />
        <Text style={{ color: textMuted, marginLeft: Spacing.sm, fontSize: FontSize.sm }}>
          {roommates.length} roommates in the rotation
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {cleaningTasks.map((task) => {
          const assignee = getRoommate(task.assigneeId);
          return (
            <Card key={task.id} style={styles.taskCard}>
              <View style={[styles.taskIcon, { backgroundColor: `${Accent.cleaning}1F` }]}>
                <Ionicons name={task.icon as any} size={20} color={Accent.cleaning} />
              </View>

              <View style={styles.taskInfo}>
                <Text
                  style={[styles.taskTitle, task.done && styles.taskTitleDone]}
                  numberOfLines={1}>
                  {task.title}
                </Text>
                <View style={styles.taskMetaRow}>
                  {assignee && <Avatar initials={assignee.initials} color={assignee.avatarColor} size={18} />}
                  <Text style={{ color: textMuted, fontSize: FontSize.xs, marginLeft: Spacing.xs }}>
                    {assignee?.name} · {task.dueLabel}
                  </Text>
                </View>
              </View>

              <Chip
                label={task.done ? "Done" : frequencyLabel[task.frequency]}
                color={task.done ? Accent.success : Accent.cleaning}
              />
            </Card>
          );
        })}
      </ScrollView>

      <Fab comingSoonLabel="Adding a new task" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  rotationRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl + 56,
    gap: Spacing.md,
  },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
  },
  taskIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  taskInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  taskTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold as any,
  },
  taskTitleDone: {
    textDecorationLine: "line-through",
    opacity: 0.5,
  },
  taskMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
});
