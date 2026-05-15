import { db } from '@/lib/db'
import { eq, and, sql } from 'drizzle-orm'
import { users, patterns, problems, userProgress, lessonAttempts } from './schema'
import type { StepResult } from './schema'

export async function getOrCreateUser(clerkId: string, email: string, displayName?: string | null) {
  const existing = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) })
  if (existing) return existing
  const [created] = await db
    .insert(users)
    .values({ clerkId, email, displayName: displayName ?? null })
    .returning()
  return created
}

export async function getUserByClerkId(clerkId: string) {
  return db.query.users.findFirst({ where: eq(users.clerkId, clerkId) })
}

export async function getLearningPath(userId: string) {
  const allPatterns = await db.query.patterns.findMany({
    with: {
      problems: { orderBy: (p, { asc }) => [asc(p.sortOrder)] },
    },
    orderBy: (p, { asc }) => [asc(p.sortOrder)],
  })

  const progress = await db.query.userProgress.findMany({
    where: eq(userProgress.userId, userId),
  })
  const progressMap = new Map(progress.map(p => [p.problemId, p.status]))

  return allPatterns.map(pattern => {
    let foundCurrent = false
    const displayProblems = pattern.problems.map(problem => {
      const status = progressMap.get(problem.id)
      let displayStatus: 'done' | 'current' | 'locked'

      if (!pattern.isPublished || !problem.isPublished) {
        displayStatus = 'locked'
      } else if (status === 'completed') {
        displayStatus = 'done'
      } else if (!foundCurrent) {
        displayStatus = 'current'
        foundCurrent = true
      } else {
        displayStatus = 'locked'
      }

      return { ...problem, displayStatus }
    })

    return { ...pattern, problems: displayProblems }
  })
}

export async function getProblem(slug: string) {
  return db.query.problems.findFirst({
    where: eq(problems.slug, slug),
    with: { pattern: true },
  })
}

export async function recordAttempt({
  userId,
  problemId,
  accuracy,
  heartsRemaining,
  xpEarned,
  stepResults,
}: {
  userId: string
  problemId: string
  accuracy: number
  heartsRemaining: number
  xpEarned: number
  stepResults: StepResult[]
}) {
  const passed = accuracy >= 60

  await db.insert(lessonAttempts).values({
    userId, problemId, accuracy, heartsRemaining, xpEarned,
    stepResults, completedAt: new Date(),
  })

  await db
    .insert(userProgress)
    .values({
      userId, problemId,
      status: passed ? 'completed' : 'in_progress',
      bestAccuracy: accuracy,
      attempts: 1,
      completedAt: passed ? new Date() : null,
    })
    .onConflictDoUpdate({
      target: [userProgress.userId, userProgress.problemId],
      set: {
        status: passed
          ? 'completed'
          : sql`CASE WHEN ${userProgress.status} = 'completed' THEN 'completed' ELSE 'in_progress' END`,
        bestAccuracy: sql`GREATEST(${userProgress.bestAccuracy}, ${accuracy})`,
        attempts: sql`${userProgress.attempts} + 1`,
        completedAt: passed
          ? sql`COALESCE(${userProgress.completedAt}, NOW())`
          : userProgress.completedAt,
        updatedAt: new Date(),
      },
    })

  if (passed && xpEarned > 0) {
    const today = new Date().toISOString().slice(0, 10)
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
    if (!user) return null

    const last = user.streakLastDate
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
    const newStreak = last === today
      ? user.streakCurrent
      : last === yesterday
        ? user.streakCurrent + 1
        : 1

    const [updated] = await db
      .update(users)
      .set({
        xpTotal: sql`${users.xpTotal} + ${xpEarned}`,
        streakCurrent: newStreak,
        streakLastDate: last === today ? last : today,
      })
      .where(eq(users.id, userId))
      .returning({ xpTotal: users.xpTotal, streakCurrent: users.streakCurrent })

    return updated
  }

  return null
}
