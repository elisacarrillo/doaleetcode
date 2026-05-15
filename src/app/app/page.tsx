import { auth } from '@clerk/nextjs/server'
import { getUserByClerkId, getLearningPath } from '@/db/queries'
import { MapView } from './MapView'

const PATTERN_ICONS: Record<string, string> = {
  'arrays-hashing':  '⚡',
  'two-pointers':    '👆',
  'sliding-window':  '🪟',
  'stack':           '📚',
  'binary-search':   '🔍',
  'linked-list':     '🔗',
  'trees':           '🌲',
  'heap':            '🏔️',
  'graphs':          '🕸️',
}

export default async function MapPage() {
  const { userId: clerkId } = await auth()
  const dbUser = await getUserByClerkId(clerkId!)

  const path = dbUser
    ? await getLearningPath(dbUser.id)
    : []

  const patterns = path.map(p => ({
    slug:        p.slug,
    title:       p.title,
    icon:        PATTERN_ICONS[p.slug] ?? '📘',
    isPublished: p.isPublished,
    problems:    p.problems.map(pr => ({
      slug:          pr.slug,
      title:         pr.title,
      difficulty:    pr.difficulty,
      xpReward:      pr.xpReward,
      displayStatus: pr.displayStatus,
    })),
  }))

  return (
    <MapView
      patterns={patterns}
      xp={dbUser?.xpTotal ?? 0}
      streak={dbUser?.streakCurrent ?? 0}
    />
  )
}
