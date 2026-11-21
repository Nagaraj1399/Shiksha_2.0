export type AppTab = 'tutor' | 'path' | 'teacher' | 'progress' | 'alerts';

export type AgentMode = 'student' | 'teacher';

export type CompetencyLevel = 'Mastered' | 'Progressing' | 'Struggling';

export type TextSizeScale = 'base' | 'lg' | 'xl';

export type DetectedLanguageCode = 'hi' | 'ta' | 'mr' | 'gu' | 'en';

export type SpeechLanguageCode = 'hi-IN' | 'ta-IN' | 'mr-IN' | 'en-IN';

export type HintLevel = 1 | 2 | 3;

export interface PublicStudentProfile {
  id: string;
  name: string;
  grade: string;
  board: string;
  preferredLanguage: string;
}

export interface TeacherStudentProfile extends PublicStudentProfile {
  maskedPhone?: string;
}

export type StudentProfile = PublicStudentProfile;

export type ParentUpdateLanguage = 'Hindi' | 'Tamil' | 'Marathi' | 'English';

export interface ProgressLog {
  id: string;
  student_id: string;
  subject: string;
  topic: string;
  competency_level: CompetencyLevel;
  frustration_detected: boolean;
  hints_used?: number;
  quiz_score?: number;
  quiz_total?: number;
  timestamp: string;
}

export interface DropoutAlert {
  id: string;
  student_id: string;
  reason_for_alert: string;
  timestamp: string;
  status: 'Active' | 'Acknowledged';
}

export interface ToolEvent {
  name: 'log_student_progress' | 'alert_teacher_dropout_risk';
  args: Record<string, unknown>;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  imageUrl?: string;
  timestamp: string;
  toolEvents?: ToolEvent[];
}

export type LearningPathStepStatus = 'Mastered' | 'In Progress' | 'Unlocked' | 'Locked';

export interface LearningPathStep {
  stepNumber: number;
  subject: string;
  topic: string;
  why: string;
  estimatedMinutes: number;
  status: LearningPathStepStatus;
}

export interface StudentLearningPath {
  studentId: string;
  generatedAt: string;
  sourceLogCount: number;
  steps: LearningPathStep[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
}

export interface PublicQuizQuestion {
  id: string;
  question: string;
  options: [string, string, string, string];
}

export interface PracticeQuiz {
  quizId: string;
  studentId: string;
  subject: string;
  topic: string;
  language: string;
  questions: QuizQuestion[];
}

export interface PublicPracticeQuiz {
  quizId: string;
  studentId: string;
  subject: string;
  topic: string;
  language: string;
  questions: PublicQuizQuestion[];
}

export interface QuizQuestionResult {
  questionId: string;
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
  explanation: string;
}

export interface QuizSubmissionResult {
  score: number;
  total: number;
  passed: boolean;
  results: QuizQuestionResult[];
  progressLog: ProgressLog;
}

export type HeatmapCellStatus = CompetencyLevel | 'Not Started';

export interface HeatmapTopicColumn {
  key: string;
  subject: string;
  topic: string;
}

export interface HeatmapCell {
  status: HeatmapCellStatus;
  hintsUsed?: number;
  quizScore?: number;
  quizTotal?: number;
  timestamp?: string;
}

export interface ClassHeatmapRow {
  student: TeacherStudentProfile;
  cells: Record<string, HeatmapCell>;
}

export interface ClassHeatmapData {
  topics: HeatmapTopicColumn[];
  rows: ClassHeatmapRow[];
}

export interface ShikshaStoreState {
  students: StudentProfile[];
  /** Separate server-only mapping from internal student ID (e.g. STU-MH-104) to contact number. Never exposed raw to clients. */
  studentPhoneMap?: Record<string, string>;
  progressLogs: ProgressLog[];
  dropoutAlerts: DropoutAlert[];
  learningPaths?: Record<string, StudentLearningPath>;
}

export interface TeacherOverviewResponse {
  students: TeacherStudentProfile[];
  progressLogs: ProgressLog[];
  dropoutAlerts: DropoutAlert[];
}

export interface WeeklySummaryResponse {
  bullets: string[];
  generatedAt: string;
}

export interface ParentUpdateResponse {
  studentId: string;
  studentName: string;
  language: ParentUpdateLanguage;
  message: string;
  strength: string;
  practiceArea: string;
}

export interface DeleteStudentDataResponse {
  studentId: string;
  deletedLogsCount: number;
  deletedAlertsCount: number;
}

export interface PublicLandingState {
  studentsTracked: number;
  topicsMastered: number;
  teacherAlerts: number;
}
