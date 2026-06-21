import { useEffect, useRef } from 'react'
import type { DemoState } from '../App'
import TrustPipeline from '../components/TrustPipeline'

interface Props {
  state: DemoState
  onRunDemo: () => void
  msalLogs: string[]
}

export default function Overview({ state, onRunDemo, msalLogs }: Props) {
  const allComplete = state.steps.every(s => s.status === 'complete')
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [msalLogs])

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div className="hero-section">
        <h1 className="hero-title">Identity trust, proven in motion.</h1>
        <p className="hero-subtitle">
          Watch a certificate-backed identity flow acquire a bound token and verify access to a downstream API using mTLS.
        </p>
      </div>

      <TrustPipeline steps={state.steps} flow={state.activeFlow} />

      {allComplete && (
        <div style={{ textAlign: 'center', marginTop: 32, animation: 'fade-in-up 0.6s ease-out' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 12,
            padding: '16px 32px', borderRadius: 'var(--radius-xl)',
            background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            <span style={{ fontSize: 24 }}>✓</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--success)' }}>Trust Established</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>End-to-end certificate-bound access confirmed. Zero key export.</div>
            </div>
          </div>
        </div>
      )}

      {!state.isRunning && !allComplete && (
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <button className="run-button" onClick={onRunDemo} style={{ fontSize: 15, padding: '14px 40px' }}>
            ▶ Launch Trust Flow
          </button>
        </div>
      )}

      {state.isRunning && (
        <div style={{ textAlign: 'center', marginTop: 32, color: 'var(--text-muted)', fontSize: 13 }}>
          Trust path initializing...
        </div>
      )}

      {/* MSAL Verbose Logs */}
      {msalLogs.length > 0 && (
        <div style={{
          marginTop: 32,
          background: 'var(--bg-surface)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          flex: 1,
          minHeight: 200,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
            background: 'rgba(59, 130, 246, 0.03)',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--success)',
                boxShadow: '0 0 6px var(--success)'
              }} />
              <span style={{
                fontSize: 13, fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'var(--accent-blue)'
              }}>
                MSAL Verbose Logs
              </span>
            </div>
            <span style={{
              fontSize: 12, color: 'var(--text-muted)',
              background: 'rgba(255,255,255,0.05)',
              padding: '4px 10px', borderRadius: 'var(--radius-sm)'
            }}>
              {msalLogs.length} entries
            </span>
          </div>
          {/* Log content */}
          <div
            ref={logRef}
            style={{
              padding: '16px 20px',
              flex: 1,
              overflowY: 'auto',
              fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", "Consolas", monospace',
              fontSize: '11.5px',
              lineHeight: '1.7',
              color: 'var(--text-secondary)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              scrollBehavior: 'smooth'
            }}
          >
            {msalLogs.map((log, i) => {
              const isError = log.includes('[Error]')
              const isWarning = log.includes('[Warning]')
              const isInfo = log.includes('[Info]')
              const isAlways = log.includes('[Always]')
              const color = isError ? 'var(--error)' : isWarning ? 'var(--warning)' : isInfo ? 'var(--accent-blue)' : isAlways ? 'var(--success)' : 'var(--text-muted)'
              return (
                <div key={i} style={{ color, marginBottom: 3, paddingLeft: 8, borderLeft: `2px solid ${isError ? 'var(--error)' : isInfo ? 'rgba(59,130,246,0.3)' : 'transparent'}` }}>
                  {log}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
