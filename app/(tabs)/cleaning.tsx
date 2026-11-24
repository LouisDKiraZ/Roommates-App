import { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";

import { Text, useThemeColor } from "@/components/Themed";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Fab } from "@/components/ui/Fab";
import { PersonChip } from "@/components/ui/PersonChip";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { TextField } from "@/components/ui/TextField";
import { useAppState } from "@/context/AppStateContext";
import {
  assignTasksToRoommates,
  filterTasksByRoommate,
} from "@/lib/cleaning";
import { Accent, FontSize, FontWeight, Radius, Spacing } from "@/constants/theme";
import type { TaskFrequency } from "@/types";

const frequencyLabel: Record<TaskFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
};

const CHORE_ICONS = [
  { icon: "sparkles-outline", label: "Clean" },
  { icon: "restaurant-outline", label: "Kitchen" },
  { icon: "trash-outline", label: "Trash" },
  { icon: "water-outline", label: "Bathroom" },
  { icon: "bed-outline", label: "Bedroom" },
  { icon: "leaf-outline", label: "Plants" },
];

type StatusFilter = "all" | "pending" | "completed";

export default function CleaningScreen() {
  const {
    apartment,
    currentUser,
    cleaningTasks,
    addCleaningTask,
    toggleCleaningTask,
    rotateCleaningTasks,
    removeCleaningTask,
  } = useAppState();
  const textMuted = useThemeColor({}, "textMuted");
  const card = useThemeColor({}, "card");
  const border = useThemeColor({}, "border");
  const primary = useThemeColor({}, "primary");
  const primaryMuted = useThemeColor({}, "primaryMuted");
  const text = useThemeColor({}, "text");

  const roommates = useMemo(() => apartment?.roommates ?? [], [apartment?.roommates]);
  const [selectedPersonId, setSelectedPersonId] = useState<"all" | string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Original Custom Modal Form States
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [assignedRoommate, setAssignedRoommate] = useState("");
  const [dueDate, setDueDate] = useState("Today");
  const [isRecurring, setIsRecurring] = useState(true);
  const [frequency, setFrequency] = useState<number>(7); // Days between recurrences (1 to 30)
  const [rotationPool, setRotationPool] = useState<string[]>([]);
  const [taskIcon, setTaskIcon] = useState("sparkles-outline");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Keep tasks assigned across the active apartment roommates
  const activeTasks = useMemo(
    () => assignTasksToRoommates(cleaningTasks, roommates),
    [cleaningTasks, roommates]
  );

  const roommateTasks = useMemo(
    () => filterTasksByRoommate(activeTasks, selectedPersonId),
    [activeTasks, selectedPersonId]
  );

  const allCount = roommateTasks.length;
  const pendingCount = roommateTasks.filter((t) => !t.done).length;
  const completedCount = roommateTasks.filter((t) => t.done).length;

  const visibleTasks = useMemo(() => {
    if (statusFilter === "pending") {
      return roommateTasks.filter((t) => !t.done);
    }
    if (statusFilter === "completed") {
      return roommateTasks.filter((t) => t.done);
    }
    return roommateTasks;
  }, [roommateTasks, statusFilter]);

  const selectedPerson = useMemo(() => {
    if (selectedPersonId === "all") return null;
    return roommates.find((r) => r.id === selectedPersonId) ?? null;
  }, [selectedPersonId, roommates]);

  if (!apartment || !currentUser) return null;

  const totalPendingCount = activeTasks.filter((t) => !t.done).length;

  function openAddModal() {
    setTaskName("");
    setAssignedRoommate(currentUser?.id ?? roommates[0]?.id ?? "");
    setDueDate("Today");
    setIsRecurring(true);
    setFrequency(7);
    // Initialize rotation pool with all current apartment roommates in order
    setRotationPool(roommates.map((r) => r.id));
    setTaskIcon("sparkles-outline");
    setFormError(null);
    setAddModalVisible(true);
  }

  function handleToggleRoommateInPool(id: string) {
    if (rotationPool.includes(id)) {
      setRotationPool(rotationPool.filter((rId) => rId !== id));
    } else {
      setRotationPool([...rotationPool, id]);
    }
  }

  function setQuickDate(label: string) {
    setDueDate(label);
  }

  async function handleRotate() {
    if (apartment!.roommates.length <= 1) {
      Alert.alert(
        "Rotation settings",
        "Add more roommates to your apartment to rotate chores between them."
      );
      return;
    }
    await rotateCleaningTasks();
    Alert.alert(
      "Chores rotated!",
      "Chore assignments have advanced to the next roommate in the rotation sequence."
    );
  }

  function handleToggleDone(taskId: string) {
    toggleCleaningTask(taskId);
  }

  function handleDeleteTask(taskId: string, title: string) {
    Alert.alert(
      "Delete Chore",
      `Are you sure you want to delete "${title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await removeCleaningTask(taskId);
          },
        },
      ]
    );
  }

  async function handleCreateTask() {
    if (!taskName.trim()) {
      setFormError("Please enter a task name.");
      return;
    }

    if (isRecurring) {
      if (rotationPool.length === 0) {
        setFormError("Please select at least one roommate for the rotation pool.");
        return;
      }
    } else {
      if (!assignedRoommate) {
        setFormError("Please assign a roommate.");
        return;
      }
    }

    const firstAssignee = isRecurring ? rotationPool[0] : assignedRoommate;

    try {
      setSubmitting(true);
      setFormError(null);
      await addCleaningTask({
        title: taskName.trim(),
        assigneeId: firstAssignee,
        frequencyDays: frequency,
        isRecurring,
        rotationPool: isRecurring ? rotationPool : undefined,
        icon: taskIcon,
        dueLabel: dueDate.trim() || `Every ${frequency}d`,
      });
      setAddModalVisible(false);
      setTaskName("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Couldn't add chore");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen edges={["top"]}>
      <ScreenHeader
        title="Chores"
        subtitle={
          activeTasks.length === 0
            ? "No chores yet"
            : `${totalPendingCount} task${totalPendingCount === 1 ? "" : "s"} left this week`
        }
        logo={require("@/assets/logo.jpg")}
        actionIcon="repeat-outline"
        onActionPress={handleRotate}
      />

      <View style={styles.rotationRow}>
        <AvatarStack
          avatars={apartment.roommates.map((r) => ({
            id: r.id,
            initials: r.initials,
            color: r.avatarColor,
          }))}
          size={30}
        />
        <Text style={[styles.rotationText, { color: textMuted }]}>
          {apartment.roommates.length}{" "}
          {apartment.roommates.length === 1 ? "roommate" : "roommates"} in the rotation
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScrollView}
        contentContainerStyle={styles.personRow}>
        <PersonChip
          label="All chores"
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

      <View style={styles.statusFilterWrap}>
        <View style={[styles.statusFilterContainer, { backgroundColor: card, borderColor: border }]}>
          {([
            { id: "all", label: "All", count: allCount },
            { id: "pending", label: "Pending", count: pendingCount },
            { id: "completed", label: "Completed", count: completedCount },
          ] as const).map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setStatusFilter(tab.id)}
                style={[
                  styles.statusFilterTab,
                  isActive && {
                    backgroundColor: `${Accent.cleaning}22`,
                    borderColor: Accent.cleaning,
                  },
                ]}>
                <Text
                  style={[
                    styles.statusFilterTabText,
                    { color: isActive ? Accent.cleaning : textMuted },
                    isActive && { fontWeight: FontWeight.bold as any },
                  ]}>
                  {tab.label}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: isActive ? Accent.cleaning : border },
                  ]}>
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: isActive ? "#FFFFFF" : textMuted },
                    ]}>
                    {tab.count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {visibleTasks.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons
              name="sparkles-outline"
              size={36}
              color={textMuted}
              style={styles.emptyIcon}
            />
            <Text style={[styles.emptyTitle, { color: textMuted }]}>
              {activeTasks.length === 0
                ? "No chores yet"
                : statusFilter === "pending"
                ? "No pending chores"
                : statusFilter === "completed"
                ? "No completed chores"
                : selectedPerson
                ? `No chores assigned to ${selectedPerson.isYou ? "you" : selectedPerson.name}.`
                : "No chores found"}
            </Text>
            <Text style={[styles.emptySubtitle, { color: textMuted }]}>
              {activeTasks.length === 0
                ? "Chores added for your apartment will appear here."
                : statusFilter === "pending"
                ? "All caught up! No chores pending."
                : statusFilter === "completed"
                ? "Completed chores will appear here once marked as done."
                : "No chores found matching the selected filters."}
            </Text>
          </Card>
        ) : (
          visibleTasks.map((task) => {
            const assignee = apartment.roommates.find((r) => r.id === task.assigneeId);
            const assigneeName = assignee
              ? assignee.isYou
                ? "You"
                : assignee.name
              : "Unassigned";

            const displayFreq = task.frequencyDays
              ? `Every ${task.frequencyDays}d`
              : frequencyLabel[task.frequency];

            return (
              <Pressable key={task.id} onPress={() => handleToggleDone(task.id)}>
                <Card style={styles.taskCard}>
                  <View
                    style={[
                      styles.taskIcon,
                      {
                        backgroundColor: task.done
                          ? `${Accent.success}1F`
                          : `${Accent.cleaning}1F`,
                      },
                    ]}>
                    <Ionicons
                      name={task.done ? "checkmark-circle" : (task.icon as any)}
                      size={20}
                      color={task.done ? Accent.success : Accent.cleaning}
                    />
                  </View>

                  <View style={styles.taskInfo}>
                    <Text
                      style={[styles.taskTitle, task.done && styles.taskTitleDone]}
                      numberOfLines={1}>
                      {task.title}
                    </Text>
                    <View style={styles.taskMetaRow}>
                      {assignee && (
                        <Avatar
                          initials={assignee.initials}
                          color={assignee.avatarColor}
                          size={18}
                        />
                      )}
                      <Text
                        style={{
                          color: textMuted,
                          fontSize: FontSize.xs,
                          marginLeft: Spacing.xs,
                        }}>
                        {assigneeName} · {task.dueLabel}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.taskRightActions}>
                    <Chip
                      label={task.done ? "Done" : displayFreq}
                      color={task.done ? Accent.success : Accent.cleaning}
                    />
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteTask(task.id, task.title);
                      }}
                      hitSlop={8}
                      style={styles.deleteButton}>
                      <Ionicons name="trash-outline" size={17} color={textMuted} />
                    </Pressable>
                  </View>
                </Card>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <Fab onPress={openAddModal} />

      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: card }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Chore</Text>
              <Pressable onPress={() => setAddModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={textMuted} />
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalBody}>
              <TextField
                label="Task Name *"
                placeholder="e.g., Deep clean bathroom"
                value={taskName}
                onChangeText={(text) => {
                  setTaskName(text);
                  if (formError) setFormError(null);
                }}
              />

              {/* Recurring Task Switch */}
              <View style={[styles.switchRow, { backgroundColor: card, borderColor: border }]}>
                <View style={{ flex: 1, marginRight: Spacing.md }}>
                  <Text style={[styles.switchTitle, { color: text }]}>
                    Recurring Task (Round-Robin)
                  </Text>
                  <Text style={[styles.switchSubtitle, { color: textMuted }]}>
                    Rotates to the next roommate on completion
                  </Text>
                </View>
                <Switch
                  value={isRecurring}
                  onValueChange={(val) => {
                    setIsRecurring(val);
                    if (val && rotationPool.length === 0 && assignedRoommate) {
                      setRotationPool([assignedRoommate]);
                    }
                  }}
                  trackColor={{ false: border, true: `${Accent.cleaning}80` }}
                  thumbColor={isRecurring ? Accent.cleaning : "#CBD5E1"}
                />
              </View>

              {/* Recurrence Specific Options with Custom Slider */}
              {isRecurring ? (
                <View style={styles.recurringSection}>
                  {/* Frequency Slider */}
                  <View
                    style={[
                      styles.sliderContainer,
                      { backgroundColor: card, borderColor: border },
                    ]}>
                    <View style={styles.sliderHeaderRow}>
                      <Text style={[styles.sliderLabel, { color: text }]}>
                        Frequency:{" "}
                        <Text
                          style={[
                            styles.sliderValueHighlight,
                            { color: Accent.cleaning },
                          ]}>
                          Every {frequency} {frequency === 1 ? "day" : "days"}
                        </Text>
                      </Text>
                    </View>

                    <Slider
                      style={styles.slider}
                      minimumValue={1}
                      maximumValue={30}
                      step={1}
                      value={frequency}
                      onValueChange={(val) => setFrequency(Math.round(val))}
                      minimumTrackTintColor={Accent.cleaning}
                      maximumTrackTintColor={border}
                      thumbTintColor={Accent.cleaning}
                    />

                    <View style={styles.sliderScaleRow}>
                      <Text style={[styles.sliderScaleText, { color: textMuted }]}>
                        1d
                      </Text>
                      <Text style={[styles.sliderScaleText, { color: textMuted }]}>
                        7d (Weekly)
                      </Text>
                      <Text style={[styles.sliderScaleText, { color: textMuted }]}>
                        14d (Bi-weekly)
                      </Text>
                      <Text style={[styles.sliderScaleText, { color: textMuted }]}>
                        30d
                      </Text>
                    </View>
                  </View>

                  {/* Rotation Pool Builder */}
                  <Text style={styles.fieldLabel}>
                    Rotation Pool * (Select order of roommates)
                  </Text>

                  {/* Active selected rotation sequence */}
                  {rotationPool.length > 0 ? (
                    <View
                      style={[
                        styles.selectedPoolContainer,
                        { backgroundColor: card, borderColor: border },
                      ]}>
                      <Text style={[styles.selectedPoolLabel, { color: textMuted }]}>
                        Current Order:
                      </Text>
                      <View style={styles.poolChipsRow}>
                        {rotationPool.map((rId, index) => {
                          const r = apartment.roommates.find((m) => m.id === rId);
                          const name = r ? (r.isYou ? "You" : r.name) : "Roommate";
                          return (
                            <TouchableOpacity
                              key={`${rId}-${index}`}
                              style={[
                                styles.selectedPoolChip,
                                {
                                  borderColor: Accent.cleaning,
                                  backgroundColor: `${Accent.cleaning}1F`,
                                },
                              ]}
                              onPress={() => handleToggleRoommateInPool(rId)}>
                              <Text
                                style={[
                                  styles.selectedPoolChipIndex,
                                  { color: Accent.cleaning },
                                ]}>
                                {index + 1}.
                              </Text>
                              <Text
                                style={[
                                  styles.selectedPoolChipName,
                                  { color: text },
                                ]}>
                                {name}
                              </Text>
                              <Text
                                style={[
                                  styles.selectedPoolChipRemove,
                                  { color: Accent.cleaning },
                                ]}>
                                ✕
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      <Text style={[styles.poolHint, { color: textMuted }]}>
                        First up:{" "}
                        <Text style={{ fontWeight: FontWeight.bold as any, color: text }}>
                          {apartment.roommates.find((m) => m.id === rotationPool[0])
                            ?.name ?? "Selected Roommate"}
                        </Text>
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.poolEmptyHint, { color: textMuted }]}>
                      Tap roommates below to build the rotation order:
                    </Text>
                  )}

                  {/* Roommates to Add / Toggle in Pool */}
                  <View style={styles.quickChipContainer}>
                    {apartment.roommates.map((r) => {
                      const isSelected = rotationPool.includes(r.id);
                      return (
                        <TouchableOpacity
                          key={r.id}
                          style={[
                            styles.quickChip,
                            {
                              borderColor: isSelected ? Accent.cleaning : border,
                              backgroundColor: isSelected
                                ? `${Accent.cleaning}22`
                                : card,
                            },
                          ]}
                          onPress={() => handleToggleRoommateInPool(r.id)}>
                          <Avatar
                            initials={r.initials}
                            color={r.avatarColor}
                            size={18}
                          />
                          <Text
                            style={[
                              styles.quickChipText,
                              { color: isSelected ? Accent.cleaning : text },
                            ]}>
                            {isSelected ? `✓ ${r.isYou ? "You" : r.name}` : `+ ${r.isYou ? "You" : r.name}`}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ) : (
                /* Non-recurring Single Roommate Input */
                <View>
                  <Text style={styles.fieldLabel}>Assigned Roommate *</Text>
                  <View style={styles.quickChipContainer}>
                    {apartment.roommates.map((r) => {
                      const isSelected = assignedRoommate === r.id;
                      return (
                        <TouchableOpacity
                          key={r.id}
                          style={[
                            styles.quickChip,
                            {
                              borderColor: isSelected ? primary : border,
                              backgroundColor: isSelected ? primaryMuted : card,
                            },
                          ]}
                          onPress={() => setAssignedRoommate(r.id)}>
                          <Avatar
                            initials={r.initials}
                            color={r.avatarColor}
                            size={18}
                          />
                          <Text
                            style={[
                              styles.quickChipText,
                              { color: isSelected ? primary : text },
                            ]}>
                            {r.isYou ? "You" : r.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Initial Due Date Input with Quick Select Presets */}
              <View style={{ marginTop: Spacing.md }}>
                <TextField
                  label="Initial Due Date"
                  placeholder="e.g., Today, Tomorrow, 2026-11-25"
                  value={dueDate}
                  onChangeText={setDueDate}
                />
                <View style={styles.quickChipContainer}>
                  <Text style={[styles.quickChipLabel, { color: textMuted }]}>Presets:</Text>
                  {["Today", "Tomorrow", "In 3 Days", "Next Week"].map((preset) => (
                    <TouchableOpacity
                      key={preset}
                      style={[
                        styles.presetChip,
                        {
                          borderColor: dueDate === preset ? primary : border,
                          backgroundColor: dueDate === preset ? primaryMuted : card,
                        },
                      ]}
                      onPress={() => setQuickDate(preset)}>
                      <Text
                        style={[
                          styles.presetChipText,
                          { color: dueDate === preset ? primary : textMuted },
                        ]}>
                        {preset}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Icon Selection */}
              <Text style={styles.fieldLabel}>Chore Icon</Text>
              <View style={styles.chipRow}>
                {CHORE_ICONS.map((item) => {
                  const isSelected = taskIcon === item.icon;
                  return (
                    <Pressable
                      key={item.icon}
                      onPress={() => setTaskIcon(item.icon)}
                      style={[
                        styles.iconOption,
                        {
                          borderColor: isSelected ? primary : border,
                          backgroundColor: isSelected ? primaryMuted : card,
                        },
                      ]}>
                      <Ionicons
                        name={item.icon as any}
                        size={20}
                        color={isSelected ? primary : textMuted}
                      />
                    </Pressable>
                  );
                })}
              </View>

              {formError && (
                <Text style={styles.formErrorText}>⚠️ {formError}</Text>
              )}

              <View style={{ marginTop: Spacing.md }}>
                <Button
                  label={submitting ? "Adding chore..." : "Create Task"}
                  onPress={handleCreateTask}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  rotationText: {
    marginLeft: Spacing.sm,
    fontSize: FontSize.sm,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  filterScrollView: {
    flexGrow: 0,
    flexShrink: 0,
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
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
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  emptyIcon: {
    marginBottom: Spacing.sm,
    opacity: 0.8,
  },
  emptyTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: FontSize.xs,
    marginTop: 4,
    textAlign: "center",
    opacity: 0.8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    maxHeight: "88%",
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
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium as any,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
    opacity: 0.8,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  switchTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold as any,
  },
  switchSubtitle: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  recurringSection: {
    marginBottom: Spacing.sm,
  },
  sliderContainer: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sliderHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  sliderLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium as any,
  },
  sliderValueHighlight: {
    fontWeight: FontWeight.bold as any,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  sliderScaleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  sliderScaleText: {
    fontSize: 10,
    fontWeight: FontWeight.medium as any,
  },
  selectedPoolContainer: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  selectedPoolLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold as any,
    marginBottom: Spacing.xs,
  },
  poolChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  selectedPoolChip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    gap: 4,
  },
  selectedPoolChipIndex: {
    fontSize: 11,
    fontWeight: FontWeight.bold as any,
  },
  selectedPoolChipName: {
    fontSize: 12,
    fontWeight: FontWeight.medium as any,
  },
  selectedPoolChipRemove: {
    fontSize: 12,
    fontWeight: FontWeight.bold as any,
    marginLeft: 2,
  },
  poolHint: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  poolEmptyHint: {
    fontSize: FontSize.xs,
    marginBottom: Spacing.sm,
  },
  quickChipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  quickChipLabel: {
    fontSize: FontSize.xs,
    marginRight: 4,
  },
  quickChip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  quickChipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium as any,
  },
  presetChip: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
  },
  presetChipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium as any,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  formErrorText: {
    color: Accent.danger,
    fontSize: FontSize.sm,
    marginBottom: Spacing.sm,
  },
  statusFilterWrap: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    flexGrow: 0,
    flexShrink: 0,
  },
  statusFilterContainer: {
    flexDirection: "row",
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 3,
    gap: 4,
  },
  statusFilterTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "transparent",
    gap: 6,
  },
  statusFilterTabText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium as any,
  },
  statusBadge: {
    borderRadius: Radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold as any,
  },
  taskRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  deleteButton: {
    padding: 4,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
