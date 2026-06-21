import type { DemoState, FlowType } from '../App'

interface Props {
  state: DemoState
}

const flowApi: Record<FlowType, { name: string; host: string }> = {
  sni: { name: 'Microsoft Graph', host: 'graph.microsoft.com' },
  msi: { name: 'Azure Key Vault', host: 'tokenbinding.vault.azure.net' },
  'fic-sni': { name: 'Microsoft Graph', host: 'graph.microsoft.com' },
  'fic-msi': { name: 'Microsoft Graph', host: 'graph.microsoft.com' },
}

export default function MtlsPage({ state }: Props) {
  const step4 = state.steps.find(s => s.step === 4)
  const isActive = step4?.status === 'complete' || step4?.status === 'running'
  const api = flowApi[state.activeFlow]

  return (
    <div className="animate-in">
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>mTLS Channel</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 32 }}>
        Secure transport layer with certificate-bound authentication
      </p>

      {/* Tunnel Visualization */}
      <div style={{ position: 'relative', padding: '40px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
          {/* App side */}
          <div className="glow-card" style={{ width: 180, textAlign: 'center', padding: 20 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>💻</div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>TrustFlow App</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Client Certificate</div>
          </div>

          {/* Tunnel */}
          <div style={{ flex: 1, maxWidth: 400, padding: '0 20px' }}>
            <div style={{
              height: 48, borderRadius: 24, position: 'relative', overflow: 'hidden',
              background: 'linear-gradient(90deg, rgba(59,130,246,0.1), rgba(6,182,212,0.1), rgba(20,184,166,0.1))',
              border: `1px solid ${isActive ? 'rgba(6,182,212,0.4)' : 'var(--border-subtle)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {isActive && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  background: 'linear-gradient(90deg, transparent 0%, rgba(6,182,212,0.2) 50%, transparent 100%)',
                  animation: 'beam-move 2s ease-in-out infinite'
                }} />
              )}
              <span style={{ fontSize: 11, fontWeight: 600, color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', zIndex: 1 }}>
                {isActive ? '🔒 TLS 1.2 Encrypted' : '○ Awaiting Connection'}
              </span>
            </div>
            <div style={{ textAlign: 'center', marginTop: 8, fontSize: 10, color: 'var(--text-muted)' }}>
              mTLS Mutual Authentication
            </div>
          </div>

          {/* API side */}
          <div className="glow-card" style={{ width: 180, textAlign: 'center', padding: 20 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>☁️</div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{api.name}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{api.host}</div>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginTop: 24 }}>
        {[
          { label: 'Client Certificate', status: state.steps[0]?.status === 'complete', icon: '🔐' },
          { label: 'TLS Handshake', status: isActive, icon: '🤝' },
          { label: 'Cert Presented', status: isActive, icon: '📜' },
          { label: 'Token Bound', status: state.steps[2]?.status === 'complete', icon: '🔑' },
          { label: 'Target Verified', status: step4?.status === 'complete', icon: '✓' },
        ].map((item, i) => (
          <div key={i} style={{
            background: 'var(--bg-elevated)', border: `1px solid ${item.status ? 'var(--success)' : 'var(--border-subtle)'}`,
            borderRadius: 'var(--radius-md)', padding: '14px 12px', textAlign: 'center',
            boxShadow: item.status ? '0 0 12px rgba(16,185,129,0.2)' : 'none'
          }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{item.icon}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: item.status ? 'var(--success)' : 'var(--text-muted)', textTransform: 'uppercase' }}>
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
