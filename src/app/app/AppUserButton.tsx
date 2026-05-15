'use client'

import { useState } from 'react'
import { UserButton } from '@clerk/nextjs'

function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.36 2.64L3 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 3v5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ResetProgressPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')

  async function handleReset() {
    setStatus('loading')
    try {
      await fetch('/api/reset-xp', { method: 'POST' })
      setStatus('done')
      setTimeout(() => window.location.assign('/app'), 900)
    } catch {
      setStatus('idle')
    }
  }

  return (
    <div style={{ padding: '4px 0 24px', maxWidth: 400 }}>
      <h2 style={{
        fontFamily: 'Nunito, ui-rounded, sans-serif',
        fontWeight: 900, fontSize: 20, marginBottom: 8, color: '#2B2B2B',
      }}>
        Reset progress
      </h2>
      <p style={{
        color: '#9A9082', fontSize: 14, lineHeight: 1.65,
        marginBottom: 28, fontFamily: 'Nunito, ui-rounded, sans-serif',
        fontWeight: 600,
      }}>
        This will clear your XP, reset your streak to 0, and mark all lessons as
        incomplete — you'll start fresh from the very beginning.
      </p>

      {status === 'done' ? (
        <p style={{
          color: '#46A302', fontWeight: 800, fontSize: 15,
          fontFamily: 'Nunito, ui-rounded, sans-serif',
        }}>
          ✓ Reset complete — redirecting…
        </p>
      ) : (
        <button
          onClick={handleReset}
          disabled={status === 'loading'}
          style={{
            background: status === 'loading' ? '#DAD0BC' : '#FF4D4D',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '12px 26px',
            fontSize: 15,
            fontWeight: 900,
            fontFamily: 'Nunito, ui-rounded, sans-serif',
            cursor: status === 'loading' ? 'default' : 'pointer',
            boxShadow: status === 'loading' ? 'none' : '0 4px 0 #C92F2F',
            transition: 'background 0.15s, box-shadow 0.15s',
          }}
        >
          {status === 'loading' ? 'Resetting…' : 'Reset everything'}
        </button>
      )}
    </div>
  )
}

export function AppUserButton() {
  return (
    <UserButton>
      <UserButton.UserProfilePage
        label="Reset progress"
        url="reset-progress"
        labelIcon={<ResetIcon />}
      >
        <ResetProgressPage />
      </UserButton.UserProfilePage>
      <UserButton.MenuItems>
        <UserButton.Action
          label="Reset progress"
          labelIcon={<ResetIcon />}
          open="reset-progress"
        />
      </UserButton.MenuItems>
    </UserButton>
  )
}
