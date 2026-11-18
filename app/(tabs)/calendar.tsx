import { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Text, useThemeColor } from "@/components/Themed";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Fab } from "@/components/ui/Fab";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { TextField } from "@/components/ui/TextField";
import { useAppState } from "@/context/AppStateContext";
import { Accent, FontSize, FontWeight, Radius, Spacing } from "@/constants/theme";
import { getMonthGrid, MONTH_LABELS, WEEKDAY_LABELS } from "@/lib/calendarGrid";
import {
  eventOccursOnDate,
  eventsOnDate,
  isEventActiveAt,
  parseISODate,
  RECURRENCE_LABELS,
  RECURRENCE_OPTIONS,
  toISODate,
} from "@/lib/calendarRecurrence";
import type { CalendarProvider, EventRecurrence, EventSource, Roommate } from "@/types";

const todayIso = toISODate(new Date());

const sourceMeta: Record<
  EventSource,
  { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  local: { label: "Roomly", icon: "home-outline", color: Accent.calendar },
  google: { label: "Google", icon: "logo-google", color: Accent.google },
  apple: { label: "Apple", icon: "logo-apple", color: Accent.apple },
  outlook: { label: "Outlook", icon: "logo-microsoft", color: Accent.outlook },
  samsung: { label: "Samsung", icon: "phone-portrait-outline", color: Accent.samsung },
};

const CALENDAR_PROVIDERS: CalendarProvider[] = ["google", "apple", "outlook", "samsung"];

function formatLongDate(iso: string): string {
  const d = parseISODate(iso);
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
  return `${weekday} ${d.getDate()} ${MONTH_LABELS[d.getMonth()].slice(0, 3)}`;
}

