import type { CleaningTask, Roommate } from "@/types";

/**
 * Assigns cleaning chores round-robin to the actual dynamic roommates of the active apartment.
 * If a task's assigneeId already corresponds to a current roommate, it is preserved.
 * Otherwise, it assigns tasks cyclically across the apartment's roommates.
 */
export function assignTasksToRoommates(
  tasks: CleaningTask[],
  roommates: Roommate[]
): CleaningTask[] {
  if (roommates.length === 0) {
    return tasks.map((t) => ({ ...t, assigneeId: "" }));
  }

  const validIds = new Set(roommates.map((r) => r.id));

  return tasks.map((task, index) => {
    if (task.assigneeId && validIds.has(task.assigneeId)) {
      return task;
    }
    const assignee = roommates[index % roommates.length];
    return {
      ...task,
      assigneeId: assignee.id,
    };
  });
}

/**
 * Rotates task assignments to the next roommate in sequence for all active apartment members.
 */
export function rotateCleaningTasks(
  tasks: CleaningTask[],
  roommates: Roommate[]
): CleaningTask[] {
  if (roommates.length <= 1) return tasks;

  return tasks.map((task) => {
    const currentIndex = roommates.findIndex((r) => r.id === task.assigneeId);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % roommates.length;
    return {
      ...task,
      assigneeId: roommates[nextIndex].id,
    };
  });
}

/**
 * Filters cleaning tasks by selected member ("all" or a roommate id).
 */
export function filterTasksByRoommate(
  tasks: CleaningTask[],
  selectedPersonId: string | "all"
): CleaningTask[] {
  if (selectedPersonId === "all") return tasks;
  return tasks.filter((task) => task.assigneeId === selectedPersonId);
}
