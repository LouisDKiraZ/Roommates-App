export type TaskStatus = 'Pending' | 'Completed';

export interface CleaningTask {
  id: string;
  taskName: string;
  assignedRoommate: string;
  dueDate: string; // ISO format (YYYY-MM-DD) or human-readable format
  status: TaskStatus;
  isRecurring: boolean;
  frequency?: number; // Number of days between recurrences (ranges from 1 to 30)
  rotationPool?: string[]; // Ordered list of roommates taking turns
  missedBy?: string[]; // List of roommates who missed their turn when the task became overdue
}

export type NewCleaningTaskInput = Omit<CleaningTask, 'id'>;
