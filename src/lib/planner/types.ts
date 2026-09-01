export type TaskType = "theory" | "revision" | "questions";
export type TaskPriority = "high" | "medium" | "low";

export interface StudyTask {
  id: string;
  subjectId: string;
  subjectName: string;
  topicId: string;
  topicName: string;
  type: TaskType;
  priority: TaskPriority;
  scheduledDate: string; // ISO string YYYY-MM-DD
  completed: boolean;
  notes?: string;
  associatedLaws?: string[];
}

export interface ScheduleConfig {
  dailyHoursAvailable: number;
  targetExamBoard: string; // ex: 'FGV', 'FCC', 'Cebraspe'
  subjectWeights: Record<string, number>; // ex: { 'DIR-TRIB': 3, 'DIR-CONST': 2 }
}
