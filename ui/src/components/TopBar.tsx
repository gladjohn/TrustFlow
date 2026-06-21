import type { FlowType } from '../App'

interface Props {
  onRunDemo: () => void
  isRunning: boolean
  activeFlow: FlowType
  onFlowChange: (flow: FlowType) => void
}

const flowOptions: { id: FlowType; label: string; icon: string; description: string }[] = [
  { id: 'sni', label: 'SNI Cert', icon: '🔐', description: 'Certificate-based mTLS PoP' },
  { id: 'msi', label: 'MSI v2', icon: '🤖', description: 'Managed Identity mTLS PoP' },
  { id: 'fic-sni', label: 'FIC (SNI)', icon: '🔗', description: 'Federated: SNI → Exchange' },
  { id: 'fic-msi', label: 'FIC (MSI)', icon: '⛓️', description: 'Federated: MSI → Exchange' },
]

export default function TopBar({ onRunDemo, isRunning, activeFlow, onFlowChange }: Props) {
  return (
    <header className="top-bar">
      <div className="top-bar-left">
        <span className="app-title">TrustFlow</span>
        <span className="env-badge live">● Live</span>

        {/* Flow selector */}
        <div style={{ display: 'flex', gap: 4, marginLeft: 12, background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 3 }}>
          {flowOptions.map(f => (
            <button
              key={f.id}
              onClick={() => onFlowChange(f.id)}
              disabled={isRunning}
              title={f.description}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 12px', borderRadius: 6, border: 'none', cursor: isRunning ? 'not-allowed' : 'pointer',
                fontSize: 12, fontWeight: 600, letterSpacing: '0.3px',
                background: activeFlow === f.id ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                color: activeFlow === f.id ? 'var(--accent-cyan)' : 'var(--text-muted)',
                border: activeFlow === f.id ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid transparent',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ fontSize: 14 }}>{f.icon}</span>
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="top-bar-right">
        <button className="run-button" onClick={onRunDemo} disabled={isRunning}>
          {isRunning ? '● Running...' : '▶ Run Flow'}
        </button>
      </div>
    </header>
  )
}
