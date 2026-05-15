import { notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { getProblem, getUserByClerkId } from '@/db/queries'
import { LessonEngine } from './LessonEngine'

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { userId: clerkId } = await auth()

  const [problem, dbUser] = await Promise.all([
    getProblem(slug),
    getUserByClerkId(clerkId!),
  ])

  if (!problem) notFound()

  return (
    <LessonEngine
      problem={problem}
      patternTitle={problem.pattern?.title ?? ''}
      initialXp={dbUser?.xpTotal ?? 0}
      initialStreak={dbUser?.streakCurrent ?? 0}
      dbUserId={dbUser?.id ?? ''}
    />
  )
}
