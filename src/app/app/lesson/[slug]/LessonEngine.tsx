'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AppUserButton } from '@/app/app/AppUserButton'
import type { Step, CodeSegment, StepOption, ProblemExample } from '@/db/schema'

type Problem = {
  id: string
  slug: string
  title: string
  difficulty: string
  xpReward: number
  sortOrder: number
  statement: string
  examples: ProblemExample[]
  steps: Step[]
}

interface Props {
  problem: Problem
  patternTitle: string
  initialXp: number
  initialStreak: number
  dbUserId: string
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function setsEqual(a: Set<number>, b: Set<number>) {
  if (a.size !== b.size) return false
  for (const x of a) if (!b.has(x)) return false
  return true
}

function getBlankSegments(code: CodeSegment[]) {
  return code.filter((s): s is { blank: number; label: string; answer: string } => 'blank' in s)
}

export function LessonEngine({ problem, patternTitle, initialXp, initialStreak, dbUserId }: Props) {
  const router = useRouter()
  const steps = problem.steps

  // lesson state
  const [stepIdx, setStepIdx]           = useState(0)
  const [answered, setAnswered]         = useState(false)
  const [stepCorrect, setStepCorrect]   = useState(false)
  const [selected, setSelected]         = useState<Set<number>>(new Set())
  const [hearts, setHearts]             = useState(8)
  const [xp, setXp]                     = useState(initialXp)
  const [xpEarned, setXpEarned]         = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [totalCount, setTotalCount]     = useState(0)
  const [phase, setPhase]               = useState<'lesson' | 'complete'>('lesson')

  // fillin state
  const [filledBlanks, setFilledBlanks]     = useState<(string | null)[]>([])
  const [activeBlank, setActiveBlank]       = useState<number | null>(null)
  const [usedTokenIdxs, setUsedTokenIdxs]   = useState<Set<number>>(new Set())
  const [shuffledTokens, setShuffledTokens] = useState<string[]>([])
  const [blankTokenIdxs, setBlankTokenIdxs] = useState<(number | null)[]>([])

  // snapshot of the last completed fillin, shown on the complexity step
  const [lastFillin, setLastFillin] = useState<{ code: CodeSegment[]; filled: string[] } | null>(null)

  // XP animation
  const xpChipRef = useRef<HTMLSpanElement>(null)

  const initStep = useCallback((idx: number) => {
    const step = steps[idx]
    setSelected(new Set())
    setActiveBlank(null)
    if (step.type === 'fillin') {
      const blanks = getBlankSegments(step.code)
      const count = blanks.length
      setFilledBlanks(new Array(count).fill(null))
      setBlankTokenIdxs(new Array(count).fill(null))
      setUsedTokenIdxs(new Set())
      setShuffledTokens(shuffle(step.tokens))
    }
  }, [steps])

  useEffect(() => { initStep(0) }, [initStep])

  const step = steps[stepIdx]

  const isCheckEnabled = () => {
    if (answered) return true
    if (step.type === 'fillin') return filledBlanks.every(v => v !== null)
    return selected.size > 0
  }

  function handleOptionClick(i: number) {
    if (answered) return
    if (step.type === 'clarifying') {
      setSelected(prev => {
        const next = new Set(prev)
        next.has(i) ? next.delete(i) : next.add(i)
        return next
      })
    } else {
      setSelected(new Set([i]))
    }
  }

  function handleBlankClick(bi: number) {
    if (answered) return
    if (filledBlanks[bi] !== null) {
      // return token to pool
      setUsedTokenIdxs(prev => { const s = new Set(prev); s.delete(blankTokenIdxs[bi]!); return s })
      setFilledBlanks(prev => { const a = [...prev]; a[bi] = null; return a })
      setBlankTokenIdxs(prev => { const a = [...prev]; a[bi] = null; return a })
      setActiveBlank(bi)
    } else {
      setActiveBlank(prev => prev === bi ? null : bi)
    }
  }

  function handleTokenClick(di: number) {
    if (answered || usedTokenIdxs.has(di) || activeBlank === null) return
    const bi = activeBlank
    const prevTokenIdx = blankTokenIdxs[bi]
    if (prevTokenIdx !== null) {
      setUsedTokenIdxs(prev => { const s = new Set(prev); s.delete(prevTokenIdx); return s })
    }
    setFilledBlanks(prev => { const a = [...prev]; a[bi] = shuffledTokens[di]; return a })
    setBlankTokenIdxs(prev => { const a = [...prev]; a[bi] = di; return a })
    setUsedTokenIdxs(prev => new Set([...prev, di]))

    // auto-advance to next empty blank
    const n = filledBlanks.length
    let next: number | null = null
    for (let i = bi + 1; i < n; i++) if (filledBlanks[i] === null && i !== bi) { next = i; break }
    if (next === null) for (let i = 0; i < bi; i++) if (filledBlanks[i] === null) { next = i; break }
    // update immediately using new filled state
    setActiveBlank(next)
  }

  function handleTryAgain() {
    setAnswered(false)
    setStepCorrect(false)
    initStep(stepIdx)
  }

  async function handleCheck() {
    if (answered && stepCorrect) {
      // only advance on correct
      if (stepIdx < steps.length - 1) {
        if (step.type === 'fillin') {
          setLastFillin({ code: step.code, filled: filledBlanks as string[] })
        }
        const next = stepIdx + 1
        setStepIdx(next)
        setAnswered(false)
        setStepCorrect(false)
        initStep(next)
      } else {
        const acc = totalCount > 0 ? Math.round(correctCount / totalCount * 100) : 100
        await fetch('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            problemId: problem.id,
            accuracy: acc,
            heartsRemaining: hearts,
            xpEarned,
            stepResults: steps.map((_, i) => ({
              stepIndex: i,
              type: steps[i].type,
              correct: true,
              attempts: 1,
            })),
          }),
        })
        setPhase('complete')
      }
      return
    }

    let correct = false
    if (step.type === 'clarifying') {
      const correctSet = new Set(
        (step.options as StepOption[]).map((o, i) => o.correct ? i : -1).filter(i => i >= 0)
      )
      correct = setsEqual(correctSet, selected)
    } else if (step.type === 'algorithm' || step.type === 'complexity') {
      correct = selected.has((step.options as StepOption[]).findIndex(o => o.correct))
    } else if (step.type === 'fillin') {
      const blanks = getBlankSegments(step.code)
      correct = blanks.every(b => filledBlanks[b.blank] === b.answer)
    }

    setAnswered(true)
    setStepCorrect(correct)
    setTotalCount(t => t + 1)

    if (correct) {
      setCorrectCount(c => c + 1)
      const gain = 15
      setXpEarned(e => e + gain)
      setXp(x => x + gain)
      // bump animation
      xpChipRef.current?.classList.remove('bump')
      void xpChipRef.current?.offsetWidth
      xpChipRef.current?.classList.add('bump')
    } else {
      setHearts(h => Math.max(0, h - 1))
    }
  }

  if (phase === 'complete') {
    const acc = totalCount > 0 ? Math.round(correctCount / totalCount * 100) : 100
    const heartsDisplay = (hearts / 2).toFixed(1).replace('.0', '') + ' / 4'
    return (
      <>
        <div className="topbar">
          <div className="topbar-left" />
          <div className="topbar-right">
            <span ref={xpChipRef} className="xp-chip">{xp} XP</span>
            <AppUserButton />
          </div>
        </div>
        <div className="completion-wrap">
          <span className="completion-emoji">🎉</span>
          <div className="completion-title">{problem.title} complete!</div>
          <div className="completion-subtitle">You earned XP and kept your streak alive.</div>
          <div className="completion-xp-num">+{xpEarned}</div>
          <div className="completion-xp-label">XP earned</div>
          <div className="completion-stats">
            <div className="stat-item"><div className="stat-val">{acc}%</div><div className="stat-lbl">Accuracy</div></div>
            <div className="stat-item"><div className="stat-val">{heartsDisplay}</div><div className="stat-lbl">Hearts left</div></div>
            <div className="stat-item"><div className="stat-val">{correctCount}/{totalCount}</div><div className="stat-lbl">Correct</div></div>
          </div>
          <button className="back-to-map-btn" onClick={() => router.push('/app')}>
            Back to path →
          </button>
        </div>
      </>
    )
  }

  if (hearts === 0 && !answered) {
    return (
      <>
        <Topbar xp={xp} hearts={hearts} xpChipRef={xpChipRef} onBack={() => router.push('/app')} />
        <div className="lesson-body">
          <div className="try-again-box">
            <p>💔 You ran out of hearts!</p>
            <button className="try-again-btn" onClick={() => router.refresh()}>Try Again</button>
          </div>
        </div>
      </>
    )
  }

  const stepNum = stepIdx + 1
  const totalSteps = steps.length

  return (
    <>
      <Topbar xp={xp} hearts={hearts} xpChipRef={xpChipRef} onBack={() => router.push('/app')} />

      <div className="problem-banner">
        <div className="banner-meta">{patternTitle} · Problem {problem.sortOrder}</div>
        <div className="banner-title">
          {problem.title}
          <span className={`banner-diff diff-badge diff-${problem.difficulty}`}>{problem.difficulty}</span>
        </div>
      </div>

      <div className="lesson-body">
        <ProblemCard problem={problem} />
        <StepCard
          step={step}
          stepNum={stepNum}
          totalSteps={totalSteps}
          answered={answered}
          stepCorrect={stepCorrect}
          selected={selected}
          filledBlanks={filledBlanks}
          activeBlank={activeBlank}
          shuffledTokens={shuffledTokens}
          usedTokenIdxs={usedTokenIdxs}
          lastFillin={lastFillin}
          onOptionClick={handleOptionClick}
          onBlankClick={handleBlankClick}
          onTokenClick={handleTokenClick}
        />
      </div>

      <div className="check-wrap">
        {answered && !stepCorrect ? (
          <button className="check-btn" style={{ background: 'var(--red-600)' }} onClick={handleTryAgain}>
            Try again
          </button>
        ) : (
          <button
            className="check-btn"
            disabled={!isCheckEnabled()}
            onClick={handleCheck}
          >
            {answered && stepCorrect
              ? (stepIdx === steps.length - 1 ? 'Finish ✓' : 'Continue →')
              : 'Check'}
          </button>
        )}
      </div>
    </>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProblemCard({ problem }: { problem: Problem }) {
  const [examplesOpen, setExamplesOpen] = useState(true)

  return (
    <div className="step-card" style={{ marginBottom: 12 }}>
      <div className="step-tag">📋 Problem</div>
      <div className="step-body">
        <p style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text)', marginBottom: problem.examples.length > 0 ? 12 : 0 }}>
          {problem.statement}
        </p>
        {problem.examples.length > 0 && (
          <>
            <button
              onClick={() => setExamplesOpen(o => !o)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: 'var(--purple-600)', padding: 0, letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: examplesOpen ? 8 : 0 }}
            >
              {examplesOpen ? '▾ Examples' : '▸ Examples'}
            </button>
            {examplesOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {problem.examples.map((ex, i) => (
                  <div key={i} className="code-block" style={{ marginBottom: 0, fontSize: 12, lineHeight: 1.75 }}>
                    <span style={{ color: '#a8a29e' }}>Input:&nbsp;&nbsp;&nbsp;</span><span>{ex.input}</span>
                    {'\n'}
                    <span style={{ color: '#a8a29e' }}>Output:&nbsp;&nbsp;</span><span style={{ color: '#8ecf55' }}>{ex.output}</span>
                    {ex.explanation && (
                      <>{'\n'}<span style={{ color: '#a8a29e' }}>// {ex.explanation}</span></>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Topbar({
  xp, hearts, xpChipRef, onBack,
}: {
  xp: number; hearts: number; xpChipRef: React.RefObject<HTMLSpanElement | null>; onBack: () => void
}) {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <button className="back-btn-top" onClick={onBack}>←</button>
      </div>
      <div className="topbar-right">
        <div className="hearts">
          {[0, 1, 2, 3].map(i => {
            const units = Math.max(0, Math.min(2, hearts - i * 2))
            return <span key={i} className="heart">{units >= 2 ? '❤️' : units === 1 ? '💔' : '🤍'}</span>
          })}
        </div>
        <span ref={xpChipRef} className="xp-chip">{xp} XP</span>
            <AppUserButton />
      </div>
    </div>
  )
}

function StepCard({
  step, stepNum, totalSteps, answered, stepCorrect, selected,
  filledBlanks, activeBlank, shuffledTokens, usedTokenIdxs, lastFillin,
  onOptionClick, onBlankClick, onTokenClick,
}: {
  step: Step
  stepNum: number
  totalSteps: number
  answered: boolean
  stepCorrect: boolean
  selected: Set<number>
  filledBlanks: (string | null)[]
  activeBlank: number | null
  shuffledTokens: string[]
  usedTokenIdxs: Set<number>
  lastFillin: { code: CodeSegment[]; filled: string[] } | null
  onOptionClick: (i: number) => void
  onBlankClick: (bi: number) => void
  onTokenClick: (di: number) => void
}) {
  const letters = ['A', 'B', 'C', 'D', 'E', 'F']

  let body: React.ReactNode

  if (step.type === 'clarifying' || step.type === 'algorithm' || step.type === 'complexity') {
    const options = step.options as StepOption[]
    body = (
      <>
        {step.type === 'clarifying' && step.sub && (
          <div className="step-sublabel">{step.sub}</div>
        )}
        {step.type === 'complexity' && lastFillin && (
          <div className="code-block" style={{ marginBottom: 14, fontSize: 12, lineHeight: 1.85 }}>
            {lastFillin.code.map((seg, i) =>
              't' in seg
                ? <span key={i}>{seg.t}</span>
                : <span key={i} style={{ color: '#8ecf55' }}>{lastFillin.filled[seg.blank] ?? seg.answer}</span>
            )}
          </div>
        )}
        <div className="step-prompt">{step.prompt}</div>
        {options.map((o, i) => {
          let cls = 'option-row'
          if (answered) {
            cls += ' answered-opt'
            if (o.correct && selected.has(i)) cls += ' opt-correct'
            else if (!o.correct && selected.has(i)) cls += ' opt-wrong'
            else if (o.correct && !selected.has(i)) cls += ' opt-missed'
          } else if (selected.has(i)) {
            cls += ' selected'
          }
          return (
            <div key={i} className={cls} onClick={() => onOptionClick(i)}>
              <span className="opt-letter">{letters[i]}.</span>
              <span>{o.text}</span>
            </div>
          )
        })}
      </>
    )
  } else if (step.type === 'fillin') {
    const blanks = getBlankSegments(step.code)
    let codeNodes: React.ReactNode[] = []
    step.code.forEach((seg, i) => {
      if ('t' in seg) {
        codeNodes.push(<span key={i}>{seg.t}</span>)
      } else {
        const bi = seg.blank
        const val = filledBlanks[bi]
        const isActive = activeBlank === bi
        let cls = 'blank-slot'
        if (val !== null) {
          cls += answered
            ? (val === seg.answer ? ' b-correct' : ' b-wrong')
            : ' b-filled'
        } else if (isActive && !answered) {
          cls += ' b-active'
        }
        codeNodes.push(
          <span key={i} className={cls} onClick={() => onBlankClick(bi)}>
            {val ?? '     '}
          </span>
        )
      }
    })

    body = (
      <>
        <div className="step-prompt">{step.prompt}</div>
        <div className="code-block">{codeNodes}</div>
        <div className="token-pool">
          {shuffledTokens.map((tok, di) => (
            <span
              key={di}
              className={`token-chip${usedTokenIdxs.has(di) ? ' token-used' : ''}`}
              onClick={() => onTokenClick(di)}
            >
              {tok}
            </span>
          ))}
        </div>
      </>
    )
  }

  const feedback = step.feedback
  const feedbackText = stepCorrect ? feedback.ok : feedback.bad

  return (
    <div className="step-card">
      <div className="step-tag">✦ {step.tag}</div>
      <div className="step-body">
        {body}
        {answered && (
          <div className={`feedback-bar ${stepCorrect ? 'fb-pass' : 'fb-fail'}`}>
            <span className="fb-icon">{stepCorrect ? '✓' : '✗'}</span>
            <span>{feedbackText}</span>
          </div>
        )}
      </div>
    </div>
  )
}
