import { CleaningTask } from '@/types/cleaningTask';

export const DUMMY_CLEANING_TASKS: CleaningTask[] = [
  {
    id: 'clean-1',
    taskName: 'Kitchen Deep Clean & Countertops',
    assignedRoommate: 'Abdullah',
    dueDate: '2026-11-01',
    status: 'Pending',
    isRecurring: true,
    frequency: 7, // Every 7 days
    rotationPool: ['Abdullah', 'Sam', 'Jordan'],
    missedBy: [],
  },
  {
    id: 'clean-2',
    taskName: 'Vacuum Living Room & Hallway Rugs',
    assignedRoommate: 'Sam',
    dueDate: '2026-10-25', // Overdue to immediately test overdue & missedBy logic!
    status: 'Pending',
    isRecurring: true,
    frequency: 14, // Every 14 days
    rotationPool: ['Sam', 'Taylor', 'Abdullah'],
    missedBy: ['Sam'],
  },
  {
    id: 'clean-3',
    taskName: 'Scrub Bathroom Shower & Sink',
    assignedRoommate: 'Jordan',
    dueDate: '2026-11-03',
    status: 'Pending',
    isRecurring: false,
    missedBy: [],
  },
  {
    id: 'clean-4',
    taskName: 'Take Out Trash & Recycle Bins',
    assignedRoommate: 'Taylor',
    dueDate: '2026-10-31',
    status: 'Pending',
    isRecurring: true,
    frequency: 3, // Every 3 days
    rotationPool: ['Taylor', 'Abdullah', 'Jordan', 'Sam'],
    missedBy: ['Jordan'],
  },
  {
    id: 'clean-5',
    taskName: 'Clean Microwave & Wipe Fridge',
    assignedRoommate: 'Abdullah',
    dueDate: '2026-10-29',
    status: 'Completed',
    isRecurring: false,
    missedBy: [],
  },
];
