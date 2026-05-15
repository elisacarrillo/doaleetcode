import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function HomePage() {
  const { userId } = await auth()
  if (userId) redirect('/app')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1.5rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--purple-600)' }}>grind.lc</h1>
      <p style={{ color: 'var(--muted)', fontSize: '1rem' }}>Master algorithms, one pattern at a time.</p>
      <Link href="/sign-in" style={{ background: 'var(--purple-600)', color: '#fff', padding: '12px 28px', borderRadius: '10px', fontWeight: 700, textDecoration: 'none', fontSize: '15px' }}>
        Get started
      </Link>
    </div>
  )
}
