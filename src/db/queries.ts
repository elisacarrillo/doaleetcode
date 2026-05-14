// drizzle.config.ts — put this at your project root
import type { Config } from 'drizzle-kit'

export default {
  schema:    './src/db/schema.ts',
  out:       './drizzle',
  dialect:   'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config


// ─── Useful query helpers (src/db/queries.ts) ─────────────────────────────────
// Copy these into a separate queries.ts file in your project.

import { db } from './index'                   // your drizzle instance
import { eq, and } from 'drizzle-orm'
import { patterns, problems, userProgress, users } from './schema'

/**
 * Fetch the full learning path for a user:
 * all patterns + their problems + this user's progress on each.
 * Used to render the map screen.
 */
export async function getLearningPath(userId: string) {
  const rows = await db
    .select({
      patternId:    patterns.id,
      patternSlug:  patterns.slug,
      patternTitle: patterns.title,
      patternOrder: patterns.sortOrder,
      problemId:    problems.id,
      problemSlug:  problems.slug,
      problemTitle: problems.title,
      difficulty:   problems.difficulty,
      xpReward:     problems.xpReward,
      sortOrder:    problems.sortOrder,
      isPublished:  problems.isPublished,
      status:       userProgress.status,
      bestAccuracy: userProgress.bestAccuracy,
    })
    .from(patterns)
    .leftJoin(problems,     eq(problems.patternId, patterns.id))
    .leftJoin(
      userProgress,
      and(
        eq(userProgress.problemId, problems.id),
        eq(userProgress.userId, userId),
      ),
    )
    .orderBy(patterns.sortOrder, problems.sortOrder)

  // Group into pattern → problems shape
  const patternMap = new Map<string, {
    id: string; slug: string; title: string; sortOrder: number
    problems: typeof rows
  }>()

  for (const row of rows) {
    if (!patternMap.has(row.patternId)) {
      patternMap.set(row.patternId, {
        id: row.patternId, slug: row.patternSlug,
        title: row.patternTitle, sortOrder: row.patternOrder,
        problems: [],
      })
    }
    if (row.problemId) patternMap.get(row.patternId)!.problems.push(row)
  }

  return Array.from(patternMap.values()).sort((a, b) => a.sortOrder - b.sortOrder)
}

/**
 * Fetch a single problem by slug, including its steps.
 * Used when loading the lesson screen.
 */
export async function getProblem(slug: string) {
  const [problem] = await db
    .select()
    .from(problems)
    .where(eq(problems.slug, slug))
    .limit(1)
  return problem ?? null
}

/**
 * Record a completed lesson attempt and update user_progress.
 * Call this from your POST /api/progress route.
 *
 * Returns updated xp and streak so the client can animate them.
 */
export async function recordAttempt({
  userId,
  problemId,
  accuracy,
  heartsRemaining,
  xpEarned,
  stepResults,
}: {
  userId:          string
  problemId:       string
  accuracy:        number
  heartsRemaining: number
  xpEarned:        number
  stepResults:     { stepIndex: number; type: string; correct: boolean; attempts: number }[]
}) {
  const passed = accuracy >= 60 // your passing threshold

  // 1. Insert the raw attempt log
  await db.insert(lessonAttempts).values({
    userId, problemId, accuracy, heartsRemaining, xpEarned, stepResults,
    completedAt: new Date(),
  })

  // 2. Upsert user_progress
  await db
    .insert(userProgress)
    .values({
      userId, problemId,
      status:       passed ? 'completed' : 'in_progress',
      bestAccuracy: accuracy,
      attempts:     1,
      completedAt:  passed ? new Date() : null,
    })
    .onConflictDoUpdate({
      target: [userProgress.userId, userProgress.problemId],
      set: {
        status: passed
          ? 'completed'
          : sql`CASE WHEN ${userProgress.status} = 'completed' THEN 'completed' ELSE 'in_progress' END`,
        bestAccuracy: sql`GREATEST(${userProgress.bestAccuracy}, ${accuracy})`,
        attempts:     sql`${userProgress.attempts} + 1`,
        completedAt:  passed
          ? sql`COALESCE(${userProgress.completedAt}, NOW())`
          : userProgress.completedAt,
        updatedAt: new Date(),
      },
    })

  // 3. Update user XP + streak
  if (passed && xpEarned > 0) {
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

    const [user] = await db
      .select({ streakCurrent: users.streakCurrent, streakLastDate: users.streakLastDate })
      .from(users)
      .where(eq(users.id, userId))

    const last       = user?.streakLastDate
    const isYesterday = last === new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
    const isToday     = last === today

    const newStreak = isToday
      ? user.streakCurrent                 // already counted today
      : isYesterday
        ? user.streakCurrent + 1           // extend streak
        : 1                                // reset

    const [updated] = await db
      .update(users)
      .set({
        xpTotal:        sql`${users.xpTotal} + ${xpEarned}`,
        streakCurrent:  newStreak,
        streakLastDate: isToday ? last : today,
      })
      .where(eq(users.id, userId))
      .returning({ xpTotal: users.xpTotal, streakCurrent: users.streakCurrent })

    return updated
  }

  return null
}

// you'll need this import at the top of queries.ts:
import { sql } from 'drizzle-orm'
import { lessonAttempts } from './schema'
