import { auth, currentUser } from '@clerk/nextjs/server'
import { getOrCreateUser } from '@/db/queries'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return null // middleware already redirects, this is a safety net

  const clerkUser = await currentUser()
  await getOrCreateUser(
    clerkId,
    clerkUser?.emailAddresses[0]?.emailAddress ?? '',
    clerkUser?.firstName ?? null,
  )

  return <>{children}</>
}
