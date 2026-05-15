import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, userProgress } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function POST() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.query.users.findFirst({ where: eq(users.clerkId, clerkId) })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  await Promise.all([
    db.update(users)
      .set({ xpTotal: 0, streakCurrent: 0, streakLastDate: null })
      .where(eq(users.id, user.id)),
    db.delete(userProgress).where(eq(userProgress.userId, user.id)),
  ])

  return NextResponse.json({ ok: true })
}
