import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getUserByClerkId, recordAttempt } from '@/db/queries'

export async function POST(req: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { problemId, accuracy, heartsRemaining, xpEarned, stepResults } = body

  const dbUser = await getUserByClerkId(clerkId)
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const result = await recordAttempt({
    userId: dbUser.id,
    problemId,
    accuracy,
    heartsRemaining,
    xpEarned,
    stepResults,
  })

  return NextResponse.json({ ok: true, result })
}
