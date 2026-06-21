import type { DemoState } from '../App'

interface Props {
  state: DemoState
  onReset: () => void
  onRunAgain: () => void
}

export default function ResultsPage({ state, onReset, onRunAgain }: Props) {
  const allComplete = state.steps.every(s => s.status === 'complete')

  const cards = [
    { icon: '🔐', title: 'Certificate Selected', status: state.steps[0]?.status === 'complete' },
    { icon: '🛡️', title: 'Private Key Protected', status: state.steps[0]?.status === 'complete' },
    { icon: '⚡', title: 'Token Acquired', status: state.steps[1]?.status === 'complete' },
    { icon: '🔑', title: 'Binding Certificate Available', status: state.steps[2]?.status === 'complete' },
    { icon: '🔒', title: 'mTLS Channel Established', status: state.steps[3]?.status === 'complete' },
    { icon: '✓', title: 'Downstream API Verified', status: state.steps[4]?.status === 'complete' },
  ]

  return (
    <div className="animate-in">
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Results</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>
        Executive summary of the trust flow verification
      </p>

      <div className="results-grid">
        {cards.map((card, i) => (
          <div key={i} className={`result-card ${card.status ? 'verified' : ''}`} style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="result-card-icon">{card.icon}</div>
            <div className="result-card-title">{card.title}</div>
            <div className="result-card-status" style={{ color: card.status ? 'var(--success)' : 'var(--text-muted)' }}>
              {card.status ? '● Verified' : '○ Pending'}
            </div>
          </div>
        ))}
      </div>

      {allComplete && (
        <div style={{
          textAlign: 'center', marginTop: 40, padding: '32px 48px',
          background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: 'var(--radius-xl)'
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--success)', marginBottom: 8 }}>
            Trust established without exporting the private key.
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 500, margin: '0 auto' }}>
            The complete identity flow — from certificate store through MSAL token engine into a bound mTLS channel — verified successful downstream API access.
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 32 }}>
        <button onClick={onReset} style={{
          padding: '10px 24px', borderRadius: 20, border: '1px solid var(--border-subtle)',
          background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer'
        }}>
          Reset Demo
        </button>
        <button className="run-button" onClick={onRunAgain}>
          ▶ Run Again
        </button>
      </div>
    </div>
  )
}
