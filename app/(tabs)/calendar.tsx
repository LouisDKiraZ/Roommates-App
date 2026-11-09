import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Text, useThemeColor } from "@/components/Themed";
import { AvatarStack } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Fab } from "@/components/ui/Fab";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { calendarEvents, getRoommate, today } from "@/mocks/data";
import { Accent, FontSize, FontWeight, Radius, Spacing } from "@/constants/theme";
import { getMonthGrid, MONTH_LABELS, WEEKDAY_LABELS } from "@/lib/calendarGrid";
import type { CalendarEventSource } from "@/types";

const [todayYear, todayMonth] = today.split("-").map(Number);
const weeks = getMonthGrid(todayYear, todayMonth - 1);

const sourceMeta: Record<CalendarEventSource, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  local: { label: "Roomly", icon: "home-outline" },
  google: { label: "Google", icon: "logo-google" },
  apple: { label: "Apple", icon: "logo-apple" },
};

export default function CalendarScreen() {
  const textMuted = useThemeColor({}, "textMuted");
  const border = useThemeColor({}, "border");
  const upcoming = calendarEvents.filter((e) => e.date >= today).sort((a, b) => (a.date < b.date ? -1 : 1));

  function eventsOn(iso: string) {
    return calendarEvents.filter((e) => e.date === iso);
  }

  return (
    <Screen edges={["top"]}>
      <ScreenHeader title="Calendar" subtitle={`${MONTH_LABELS[todayMonth - 1]} ${todayYear}`} />

      <View style={styles.syncRow}>
        <SyncPill
          label="Google Calendar"
          icon="logo-google"
          color={Accent.google}
          onPress={() => Alert.alert("Connect Google Calendar", "Not implemented yet.")}
        />
        <SyncPill
          label="Apple Calendar"
          icon="logo-apple"
          color={Accent.apple}
          onPress={() => Alert.alert("Connect Apple Calendar", "Not implemented yet.")}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.gridCard}>
          <View style={styles.weekRow}>
            {WEEKDAY_LABELS.map((label) => (
              <Text key={label} style={[styles.weekdayLabel, { color: textMuted }]}>
                {label}
              </Text>
            ))}
          </View>

          {weeks.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {week.map((cell, ci) => {
                if (!cell) return <View key={ci} style={styles.dayCell} />;
                const isToday = cell.iso === today;
                const dayEvents = eventsOn(cell.iso);
                return (
                  <View key={ci} style={styles.dayCell}>
                    <View style={[styles.dayNumberWrap, isToday && { backgroundColor: Accent.calendar }]}>
                      <Text style={[styles.dayNumber, isToday && styles.dayNumberToday]}>{cell.day}</Text>
                    </View>
                    <View style={styles.dotsRow}>
                      {dayEvents.slice(0, 3).map((e) => (
                        <View key={e.id} style={[styles.dot, { backgroundColor: e.color }]} />
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </Card>

        <Text style={styles.sectionTitle}>Upcoming</Text>
        <View style={{ gap: Spacing.md }}>
          {upcoming.map((event) => {
            const meta = sourceMeta[event.source];
            return (
              <Card key={event.id} style={styles.eventCard}>
                <View style={[styles.eventBar, { backgroundColor: event.color }]} />
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={{ color: textMuted, fontSize: FontSize.xs, marginTop: 2 }}>
                    {event.date}
                    {event.time ? ` · ${event.time}` : ""}
                  </Text>
                  <View style={[styles.eventFooter, { borderTopColor: border }]}>
                    <AvatarStack
                      avatars={event.attendeeIds.map((id) => {
                        const r = getRoommate(id);
                        return { id, initials: r?.initials ?? "?", color: r?.avatarColor ?? "#999" };
                      })}
                      size={20}
                    />
                    <Chip label={meta.label} color={event.color} />
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      </ScrollView>

      <Fab comingSoonLabel="Adding an event" />
    </Screen>
  );
}

function SyncPill({
  label,
  icon,
  color,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.syncPill, { borderColor: `${color}55` }]}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.syncPillLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  syncRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  syncPill: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  syncPillLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold as any,
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl + 56,
  },
  gridCard: {
    marginBottom: Spacing.lg,
  },
  weekRow: {
    flexDirection: "row",
  },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium as any,
    marginBottom: Spacing.sm,
  },
  dayCell: {
    flex: 1,
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  dayNumberWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumber: {
    fontSize: FontSize.sm,
  },
  dayNumberToday: {
    color: "#FFFFFF",
    fontWeight: FontWeight.bold as any,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 3,
    marginTop: 3,
    height: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold as any,
    marginBottom: Spacing.md,
  },
  eventCard: {
    flexDirection: "row",
    padding: 0,
    overflow: "hidden",
  },
  eventBar: {
    width: 5,
  },
  eventInfo: {
    flex: 1,
    padding: Spacing.lg,
  },
  eventTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold as any,
  },
  eventFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
});
