import React, { useState, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { CleaningTask, TaskStatus } from '@/types/cleaningTask';
import { DUMMY_CLEANING_TASKS } from '@/data/dummyCleaningTasks';

type FilterType = 'All' | 'Pending' | 'Overdue' | 'Completed';

interface CleaningTasksScreenProps {
  initialTasks?: CleaningTask[];
  onTasksChange?: (tasks: CleaningTask[]) => void;
}

export default function CleaningTasksScreen({
  initialTasks = DUMMY_CLEANING_TASKS,
  onTasksChange,
}: CleaningTasksScreenProps) {
  const [tasks, setTasks] = useState<CleaningTask[]>(initialTasks);
  const [filter, setFilter] = useState<FilterType>('All');
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Notification Toast state
  const [notificationToast, setNotificationToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Form state
  const [taskName, setTaskName] = useState('');
  const [assignedRoommate, setAssignedRoommate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<number>(7); // Days between recurrences (1 to 30)
  const [rotationPool, setRotationPool] = useState<string[]>([]);
  const [customRoommateInput, setCustomRoommateInput] = useState('');
  const [formError, setFormError] = useState('');

  const updateTasks = (newTasks: CleaningTask[]) => {
    setTasks(newTasks);
    if (onTasksChange) {
      onTasksChange(newTasks);
    }
  };

  // Helper: check if a Pending task's due date is in the past
  const isTaskOverdue = (task: CleaningTask): boolean => {
    if (task.status === 'Completed' || !task.dueDate) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    return task.dueDate < todayStr;
  };

  // Trigger simulated in-app Toast notification
  const triggerCompletionNotification = (message: string) => {
    setNotificationToast(message);

    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setNotificationToast(null);
    }, 4500);
  };

  // Calculate new due date by adding the exact number of frequency days
  const calculateNextDueDate = (currentDueDateStr: string, freqDays?: number): string => {
    const daysToAdd = typeof freqDays === 'number' && freqDays > 0 ? freqDays : 7;
    let baseDate = new Date();

    if (currentDueDateStr && /^\d{4}-\d{2}-\d{2}$/.test(currentDueDateStr)) {
      const parts = currentDueDateStr.split('-').map(Number);
      const parsedDate = new Date(parts[0], parts[1] - 1, parts[2]);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // If overdue, base the next cycle from today so the next roommate gets full time
      if (parsedDate < today) {
        baseDate = today;
      } else {
        baseDate = parsedDate;
      }
    }

    baseDate.setDate(baseDate.getDate() + daysToAdd);
    const yyyy = baseDate.getFullYear();
    const mm = String(baseDate.getMonth() + 1).padStart(2, '0');
    const dd = String(baseDate.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // In-place rotation logic: NO new task created.
  // Completing the task does NOT clear missedBy; it only appends if overdue.
  const handleToggleStatus = (id: string) => {
    const target = tasks.find((t) => t.id === id);
    if (!target) return;

    // Recurring task rotation
    if (target.isRecurring && target.status === 'Pending') {
      const wasOverdue = isTaskOverdue(target);
      const currentAssignee = target.assignedRoommate;

      // Notify roommates of completion
      triggerCompletionNotification(
        `Notification sent to all roommates: ${target.taskName} is completed!`
      );

      // Determine next person in rotation pool
      const pool = target.rotationPool || [];
      let nextRoommate = currentAssignee;
      if (pool.length > 0) {
        const currentIdx = pool.findIndex(
          (r) => r.trim().toLowerCase() === currentAssignee.trim().toLowerCase()
        );
        const nextIdx = currentIdx >= 0 ? (currentIdx + 1) % pool.length : 0;
        nextRoommate = pool[nextIdx];
      }

      // Calculate new due date by adding frequency days
      const nextDueDate = calculateNextDueDate(target.dueDate, target.frequency);

      // Preserves existing missedBy list (does NOT automatically clear)
      let updatedMissedBy = target.missedBy ? [...target.missedBy] : [];
      if (wasOverdue && currentAssignee) {
        if (!updatedMissedBy.includes(currentAssignee)) {
          updatedMissedBy.push(currentAssignee);
        }
      }

      // Update existing task in-place, keeping status as 'Pending'
      const updatedTasks = tasks.map((t) => {
        if (t.id === id) {
          return {
            ...t,
            assignedRoommate: nextRoommate,
            dueDate: nextDueDate,
            status: 'Pending' as TaskStatus,
            missedBy: updatedMissedBy,
          };
        }
        return t;
      });

      updateTasks(updatedTasks);
      return;
    }

    // Non-recurring task: standard toggle between Pending and Completed
    const isNowCompleting = target.status === 'Pending';
    if (isNowCompleting) {
      triggerCompletionNotification(
        `Notification sent to all roommates: ${target.taskName} is completed!`
      );
    }

    const updatedTasks = tasks.map((t) => {
      if (t.id === id) {
        return {
          ...t,
          status: (isNowCompleting ? 'Completed' : 'Pending') as TaskStatus,
        };
      }
      return t;
    });

    updateTasks(updatedTasks);
  };

  // Manual action to clear / forgive the missedBy array
  const handleClearMissedBy = (id: string, taskName: string) => {
    const updatedTasks = tasks.map((t) => {
      if (t.id === id) {
        return { ...t, missedBy: [] };
      }
      return t;
    });

    updateTasks(updatedTasks);
    triggerCompletionNotification(`Missed turn resolved & forgiven for "${taskName}" 🍰`);
  };

  // Delete task
  const handleDeleteTask = (id: string, name: string) => {
    const confirmDelete = () => {
      const updated = tasks.filter((task) => task.id !== id);
      updateTasks(updated);
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete "${name}"?`)) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        'Delete Task',
        `Are you sure you want to delete "${name}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: confirmDelete },
        ]
      );
    }
  };

  // Add/remove roommate in rotation pool
  const handleToggleRoommateInPool = (name: string) => {
    if (rotationPool.includes(name)) {
      setRotationPool(rotationPool.filter((r) => r !== name));
    } else {
      setRotationPool([...rotationPool, name]);
    }
  };

  // Add custom roommate to pool
  const handleAddCustomRoommate = () => {
    const trimmed = customRoommateInput.trim();
    if (trimmed && !rotationPool.includes(trimmed)) {
      setRotationPool([...rotationPool, trimmed]);
      setCustomRoommateInput('');
    }
  };

  // Add task handler
  const handleAddTask = () => {
    if (!taskName.trim()) {
      setFormError('Please enter a task name.');
      return;
    }

    if (isRecurring) {
      if (rotationPool.length === 0) {
        setFormError('Please select at least one roommate for the rotation pool.');
        return;
      }
    } else {
      if (!assignedRoommate.trim()) {
        setFormError('Please assign a roommate.');
        return;
      }
    }

    const firstAssignee = isRecurring ? rotationPool[0] : assignedRoommate.trim();

    const newTask: CleaningTask = {
      id: `task-${Date.now()}`,
      taskName: taskName.trim(),
      assignedRoommate: firstAssignee,
      dueDate: dueDate.trim() || new Date().toISOString().split('T')[0],
      status: 'Pending',
      isRecurring,
      frequency: isRecurring ? frequency : undefined,
      rotationPool: isRecurring ? rotationPool : undefined,
      missedBy: [],
    };

    updateTasks([newTask, ...tasks]);
    handleCloseModal();
  };

  const handleCloseModal = () => {
    setTaskName('');
    setAssignedRoommate('');
    setDueDate('');
    setIsRecurring(false);
    setFrequency(7);
    setRotationPool([]);
    setCustomRoommateInput('');
    setFormError('');
    setIsModalVisible(false);
  };

  const setQuickDate = (daysFromNow: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    setDueDate(date.toISOString().split('T')[0]);
  };

  // Filtered tasks based on active category
  const filteredTasks = useMemo(() => {
    switch (filter) {
      case 'Pending':
        return tasks.filter((t) => t.status === 'Pending' && !isTaskOverdue(t));
      case 'Overdue':
        return tasks.filter((t) => isTaskOverdue(t));
      case 'Completed':
        return tasks.filter((t) => t.status === 'Completed');
      case 'All':
      default:
        return tasks;
    }
  }, [tasks, filter]);

  // Statistics
  const totalCount = tasks.length;
  const completedCount = tasks.filter((t) => t.status === 'Completed').length;
  const overdueCount = tasks.filter((t) => isTaskOverdue(t)).length;
  const pendingNotOverdueCount = tasks.filter((t) => t.status === 'Pending' && !isTaskOverdue(t)).length;
  const completionPercentage = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  const availableRoommates = useMemo(() => {
    const names = new Set<string>();
    tasks.forEach((t) => {
      if (t.assignedRoommate) names.add(t.assignedRoommate);
      if (t.rotationPool) t.rotationPool.forEach((r) => names.add(r));
    });
    const result = Array.from(names).filter(Boolean);
    return result.length > 0 ? result : ['Abdullah', 'Sam', 'Jordan', 'Taylor'];
  }, [tasks]);

  const renderTaskItem = ({ item }: { item: CleaningTask }) => {
    const isCompleted = item.status === 'Completed';
    const isOverdue = isTaskOverdue(item);

    let nextRoommateInRotation: string | null = null;
    if (item.isRecurring && item.rotationPool && item.rotationPool.length > 1) {
      const idx = item.rotationPool.findIndex(
        (r) => r.trim().toLowerCase() === item.assignedRoommate.trim().toLowerCase()
      );
      const nextIdx = idx >= 0 ? (idx + 1) % item.rotationPool.length : 0;
      nextRoommateInRotation = item.rotationPool[nextIdx];
    }

    return (
      <View
        style={[
          styles.taskCard,
          isCompleted && styles.taskCardCompleted,
          isOverdue && styles.taskCardOverdue,
        ]}
      >
        <View style={styles.cardHeaderRow}>
          {/* Checkbox */}
          <TouchableOpacity
            style={[
              styles.checkbox,
              isCompleted && styles.checkboxCompleted,
              isOverdue && styles.checkboxOverdue,
            ]}
            onPress={() => handleToggleStatus(item.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isCompleted }}
            accessibilityLabel={`Mark ${item.taskName} as ${isCompleted ? 'Pending' : 'Completed'}`}
            activeOpacity={0.7}
          >
            {isCompleted && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>

          {/* Task Info */}
          <View style={styles.taskInfoContainer}>
            <View style={styles.taskTitleRow}>
              <Text
                style={[
                  styles.taskTitle,
                  isCompleted && styles.taskTitleCompleted,
                  isOverdue && styles.taskTitleOverdue,
                ]}
                numberOfLines={2}
              >
                {item.taskName}
              </Text>
            </View>

            <View style={styles.metadataRow}>
              {/* Overdue Badge */}
              {isOverdue && (
                <View style={styles.overdueBadge}>
                  <Text style={styles.overdueBadgeText}>⚠️ OVERDUE</Text>
                </View>
              )}

              {/* Recurring Badge */}
              {item.isRecurring && (
                <View style={styles.recurringBadge}>
                  <Text style={styles.recurringIcon}>🔁</Text>
                  <Text style={styles.recurringText}>
                    {item.frequency
                      ? `Every ${item.frequency} ${item.frequency === 1 ? 'day' : 'days'}`
                      : 'Recurring'}
                  </Text>
                </View>
              )}

              {/* Roommate badge */}
              <View style={styles.badge}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {item.assignedRoommate.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.badgeText}>{item.assignedRoommate}</Text>
              </View>

              {/* Due Date badge */}
              <View
                style={[
                  styles.badge,
                  styles.dateBadge,
                  isOverdue && styles.dateBadgeOverdue,
                ]}
              >
                <Text style={styles.badgeIcon}>{isOverdue ? '⏰' : '📅'}</Text>
                <Text
                  style={[
                    styles.badgeText,
                    isOverdue && styles.dateBadgeTextOverdue,
                  ]}
                >
                  {item.dueDate}
                </Text>
              </View>
            </View>

            {/* Missed By Section with Manual Clear / Forgive button */}
            {item.missedBy && item.missedBy.length > 0 && (
              <View style={styles.missedByContainer}>
                <View style={styles.missedByContentRow}>
                  <Text style={styles.missedByIcon}>⚠️</Text>
                  <Text style={styles.missedByText}>
                    Missed by:{' '}
                    <Text style={styles.missedByNames}>{item.missedBy.join(', ')}</Text>
                  </Text>
                </View>

                {/* Manual Forgive / Clear Action */}
                <TouchableOpacity
                  style={styles.forgiveButton}
                  onPress={() => handleClearMissedBy(item.id, item.taskName)}
                  activeOpacity={0.7}
                  accessibilityLabel={`Clear missed by record for ${item.taskName}`}
                >
                  <Text style={styles.forgiveButtonText}>Forgive 🍰</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Rotation Pool chain preview with flexWrap: 'wrap' to prevent cut off */}
            {item.isRecurring && item.rotationPool && item.rotationPool.length > 0 && (
              <View style={styles.rotationChainContainer}>
                <Text style={styles.rotationLabel}>Rotation: </Text>
                <View style={styles.rotationChipsWrapper}>
                  {item.rotationPool.map((roommate, idx) => {
                    const isCurrent =
                      roommate.trim().toLowerCase() === item.assignedRoommate.trim().toLowerCase();
                    return (
                      <View key={idx} style={styles.rotationItemWrapper}>
                        <View
                          style={[
                            styles.rotationChip,
                            isCurrent && styles.rotationChipCurrent,
                          ]}
                        >
                          <Text
                            style={[
                              styles.rotationChipText,
                              isCurrent && styles.rotationChipTextCurrent,
                            ]}
                          >
                            {roommate}
                          </Text>
                        </View>
                        {idx < item.rotationPool!.length - 1 && (
                          <Text style={styles.rotationArrow}>→</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
                {nextRoommateInRotation && !isCompleted && (
                  <Text style={styles.nextUpText}> (Next: {nextRoommateInRotation})</Text>
                )}
              </View>
            )}
          </View>

          {/* Right Actions */}
          <View style={styles.rightActionsColumn}>
            {/* Status / Overdue Pill */}
            <TouchableOpacity
              style={[
                styles.statusPill,
                isCompleted
                  ? styles.statusPillCompleted
                  : isOverdue
                  ? styles.statusPillOverdue
                  : styles.statusPillPending,
              ]}
              onPress={() => handleToggleStatus(item.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.statusPillText,
                  isCompleted
                    ? styles.statusPillTextCompleted
                    : isOverdue
                    ? styles.statusPillTextOverdue
                    : styles.statusPillTextPending,
                ]}
              >
                {isOverdue ? 'OVERDUE' : item.status}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteTask(item.id, item.taskName)}
              accessibilityLabel={`Delete task ${item.taskName}`}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.deleteButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Top Title and Action Bar */}
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.screenTitle}>Cleaning Tasks</Text>
          <Text style={styles.screenSubtitle}>
            {overdueCount > 0
              ? `⚠️ ${overdueCount} task${overdueCount > 1 ? 's' : ''} overdue`
              : 'Round-Robin Roommate Chores'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setIsModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.addButtonIcon}>+</Text>
          <Text style={styles.addButtonText}>New Task</Text>
        </TouchableOpacity>
      </View>

      {/* Progress & Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryTitle}>Progress</Text>
          <Text style={styles.summaryCount}>
            {completedCount} of {totalCount} completed ({completionPercentage}%)
          </Text>
        </View>

        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${completionPercentage}%` },
            ]}
          />
        </View>
      </View>

      {/* 4-Category Segmented Filter Bar: All | Pending | Overdue | Completed */}
      <View style={styles.filterContainer}>
        {(['All', 'Pending', 'Overdue', 'Completed'] as FilterType[]).map((tab) => {
          const isActive = filter === tab;
          const count =
            tab === 'All'
              ? totalCount
              : tab === 'Pending'
              ? pendingNotOverdueCount
              : tab === 'Overdue'
              ? overdueCount
              : completedCount;

          const isOverdueTabWithItems = tab === 'Overdue' && count > 0;

          return (
            <TouchableOpacity
              key={tab}
              style={[
                styles.filterTab,
                isActive && styles.filterTabActive,
                isActive && tab === 'Overdue' && styles.filterTabActiveOverdue,
              ]}
              onPress={() => setFilter(tab)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterTabText,
                  isActive && styles.filterTabTextActive,
                  isActive && tab === 'Overdue' && styles.filterTabTextActiveOverdue,
                ]}
                numberOfLines={1}
              >
                {tab}
              </Text>
              <View
                style={[
                  styles.filterCounter,
                  isActive && styles.filterCounterActive,
                  isOverdueTabWithItems && styles.filterCounterOverdueAlert,
                  isActive && tab === 'Overdue' && styles.filterCounterActiveOverdue,
                ]}
              >
                <Text
                  style={[
                    styles.filterCounterText,
                    isActive && styles.filterCounterTextActive,
                    isOverdueTabWithItems && styles.filterCounterTextOverdueAlert,
                    isActive && tab === 'Overdue' && styles.filterCounterTextActiveOverdue,
                  ]}
                >
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderEmptyList = () => {
    let emptyMessage = `There are currently no ${filter.toLowerCase()} cleaning tasks.`;
    let emptyEmoji = '✨';

    if (filter === 'All') {
      emptyMessage = 'Everything is clean! Tap "+ New Task" to add your next chore.';
    } else if (filter === 'Overdue') {
      emptyEmoji = '🎉';
      emptyMessage = 'No overdue tasks! All roommate chores are on schedule.';
    } else if (filter === 'Pending') {
      emptyMessage = 'No active tasks pending! Great job staying on track.';
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>{emptyEmoji}</Text>
        <Text style={styles.emptyTitle}>
          {filter === 'Overdue' ? 'All caught up!' : 'No tasks found'}
        </Text>
        <Text style={styles.emptySubtitle}>{emptyMessage}</Text>
        {filter !== 'All' && (
          <TouchableOpacity style={styles.resetFilterButton} onPress={() => setFilter('All')}>
            <Text style={styles.resetFilterButtonText}>Show All Tasks</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Simulated In-App Completion Toast Banner */}
      {notificationToast && (
        <View style={styles.toastNotification}>
          <View style={styles.toastIconCircle}>
            <Text style={styles.toastIconText}>🔔</Text>
          </View>
          <View style={styles.toastTextContainer}>
            <Text style={styles.toastHeader}>Notification Broadcasted</Text>
            <Text style={styles.toastBody}>{notificationToast}</Text>
          </View>
          <TouchableOpacity
            style={styles.toastDismissButton}
            onPress={() => setNotificationToast(null)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.toastDismissText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        renderItem={renderTaskItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyList}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Add Task Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent
        onRequestClose={handleCloseModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalBackdrop} onPress={handleCloseModal} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Cleaning Task</Text>
              <TouchableOpacity onPress={handleCloseModal} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

              {/* Task Name Input */}
              <Text style={styles.inputLabel}>Task Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Deep clean bathroom"
                placeholderTextColor="#94A3B8"
                value={taskName}
                onChangeText={(text) => {
                  setTaskName(text);
                  if (formError) setFormError('');
                }}
              />

              {/* Recurring Switch */}
              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchTitle}>Recurring Task (Round-Robin)</Text>
                  <Text style={styles.switchSubtitle}>
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
                  trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
                  thumbColor={isRecurring ? '#2563EB' : '#F1F5F9'}
                />
              </View>

              {/* Recurrence Specific Options */}
              {isRecurring ? (
                <View style={styles.recurringSection}>
                  {/* Frequency Slider */}
                  <View style={styles.sliderContainer}>
                    <View style={styles.sliderHeaderRow}>
                      <Text style={styles.sliderLabel}>
                        Frequency:{' '}
                        <Text style={styles.sliderValueHighlight}>
                          Every {frequency} {frequency === 1 ? 'day' : 'days'}
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
                      minimumTrackTintColor="#2563EB"
                      maximumTrackTintColor="#CBD5E1"
                      thumbTintColor="#2563EB"
                    />

                    <View style={styles.sliderScaleRow}>
                      <Text style={styles.sliderScaleText}>1d</Text>
                      <Text style={styles.sliderScaleText}>7d (Weekly)</Text>
                      <Text style={styles.sliderScaleText}>14d (Bi-weekly)</Text>
                      <Text style={styles.sliderScaleText}>30d</Text>
                    </View>
                  </View>

                  {/* Rotation Pool Builder */}
                  <Text style={styles.inputLabel}>
                    Rotation Pool * (Select order of roommates)
                  </Text>

                  {/* Active selected rotation sequence */}
                  {rotationPool.length > 0 ? (
                    <View style={styles.selectedPoolContainer}>
                      <Text style={styles.selectedPoolLabel}>Current Order:</Text>
                      <View style={styles.poolChipsRow}>
                        {rotationPool.map((name, index) => (
                          <TouchableOpacity
                            key={`${name}-${index}`}
                            style={styles.selectedPoolChip}
                            onPress={() => handleToggleRoommateInPool(name)}
                          >
                            <Text style={styles.selectedPoolChipIndex}>{index + 1}.</Text>
                            <Text style={styles.selectedPoolChipName}>{name}</Text>
                            <Text style={styles.selectedPoolChipRemove}>✕</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <Text style={styles.poolHint}>
                        First up: <Text style={styles.boldText}>{rotationPool[0]}</Text>
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.poolEmptyHint}>
                      Tap roommates below to build the rotation order:
                    </Text>
                  )}

                  {/* Roommate Options to Add */}
                  <View style={styles.quickChipContainer}>
                    {availableRoommates.map((name) => {
                      const isSelected = rotationPool.includes(name);
                      return (
                        <TouchableOpacity
                          key={name}
                          style={[
                            styles.quickChip,
                            isSelected && styles.quickChipSelected,
                          ]}
                          onPress={() => handleToggleRoommateInPool(name)}
                        >
                          <Text
                            style={[
                              styles.quickChipText,
                              isSelected && styles.quickChipTextSelected,
                            ]}
                          >
                            {isSelected ? `✓ ${name}` : `+ ${name}`}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Add Custom Roommate Input */}
                  <View style={styles.customRoommateRow}>
                    <TextInput
                      style={[styles.textInput, styles.customRoommateInput]}
                      placeholder="Add another roommate..."
                      placeholderTextColor="#94A3B8"
                      value={customRoommateInput}
                      onChangeText={setCustomRoommateInput}
                    />
                    <TouchableOpacity
                      style={styles.addCustomButton}
                      onPress={handleAddCustomRoommate}
                    >
                      <Text style={styles.addCustomButtonText}>Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* Non-recurring Single Roommate Input */
                <View>
                  <Text style={styles.inputLabel}>Assigned Roommate *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g., Abdullah"
                    placeholderTextColor="#94A3B8"
                    value={assignedRoommate}
                    onChangeText={(text) => {
                      setAssignedRoommate(text);
                      if (formError) setFormError('');
                    }}
                  />

                  {/* Quick Select Roommate Chips */}
                  <View style={styles.quickChipContainer}>
                    <Text style={styles.quickChipLabel}>Quick pick:</Text>
                    {availableRoommates.map((name) => (
                      <TouchableOpacity
                        key={name}
                        style={[
                          styles.quickChip,
                          assignedRoommate.toLowerCase() === name.toLowerCase() && styles.quickChipActive,
                        ]}
                        onPress={() => setAssignedRoommate(name)}
                      >
                        <Text
                          style={[
                            styles.quickChipText,
                            assignedRoommate.toLowerCase() === name.toLowerCase() && styles.quickChipTextActive,
                          ]}
                        >
                          {name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Due Date Input */}
              <Text style={styles.inputLabel}>Initial Due Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., 2026-11-05"
                placeholderTextColor="#94A3B8"
                value={dueDate}
                onChangeText={setDueDate}
              />

              {/* Quick Select Date Presets */}
              <View style={styles.quickChipContainer}>
                <Text style={styles.quickChipLabel}>Presets:</Text>
                <TouchableOpacity style={styles.quickChip} onPress={() => setQuickDate(0)}>
                  <Text style={styles.quickChipText}>Today</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickChip} onPress={() => setQuickDate(1)}>
                  <Text style={styles.quickChipText}>Tomorrow</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickChip} onPress={() => setQuickDate(3)}>
                  <Text style={styles.quickChipText}>In 3 Days</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quickChip} onPress={() => setQuickDate(7)}>
                  <Text style={styles.quickChipText}>Next Week</Text>
                </TouchableOpacity>
              </View>

              {/* Modal Action Buttons */}
              <View style={styles.modalActionsRow}>
                <TouchableOpacity style={styles.cancelButton} onPress={handleCloseModal}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.submitButton} onPress={handleAddTask}>
                  <Text style={styles.submitButtonText}>Create Task</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  // In-app Notification Toast styles
  toastNotification: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    zIndex: 999,
  },
  toastIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  toastIconText: {
    fontSize: 16,
  },
  toastTextContainer: {
    flex: 1,
  },
  toastHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#34D399',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  toastBody: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F8FAFC',
    lineHeight: 18,
  },
  toastDismissButton: {
    padding: 6,
    marginLeft: 6,
  },
  toastDismissText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  headerContainer: {
    paddingTop: 16,
    paddingBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 6,
    lineHeight: 20,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  summaryCount: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 999,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 3,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 9,
  },
  filterTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  filterTabActiveOverdue: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTabTextActive: {
    color: '#0F172A',
  },
  filterTabTextActiveOverdue: {
    color: '#B91C1C',
    fontWeight: '700',
  },
  filterCounter: {
    marginLeft: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  filterCounterActive: {
    backgroundColor: '#EFF6FF',
  },
  filterCounterOverdueAlert: {
    backgroundColor: '#FEE2E2',
  },
  filterCounterActiveOverdue: {
    backgroundColor: '#FCA5A5',
  },
  filterCounterText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  filterCounterTextActive: {
    color: '#2563EB',
  },
  filterCounterTextOverdueAlert: {
    color: '#DC2626',
  },
  filterCounterTextActiveOverdue: {
    color: '#991B1B',
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  taskCardCompleted: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.85,
  },
  taskCardOverdue: {
    borderColor: '#EF4444',
    borderWidth: 1.5,
    backgroundColor: '#FEF2F2',
    shadowColor: '#EF4444',
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkboxOverdue: {
    borderColor: '#EF4444',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 16,
  },
  taskInfoContainer: {
    flex: 1,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    lineHeight: 22,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  taskTitleOverdue: {
    color: '#991B1B',
  },
  metadataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    marginBottom: 4,
  },
  overdueBadge: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  overdueBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B91C1C',
    letterSpacing: 0.5,
  },
  recurringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  recurringIcon: {
    fontSize: 11,
    marginRight: 4,
  },
  recurringText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  avatarCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  badgeIcon: {
    fontSize: 11,
    marginRight: 5,
  },
  badgeText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  dateBadge: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateBadgeOverdue: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  dateBadgeTextOverdue: {
    color: '#DC2626',
    fontWeight: '700',
  },
  // Missed by section with Forgive / Clear button
  missedByContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  missedByContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 150,
  },
  missedByIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  missedByText: {
    fontSize: 12,
    color: '#991B1B',
    fontWeight: '500',
  },
  missedByNames: {
    fontWeight: '700',
    color: '#B91C1C',
  },
  forgiveButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F87171',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  forgiveButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  // Rotation pool container with flexWrap: 'wrap'
  rotationChainContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 4,
  },
  rotationChipsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
  },
  rotationLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginRight: 2,
  },
  rotationItemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  rotationChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rotationChipCurrent: {
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  rotationChipText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  rotationChipTextCurrent: {
    color: '#1E40AF',
    fontWeight: '700',
  },
  rotationArrow: {
    fontSize: 10,
    color: '#94A3B8',
    marginHorizontal: 3,
  },
  nextUpText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
    marginLeft: 2,
    marginVertical: 2,
  },
  rightActionsColumn: {
    alignItems: 'flex-end',
    marginLeft: 8,
    justifyContent: 'space-between',
    height: 60,
  },
  statusPill: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  statusPillPending: {
    backgroundColor: '#FEF3C7',
  },
  statusPillCompleted: {
    backgroundColor: '#D1FAE5',
  },
  statusPillOverdue: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusPillTextPending: {
    color: '#B45309',
  },
  statusPillTextCompleted: {
    color: '#047857',
  },
  statusPillTextOverdue: {
    color: '#B91C1C',
    fontWeight: '800',
  },
  deleteButton: {
    padding: 4,
  },
  deleteButtonText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  resetFilterButton: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  resetFilterButtonText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 13,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalCloseText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748B',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginBottom: 12,
    fontWeight: '500',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginTop: 12,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 14,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  switchSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  recurringSection: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sliderContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  sliderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  sliderValueHighlight: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2563EB',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderScaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  sliderScaleText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  selectedPoolContainer: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 8,
  },
  selectedPoolLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },
  poolChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  selectedPoolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  selectedPoolChipIndex: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
    marginRight: 4,
  },
  selectedPoolChipName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
    marginRight: 6,
  },
  selectedPoolChipRemove: {
    fontSize: 12,
    color: '#93C5FD',
    fontWeight: '700',
  },
  poolHint: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  boldText: {
    fontWeight: '700',
    color: '#0F172A',
  },
  poolEmptyHint: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    marginBottom: 6,
  },
  quickChipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: 6,
  },
  quickChipLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  quickChip: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  quickChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  quickChipSelected: {
    backgroundColor: '#DBEAFE',
    borderColor: '#2563EB',
  },
  quickChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  quickChipTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  quickChipTextSelected: {
    color: '#1E40AF',
    fontWeight: '700',
  },
  customRoommateRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  customRoommateInput: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontSize: 13,
  },
  addCustomButton: {
    backgroundColor: '#334155',
    paddingHorizontal: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCustomButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
