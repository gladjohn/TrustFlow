import type { DemoState, FlowType } from '../App'

interface Props {
  state: DemoState
}

const flowParams: Record<FlowType, { authority: string; tenant: string; scope: string; identity: string; region: string }> = {
  sni: {
    authority: 'login.microsoftonline.com',
    tenant: 'bea21ebe-8b64-...',
    scope: 'https://graph.microsoft.com/.default',
    identity: 'LabAuth.MSIDLab.com (SNI)',
    region: 'westus3',
  },
  msi: {
    authority: 'IMDS (169.254.169.254)',
    tenant: 'System-Assigned',
    scope: 'https://vault.azure.net',
    identity: 'Managed Identity (SAMI)',
    region: 'Auto-detected via IMDS',
  },
  'fic-sni': {
    authority: 'login.microsoftonline.com',
    tenant: 'bea21ebe-8b64-...',
    scope: 'api://AzureADTokenExchange → Graph',
    identity: 'LabAuth.MSIDLab.com (SNI → FIC)',
    region: 'westus3',
  },
  'fic-msi': {
    authority: 'IMDS → login.microsoftonline.com',
    tenant: 'System-Assigned → FIC Exchange',
    scope: 'api://AzureADTokenExchange → Graph',
    identity: 'Managed Identity → FIC',
    region: 'Auto-detected → westus3',
  },
}

export default function TokenPage({ state }: Props) {
  const token = state.tokenResult
  const pop = state.popResult
  const params = flowParams[state.activeFlow]

  return (
    <div className="animate-in">
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Token Acquisition</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>
        MSAL Token Engine — acquiring bound credentials
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left: Request Parameters */}
        <div className="glow-card">
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: 16 }}>
            Request Parameters
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
            <div><span style={{ color: 'var(--text-muted)' }}>Authority:</span><br/><span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{params.authority}</span></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Identity:</span><br/><span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{params.tenant}</span></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Scope:</span><br/><span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{params.scope}</span></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Credential:</span><br/><span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{params.identity}</span></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Region:</span><br/><span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{params.region}</span></div>
          </div>
        </div>

        {/* Center: Engine */}
        <div style={{ textAlign: 'center', paddingTop: 32 }}>
          <div style={{
            width: 100, height: 100, borderRadius: '50%', margin: '0 auto',
            background: 'var(--bg-elevated)', border: '2px solid var(--accent-blue)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: token?.success ? 'var(--glow-success)' : '0 0 24px rgba(59,130,246,0.3)',
            borderColor: token?.success ? 'var(--success)' : 'var(--accent-blue)'
          }}>
            <span style={{ fontSize: 32 }}>⚡</span>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginTop: 12 }}>
            MSAL Token Engine
          </div>
        </div>

        {/* Right: Result */}
        <div className={`glow-card ${token?.success ? 'success' : ''}`}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: 16 }}>
            Authentication Result
          </div>
          {token ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Status:</span> <span style={{ color: token.success ? 'var(--success)' : 'var(--error)', fontWeight: 600 }}>{token.success ? '✓ Token Acquired' : '✗ Failed'}</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Type:</span> <span style={{ color: 'var(--text-secondary)' }}>{token.tokenType}</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Expires:</span> <span style={{ color: 'var(--text-secondary)' }}>{token.expiresOn}</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Source:</span> <span style={{ color: 'var(--text-secondary)' }}>{token.source}</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Latency:</span> <span style={{ color: 'var(--text-secondary)' }}>{token.elapsedMs}ms</span></div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Waiting for token acquisition...</div>
          )}
        </div>
      </div>

      {/* PoP Token Card */}
      {pop && (
        <div className={`glow-card ${pop.success ? 'success' : 'error'}`} style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>🔑</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Binding Certificate Available</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                The app receives a certificate reference for downstream mTLS. Token type: <strong>{pop.tokenType}</strong> — private key is not exported.
              </div>
            </div>
            <span className="status-badge success" style={{ marginLeft: 'auto' }}>PoP Bound</span>
          </div>
        </div>
      )}
    </div>
  )
}