export default function CalendarScreen() {
  const {
    apartment,
    currentUser,
    calendarEvents,
    calendarConnections,
    addCalendarEvent,
    removeCalendarEvent,
    setCalendarPrivacy,
    connectCalendarProvider,
    disconnectCalendarProvider,
  } = useAppState();

  const textMuted = useThemeColor({}, "textMuted");
  const border = useThemeColor({}, "border");
  const card = useThemeColor({}, "card");

  const [monthAnchor, setMonthAnchor] = useState(() => new Date());
  const [selectedDateIso, setSelectedDateIso] = useState(todayIso);
  const [selectedPersonId, setSelectedPersonId] = useState<"all" | string>("all");

  const [addEventVisible, setAddEventVisible] = useState(false);
  const [eventDate, setEventDate] = useState(todayIso);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [recurrence, setRecurrence] = useState<EventRecurrence>("none");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [connectProvider, setConnectProvider] = useState<CalendarProvider | null>(null);
  const [accountLabel, setAccountLabel] = useState("");
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  if (!apartment || !currentUser) return null;

  const viewYear = monthAnchor.getFullYear();
  const viewMonth0 = monthAnchor.getMonth();
  const weeks = getMonthGrid(viewYear, viewMonth0);

  function roommatesAbsentOn(iso: string): Roommate[] {
    return apartment!.roommates.filter((r) =>
      calendarEvents.some((e) => e.userId === r.id && eventOccursOnDate(e, iso))
    );
  }

  function personHasEventOn(personId: string, iso: string): boolean {
    return calendarEvents.some((e) => e.userId === personId && eventOccursOnDate(e, iso));
  }

  function shiftMonth(delta: number) {
    setMonthAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  const now = new Date();
  const awayNow = apartment.roommates.filter((r) =>
    calendarEvents.some((e) => e.userId === r.id && isEventActiveAt(e, now))
  );
  const othersHomeNow = apartment.roommates.filter(
    (r) => r.id !== currentUser.id && !awayNow.some((a) => a.id === r.id)
  );

  function openAddEvent() {
    setEventDate(selectedDateIso);
    setTitle("");
    setDescription("");
    setStartTime("09:00");
    setEndTime("17:00");
    setRecurrence("none");
    setFormError(null);
    setAddEventVisible(true);
  }

  function shiftEventDate(deltaDays: number) {
    const d = parseISODate(eventDate);
    d.setDate(d.getDate() + deltaDays);
    setEventDate(toISODate(d));
  }

  async function handleSubmitEvent() {
    setFormError(null);
    setSubmitting(true);
    try {
      await addCalendarEvent({ title, description, startDate: eventDate, startTime, endTime, recurrence });
      setAddEventVisible(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Couldn't add that event.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleDeleteEvent(eventId: string) {
    Alert.alert("Delete event", "Remove this event from your schedule?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await removeCalendarEvent(eventId);
          } catch (err) {
            Alert.alert("Couldn't delete that event", err instanceof Error ? err.message : undefined);
          }
        },
      },
    ]);
  }

  async function handleTogglePrivacy(value: boolean) {
    try {
      await setCalendarPrivacy(value);
    } catch (err) {
      Alert.alert("Couldn't update privacy", err instanceof Error ? err.message : undefined);
    }
  }

  function openConnect(provider: CalendarProvider) {
    setConnectProvider(provider);
    setAccountLabel("");
    setConnectError(null);
  }

  async function handleConnect() {
    if (!connectProvider) return;
    setConnectError(null);
    setConnecting(true);
    try {
      await connectCalendarProvider(connectProvider, accountLabel);
      setConnectProvider(null);
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "Couldn't connect that calendar.");
    } finally {
      setConnecting(false);
    }
  }

  function handlePillPress(provider: CalendarProvider) {
    const connection = calendarConnections.find((c) => c.provider === provider);
    const meta = sourceMeta[provider];
    if (connection) {
      Alert.alert(
        `${meta.label} Calendar`,
        `Connected as ${connection.accountLabel}. This is a simulated connection for this demo — there's no backend to run a real sync against, so no real account was contacted.`,
        [
          { text: "Close", style: "cancel" },
          {
            text: "Disconnect",
            style: "destructive",
            onPress: () =>
              disconnectCalendarProvider(provider).catch((err) =>
                Alert.alert("Couldn't disconnect", err instanceof Error ? err.message : undefined)
              ),
          },
        ]
      );
    } else {
      openConnect(provider);
    }
  }

  const selectedPerson =
    selectedPersonId === "all" ? null : apartment.roommates.find((r) => r.id === selectedPersonId) ?? null;
  const isSelfSelected = selectedPerson?.id === currentUser.id;
  const canSeeSelectedDetails = !selectedPerson || isSelfSelected || !selectedPerson.calendarPrivate;
  const absentToday = roommatesAbsentOn(selectedDateIso);
  const selectedPersonEvents = selectedPerson
    ? eventsOnDate(calendarEvents.filter((e) => e.userId === selectedPerson!.id), selectedDateIso)
    : [];

  return (
    <Screen edges={["top"]}>
      <ScreenHeader title="Calendar" subtitle="Who's in, who's out" />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.presenceCard}>
          <Ionicons
            name={othersHomeNow.length > 0 ? "people" : "person"}
            size={20}
            color={Accent.calendar}
          />
          <View style={{ flex: 1, marginLeft: Spacing.md }}>
            <Text style={styles.presenceTitle}>
              {othersHomeNow.length === 0
                ? "You're alone right now"
                : `${othersHomeNow.length} roommate${othersHomeNow.length > 1 ? "s" : ""} home with you`}
            </Text>
            <Text style={{ color: textMuted, fontSize: FontSize.xs, marginTop: 2 }}>
              {awayNow.length === 0
                ? "Everyone's in."
                : `${awayNow.map((r) => (r.isYou ? "You" : r.name)).join(", ")} ${awayNow.length > 1 ? "are" : "is"} out.`}
            </Text>
          </View>
        </Card>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.personRow}>
          <PersonChip
            label="Everyone"
            selected={selectedPersonId === "all"}
            onPress={() => setSelectedPersonId("all")}
          />
          {apartment.roommates.map((r) => (
            <PersonChip
              key={r.id}
              label={r.isYou ? "You" : r.name}
              color={r.avatarColor}
              selected={selectedPersonId === r.id}
              onPress={() => setSelectedPersonId(r.id)}
            />
          ))}
        </ScrollView>

        <Card style={styles.gridCard}>
          <View style={styles.monthNavRow}>
            <Pressable onPress={() => shiftMonth(-1)} style={styles.monthNavButton}>
              <Ionicons name="chevron-back" size={20} color={textMuted} />
            </Pressable>
            <Pressable onPress={() => setMonthAnchor(new Date())}>
              <Text style={styles.monthLabel}>
                {MONTH_LABELS[viewMonth0]} {viewYear}
              </Text>
            </Pressable>
            <Pressable onPress={() => shiftMonth(1)} style={styles.monthNavButton}>
              <Ionicons name="chevron-forward" size={20} color={textMuted} />
            </Pressable>
          </View>

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
                const isToday = cell.iso === todayIso;
                const isSelected = cell.iso === selectedDateIso;
                const absent = selectedPersonId === "all" ? roommatesAbsentOn(cell.iso) : [];
                const hasEvent =
                  selectedPersonId !== "all" && personHasEventOn(selectedPersonId, cell.iso);
                return (
                  <Pressable
                    key={ci}
                    style={styles.dayCell}
                    onPress={() => setSelectedDateIso(cell.iso)}>
                    <View
                      style={[
                        styles.dayNumberWrap,
                        isToday && { backgroundColor: Accent.calendar },
                        !isToday && isSelected && { borderWidth: 1.5, borderColor: Accent.calendar },
                      ]}>
                      <Text style={[styles.dayNumber, isToday && styles.dayNumberToday]}>{cell.day}</Text>
                    </View>
                    <View style={styles.dotsRow}>
                      {selectedPersonId === "all"
                        ? absent.slice(0, 3).map((r) => (
                            <View key={r.id} style={[styles.miniAvatar, { backgroundColor: r.avatarColor }]}>
                              <Text style={styles.miniAvatarText}>{r.initials[0]}</Text>
                            </View>
                          ))
                        : hasEvent && <View style={[styles.dot, { backgroundColor: Accent.calendar }]} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </Card>

        <Text style={styles.sectionTitle}>{formatLongDate(selectedDateIso)}</Text>

        {selectedPersonId === "all" ? (
          <View style={{ gap: Spacing.md }}>
            {absentToday.length === 0 ? (
              <Card>
                <Text style={{ color: textMuted }}>Nobody&apos;s away this day.</Text>
              </Card>
            ) : (
              absentToday.map((r) => {
                const times = eventsOnDate(
                  calendarEvents.filter((e) => e.userId === r.id),
                  selectedDateIso
                );
                return (
                  <Card key={r.id} style={styles.absentRow}>
                    <Avatar initials={r.initials} color={r.avatarColor} size={32} />
                    <View style={{ flex: 1, marginLeft: Spacing.md }}>
                      <Text style={styles.absentName}>{r.isYou ? "You" : r.name}</Text>
                      <Text style={{ color: textMuted, fontSize: FontSize.xs, marginTop: 2 }}>
                        {times.map((t) => `${t.startTime}–${t.endTime}`).join(", ")}
                      </Text>
                    </View>
                  </Card>
                );
              })
            )}
          </View>
        ) : (
          <View style={{ gap: Spacing.md }}>
            {isSelfSelected && (
              <Card style={styles.privacyCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.privacyTitle}>Keep my calendar private</Text>
                  <Text style={{ color: textMuted, fontSize: FontSize.xs, marginTop: 2 }}>
                    Roommates still see when you&apos;re away — never the title or description.
                  </Text>
                </View>
                <Switch value={!!selectedPerson?.calendarPrivate} onValueChange={handleTogglePrivacy} />
              </Card>
            )}

            {isSelfSelected && (
              <Card>
                <Text style={styles.connectTitle}>Connect a personal calendar</Text>
                <Text style={{ color: textMuted, fontSize: FontSize.xs, marginTop: 2, marginBottom: Spacing.md }}>
                  Demo mode — this simulates a sync, no real account is contacted, but it respects your
                  privacy setting above like any other event.
                </Text>
                <View style={styles.syncRow}>
                  {CALENDAR_PROVIDERS.map((provider) => {
                    const meta = sourceMeta[provider];
                    const connected = calendarConnections.some((c) => c.provider === provider);
                    return (
                      <SyncPill
                        key={provider}
                        label={meta.label}
                        icon={meta.icon}
                        color={meta.color}
                        connected={connected}
                        onPress={() => handlePillPress(provider)}
                      />
                    );
                  })}
                </View>
              </Card>
            )}

            {!canSeeSelectedDetails && (
              <View style={styles.lockedNotice}>
                <Ionicons name="lock-closed-outline" size={14} color={textMuted} />
                <Text style={{ color: textMuted, fontSize: FontSize.xs, marginLeft: Spacing.xs }}>
                  {selectedPerson?.name}&apos;s calendar is private — only busy times are shown.
                </Text>
              </View>
            )}

            {selectedPersonEvents.length === 0 ? (
              <Card>
                <Text style={{ color: textMuted }}>No events this day.</Text>
              </Card>
            ) : (
              selectedPersonEvents.map((event) => {
                const meta = sourceMeta[event.source];
                return (
                  <Card key={event.id} style={styles.eventCard}>
                    <View style={[styles.eventBar, { backgroundColor: meta.color }]} />
                    <View style={styles.eventInfo}>
                      <View style={styles.eventTitleRow}>
                        <Text style={styles.eventTitle}>
                          {canSeeSelectedDetails ? event.title : "Busy"}
                        </Text>
                        {isSelfSelected && (
                          <Pressable onPress={() => handleDeleteEvent(event.id)} hitSlop={8}>
                            <Ionicons name="trash-outline" size={18} color={textMuted} />
                          </Pressable>
                        )}
                      </View>
                      {canSeeSelectedDetails && event.description ? (
                        <Text style={{ color: textMuted, fontSize: FontSize.xs, marginTop: 2 }}>
                          {event.description}
                        </Text>
                      ) : null}
                      <View style={[styles.eventFooter, { borderTopColor: border }]}>
                        <Text style={{ color: textMuted, fontSize: FontSize.xs }}>
                          {event.startTime}–{event.endTime} · {RECURRENCE_LABELS[event.recurrence]}
                        </Text>
                        <View style={styles.sourceTag}>
                          <Ionicons name={meta.icon} size={14} color={meta.color} />
                          <Text style={{ color: meta.color, fontSize: FontSize.xs, marginLeft: 4 }}>
                            {meta.label}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Card>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      <Fab onPress={openAddEvent} />

      <Modal visible={addEventVisible} animationType="slide" transparent onRequestClose={() => setAddEventVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: card }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add an event</Text>
              <Pressable onPress={() => setAddEventVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={textMuted} />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalBody}>
              <View style={styles.dateStepperRow}>
                <Pressable onPress={() => shiftEventDate(-1)} style={styles.monthNavButton}>
                  <Ionicons name="chevron-back" size={18} color={textMuted} />
                </Pressable>
                <Text style={styles.dateStepperLabel}>{formatLongDate(eventDate)}</Text>
                <Pressable onPress={() => shiftEventDate(1)} style={styles.monthNavButton}>
                  <Ionicons name="chevron-forward" size={18} color={textMuted} />
                </Pressable>
              </View>

              <TextField label="Title" placeholder="e.g. Work" value={title} onChangeText={setTitle} />
              <TextField
                label="Description"
                placeholder="What are you up to? (optional)"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
              <View style={styles.timeRow}>
                <View style={{ flex: 1 }}>
                  <TextField
                    label="Start time"
                    placeholder="09:00"
                    value={startTime}
                    onChangeText={setStartTime}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <View style={{ width: Spacing.md }} />
                <View style={{ flex: 1 }}>
                  <TextField
                    label="End time"
                    placeholder="17:00"
                    value={endTime}
                    onChangeText={setEndTime}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <Text style={styles.label}>Repeat</Text>
              <View style={styles.recurrenceRow}>
                {RECURRENCE_OPTIONS.map((opt) => (
                  <RecurrenceChip
                    key={opt}
                    label={RECURRENCE_LABELS[opt]}
                    selected={recurrence === opt}
                    onPress={() => setRecurrence(opt)}
                  />
                ))}
              </View>

              {formError && (
                <Text style={{ color: Accent.danger, fontSize: FontSize.sm, marginTop: Spacing.sm }}>
                  {formError}
                </Text>
              )}

              <View style={{ marginTop: Spacing.lg }}>
                <Button label={submitting ? "Adding..." : "Add event"} onPress={handleSubmitEvent} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={connectProvider !== null}
        animationType="slide"
        transparent
        onRequestClose={() => setConnectProvider(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: card }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {connectProvider ? `Connect ${sourceMeta[connectProvider].label} Calendar` : ""}
              </Text>
              <Pressable onPress={() => setConnectProvider(null)} hitSlop={8}>
                <Ionicons name="close" size={22} color={textMuted} />
              </Pressable>
            </View>
            <View style={styles.modalBody}>
              <Text style={{ color: textMuted, fontSize: FontSize.sm, marginBottom: Spacing.lg }}>
                There&apos;s no backend here to run a real sync against, so this simulates connecting
                the account below: it&apos;ll add a few sample busy times to your schedule, tagged as
                coming from {connectProvider ? sourceMeta[connectProvider].label : ""}.
              </Text>
              <TextField
                label="Account"
                placeholder="e.g. you@example.com"
                value={accountLabel}
                onChangeText={setAccountLabel}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {connectError && (
                <Text style={{ color: Accent.danger, fontSize: FontSize.sm, marginBottom: Spacing.sm }}>
                  {connectError}
                </Text>
              )}
              <Button label={connecting ? "Connecting..." : "Connect"} onPress={handleConnect} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function PersonChip({
  label,
  color,
  selected,
  onPress,
}: {
  label: string;
  color?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const primary = useThemeColor({}, "primary");
  const primaryMuted = useThemeColor({}, "primaryMuted");
  const border = useThemeColor({}, "border");
  const text = useThemeColor({}, "text");

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.personChip,
        { borderColor: selected ? primary : border, backgroundColor: selected ? primaryMuted : "transparent" },
      ]}>
      {color && <View style={[styles.personDot, { backgroundColor: color }]} />}
      <Text style={[styles.personChipLabel, { color: selected ? primary : text }]}>{label}</Text>
    </Pressable>
  );
}

function RecurrenceChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const primary = useThemeColor({}, "primary");
  const primaryMuted = useThemeColor({}, "primaryMuted");
  const border = useThemeColor({}, "border");
  const text = useThemeColor({}, "text");

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.recurrenceChip,
        { borderColor: selected ? primary : border, backgroundColor: selected ? primaryMuted : "transparent" },
      ]}>
      <Text style={[styles.recurrenceChipLabel, { color: selected ? primary : text }]}>{label}</Text>
    </Pressable>
  );
}

function SyncPill({
  label,
  icon,
  color,
  connected,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  connected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.syncPill, { borderColor: `${color}55` }]}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.syncPillLabel, { color }]}>{label}</Text>
      {connected && <Ionicons name="checkmark-circle" size={14} color={Accent.success} style={{ marginLeft: 4 }} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl + 56,
    gap: Spacing.md,
  },
  presenceCard: {
    flexDirection: "row",
    alignItems: "center",
  },
  presenceTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
  },
  personRow: {
    gap: Spacing.sm,
    paddingVertical: 2,
  },
  personChip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  personDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  personChipLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium as any,
  },
  gridCard: {},
  monthNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  monthNavButton: {
    padding: Spacing.xs,
  },
  monthLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold as any,
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
    gap: 2,
    marginTop: 3,
    height: 10,
    justifyContent: "center",
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  miniAvatar: {
    width: 10,
    height: 10,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  miniAvatarText: {
    color: "#FFFFFF",
    fontSize: 6,
    fontWeight: FontWeight.bold as any,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold as any,
  },
  absentRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  absentName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold as any,
  },
  privacyCard: {
    flexDirection: "row",
    alignItems: "center",
  },
  privacyTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold as any,
  },
  connectTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold as any,
  },
  syncRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  syncPill: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  syncPillLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold as any,
    marginLeft: Spacing.xs,
  },
  lockedNotice: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xs,
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
  eventTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  sourceTag: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    maxHeight: "85%",
    paddingTop: Spacing.lg,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold as any,
  },
  modalBody: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  dateStepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  dateStepperLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
  },
  timeRow: {
    flexDirection: "row",
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium as any,
    marginBottom: Spacing.sm,
    opacity: 0.8,
  },
  recurrenceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  recurrenceChip: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  recurrenceChipLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold as any,
  },
});
