// src/types/workout.ts
export type Exercise = {
  id: string;
  name: string;
  tags: string[];
  categories: Record<string, string[]>;
  created_by_id: string | null;
  created_at: string;
};

export type ExerciseRelationship = {
  id: string;
  primary_exercise_id: string;
  related_exercise_id: string;
  relationship_type: "assistance" | "alternative";
  influence_weight: number;
  created_at: string;
  primary_exercise?: Exercise;
  related_exercise?: Exercise;
};

export type WorkoutSet = {
  weight: number;
  reps: number;
  rir?: number; // Reps in reserve
  tempo?: string;
  rest?: number; // Rest time in seconds
};

export type WorkoutExercise = {
  exercise_id: string;
  exercise_name: string;
  sets: WorkoutSet[];
};

export type WorkoutEntry = {
  id: string;
  user_id: string;
  date: string;
  exercises: WorkoutExercise[];
  notes?: string;
  rating?: number;
  duration?: number;
  media_urls?: string[];
  workout_name?: string;
  program_id?: string; // Link to program if from a program
  program_day_id?: string; // Link to specific program day
  program_week?: number; // Which week of the program
  phase?: number; // Which phase of the program
};

// NEW PROGRAM-BASED TYPES

export type ProgramExercise = {
  id: string;
  exercise_id: string;
  exercise_name: string;
  sets: number; // Target number of sets
  reps: number | string; // Target reps (could be "8-12" or "10")
  weight?: number; // Target weight (optional, user will fill)
  rir?: number; // Target RIR
  tempo?: string; // Target tempo
  rest?: number; // Target rest in seconds
  notes?: string; // Exercise-specific notes
  order: number; // Order within the day
  superset_group?: string; // For supersets/circuits
  progression_type?: "linear" | "double_progression" | "rpe" | "percentage";
  progression_increment?: number; // How much to increase (weight, reps, etc.)
};

export type ProgramDay = {
  id: string;
  program_id: string;
  name: string; // e.g., "Push Day", "Pull Day", "Legs", "Upper", "Lower"
  description?: string;
  exercises: ProgramExercise[];
  estimated_duration?: number; // Minutes
  day_number: number; // Order within the program (1, 2, 3, etc.)
  phase?: number; // Which phase this day belongs to
};

export type ProgramPhase = {
  phase_number: number;
  name: string; // e.g., "Foundation", "Intensification", "Realization"
  description?: string;
  duration_weeks: number;
  focus?: string; // e.g., "Volume", "Strength", "Peaking"
};

export type Program = {
  id: string;
  name: string; // e.g., "Jeff Nippard's Ultimate PPL", "Stronglifts 5x5"
  description?: string;
  created_by_id: string | null; // null if AI-generated or system program
  is_public: boolean; // Whether other users can see/use this program
  duration_weeks: number; // Total program length
  days_per_week: number;
  difficulty_level: "beginner" | "intermediate" | "advanced";
  program_type: "strength" | "hypertrophy" | "powerlifting" | "general";
  tags: string[]; // e.g., ["push-pull-legs", "full-body", "upper-lower"]
  days: ProgramDay[];
  phases?: ProgramPhase[]; // Optional phases
  created_at: string;
  updated_at: string;
  // Metadata for AI-generated programs
  ai_generated?: boolean;
  source_prompt?: string; // Original user input that generated this program
};

export type UserProgramProgress = {
  id: string;
  user_id: string;
  program_id: string;
  started_at: string;
  current_week: number;
  current_phase?: number;
  current_day_index: number; // Which day in the cycle they're on
  completed_workouts: number;
  last_workout_date?: string;
  status: "active" | "paused" | "completed";
  personal_records?: Record<
    string,
    { weight: number; reps: number; date: string }
  >; // Exercise PRs within this program
  notes?: string;
  created_at: string;
  updated_at: string;
};

// For the UI state management
export type ProgramWorkoutSession = {
  program: Program;
  program_day: ProgramDay;
  current_week: number;
  current_phase?: number;
  user_progress: UserProgramProgress;
  completed_exercises: WorkoutExercise[]; // Exercises completed in current session
  current_exercise_index: number; // Which exercise they're currently on
  session_notes?: string;
};

// For API responses
export type ProgramGenerationRequest = {
  program_name: string; // e.g., "Jeff Nippard's Ultimate PPL"
  user_experience?: "beginner" | "intermediate" | "advanced";
  available_days?: number; // Days per week available
  goals?: string[]; // e.g., ["strength", "muscle_gain", "fat_loss"]
  equipment?: string[]; // Available equipment
  time_per_session?: number; // Minutes per workout
  auto_assign?: boolean; // Whether to automatically assign the program to the user
};

export type ProgramGenerationResponse = {
  program: Program;
  success: boolean;
  message?: string;
  confidence_score?: number; // How confident the AI is about this program match
};
