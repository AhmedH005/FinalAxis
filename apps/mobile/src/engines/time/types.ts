// Time Engine mobile types.
// These mirror the web Time Engine DTOs closely enough for read-only mobile use.

export type TimePriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TimeColour = 'SLATE' | 'EMERALD' | 'SKY' | 'VIOLET' | 'AMBER' | 'ROSE';
export type TimeViewMode = 'today' | 'upcoming' | 'week';

export interface TimeTask {
  id: string;
  userId: string;
  title: string;
  notes?: string | null;
  estMinutes?: number | null;
  due?: string | null;
  priority: TimePriority;
  colour: TimeColour;
  createdAt: string;
  updatedAt?: string | null;
  completedAt?: string | null;
}

export interface TimeBlock {
  id: string;
  userId: string;
  taskId?: string | null;
  title: string;
  start: string;
  end: string;
  colour: TimeColour;
  isLocked: boolean;
  createdAt?: string | null;
  task?: TimeTask | null;
}

export interface TimeBlocksApiResponse {
  success: boolean;
  data?: TimeBlock[];
  error?: string;
}
