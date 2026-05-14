import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  date,
  timestamp,
  jsonb,
  pgEnum,
  unique,
  index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const difficultyEnum = pgEnum('difficulty', ['easy', 'medium', 'hard'])

export const progressStatusEnum = pgEnum('progress_status', [
  'not_started',
  'in_progress',
  'completed',
])

export const stepTypeEnum = pgEnum('step_type', [
  'clarifying',
  'algorithm',
  'fillin',
  'complexity',
])

// ─── Tables ───────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id:             uuid('id').primaryKey().defaultRandom(),
  clerkId:        text('clerk_id').notNull().unique(),
  email:          text('email').notNull(),
  displayName:    text('display_name'),
  xpTotal:        integer('xp_total').notNull().default(0),
  streakCurrent:  integer('streak_current').notNull().default(0),
  streakLastDate: date('streak_last_date'),
  createdAt:      timestamp('created_at').notNull().defaultNow(),
})

export const patterns = pgTable('patterns', {
  id:          uuid('id').primaryKey().defaultRandom(),
  slug:        text('slug').notNull().unique(),
  title:       text('title').notNull(),
  description: text('description'),
  sortOrder:   integer('sort_order').notNull(),
  isPublished: boolean('is_published').notNull().default(false),
})

export const problems = pgTable('problems', {
  id:          uuid('id').primaryKey().defaultRandom(),
  patternId:   uuid('pattern_id').notNull().references(() => patterns.id, { onDelete: 'cascade' }),
  slug:        text('slug').notNull().unique(),
  title:       text('title').notNull(),
  difficulty:  difficultyEnum('difficulty').notNull(),
  sortOrder:   integer('sort_order').notNull(),
  xpReward:    integer('xp_reward').notNull().default(60),
  isPublished: boolean('is_published').notNull().default(false),
  // Plain-English problem description shown above every step in the lesson
  statement:   text('statement').notNull().default(''),
  // One or more input/output examples shown in the problem panel
  examples:    jsonb('examples').notNull().$type<ProblemExample[]>().default([]),
  // steps: ordered array of question objects — see Step type below
  steps:       jsonb('steps').notNull().$type<Step[]>(),
})

export const userProgress = pgTable(
  'user_progress',
  {
    id:           uuid('id').primaryKey().defaultRandom(),
    userId:       uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    problemId:    uuid('problem_id').notNull().references(() => problems.id, { onDelete: 'cascade' }),
    status:       progressStatusEnum('status').notNull().default('not_started'),
    bestAccuracy: integer('best_accuracy').notNull().default(0), // 0–100
    attempts:     integer('attempts').notNull().default(0),
    completedAt:  timestamp('completed_at'),
    updatedAt:    timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    // one row per (user, problem) — enforced at DB level
    uniqUserProblem: unique().on(t.userId, t.problemId),
    userIdx:         index('user_progress_user_idx').on(t.userId),
    problemIdx:      index('user_progress_problem_idx').on(t.problemId),
  }),
)

export const lessonAttempts = pgTable(
  'lesson_attempts',
  {
    id:             uuid('id').primaryKey().defaultRandom(),
    userId:         uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    problemId:      uuid('problem_id').notNull().references(() => problems.id, { onDelete: 'cascade' }),
    accuracy:       integer('accuracy').notNull(), // 0–100 for this attempt
    heartsRemaining: integer('hearts_remaining').notNull(), // 0–4 (in half-heart units: 0–8)
    xpEarned:       integer('xp_earned').notNull().default(0),
    // per-step breakdown: [{ stepIndex, type, correct, attempts }]
    stepResults:    jsonb('step_results').notNull().$type<StepResult[]>(),
    startedAt:      timestamp('started_at').notNull().defaultNow(),
    completedAt:    timestamp('completed_at'),
  },
  (t) => ({
    userIdx:    index('lesson_attempts_user_idx').on(t.userId),
    problemIdx: index('lesson_attempts_problem_idx').on(t.problemId),
  }),
)

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  progress: many(userProgress),
  attempts: many(lessonAttempts),
}))

export const patternsRelations = relations(patterns, ({ many }) => ({
  problems: many(problems),
}))

export const problemsRelations = relations(problems, ({ one, many }) => ({
  pattern:  one(patterns, { fields: [problems.patternId], references: [patterns.id] }),
  progress: many(userProgress),
  attempts: many(lessonAttempts),
}))

export const userProgressRelations = relations(userProgress, ({ one }) => ({
  user:    one(users,    { fields: [userProgress.userId],    references: [users.id] }),
  problem: one(problems, { fields: [userProgress.problemId], references: [problems.id] }),
}))

export const lessonAttemptsRelations = relations(lessonAttempts, ({ one }) => ({
  user:    one(users,    { fields: [lessonAttempts.userId],    references: [users.id] }),
  problem: one(problems, { fields: [lessonAttempts.problemId], references: [problems.id] }),
}))

// ─── JSONB Types ──────────────────────────────────────────────────────────────
// These live here (not in a separate types file) so the schema is self-contained.

export type StepType = 'clarifying' | 'algorithm' | 'fillin' | 'complexity'

/**
 * One input/output example shown in the problem panel.
 * `explanation` is optional — include it for non-obvious examples.
 */
export type ProblemExample = {
  input:        string
  output:       string
  explanation?: string
}

/** A single option inside a clarifying / algorithm / complexity step */
export type StepOption = {
  text:    string
  correct: boolean
}

/** A segment inside a fill-in-the-blank code block */
export type CodeSegment =
  | { t: string }                                    // literal text
  | { blank: number; label: string; answer: string } // a blank slot

/** One step in a lesson — discriminated union on `type` */
export type Step =
  | {
      type:     'clarifying'
      tag:      string
      prompt:   string
      sub?:     string
      multi:    true            // clarifying is always multi-select
      options:  StepOption[]
      feedback: { ok: string; bad: string }
    }
  | {
      type:     'algorithm' | 'complexity'
      tag:      string
      prompt:   string
      multi:    false
      options:  StepOption[]
      feedback: { ok: string; bad: string }
    }
  | {
      type:     'fillin'
      tag:      string
      prompt:   string
      code:     CodeSegment[]
      tokens:   string[]        // full pool (correct answers + distractors)
      feedback: { ok: string; bad: string }
    }

/** Per-step result stored in lesson_attempts.step_results */
export type StepResult = {
  stepIndex: number
  type:      StepType
  correct:   boolean
  attempts:  number             // how many times they hit "check" on this step
}
