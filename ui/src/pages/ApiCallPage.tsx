import type { DemoState, FlowType } from '../App'

interface Props {
  state: DemoState
  onRunDemo: () => void
}

const flowApiDetails: Record<FlowType, { name: string; endpoint: string; method: string }> = {
  sni: { name: 'Microsoft Graph', endpoint: 'graph.microsoft.com/v1.0/applications', method: 'GET /v1.0/applications?$top=1' },
  msi: { name: 'Azure Key Vault', endpoint: 'tokenbinding.vault.azure.net/secrets', method: 'GET /secrets/boundsecret/' },
  'fic-sni': { name: 'Microsoft Graph', endpoint: 'graph.microsoft.com/v1.0/applications', method: 'GET /v1.0/applications?$top=1' },
  'fic-msi': { name: 'Microsoft Graph', endpoint: 'graph.microsoft.com/v1.0/applications', method: 'GET /v1.0/applications?$top=1' },
}

export default function ApiCallPage({ state, onRunDemo }: Props) {
  const api = state.apiResult
  const details = flowApiDetails[state.activeFlow]

  return (
    <div className="animate-in">
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>API Call</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>
        Certificate-bound access to {details.name}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left: Target */}
        <div className="glow-card">
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: 16 }}>
            API Target
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
            <div><span style={{ color: 'var(--text-muted)' }}>Service:</span> <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{details.name}</span></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Endpoint:</span><br/><span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 11 }}>{details.endpoint}</span></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Method:</span> <span style={{ color: 'var(--text-secondary)' }}>{details.method}</span></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Auth:</span> <span style={{ color: 'var(--text-secondary)' }}>Bearer + mTLS cert</span></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Binding:</span> <span className="status-badge success" style={{ fontSize: 10 }}>Certificate Bound</span></div>
          </div>
        </div>

        {/* Center: Action */}
        <div style={{ textAlign: 'center', paddingTop: 40 }}>
          <button
            className="run-button"
            onClick={onRunDemo}
            disabled={state.isRunning}
            style={{ width: 140, height: 140, borderRadius: '50%', fontSize: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <span style={{ fontSize: 28 }}>🌐</span>
            <span>Call API</span>
          </button>
        </div>

        {/* Right: Response */}
        <div className={`glow-card ${api?.success ? 'success' : api?.error ? 'error' : ''}`}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: 16 }}>
            Response
          </div>
          {api ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Status:</span> <span style={{ color: api.success ? 'var(--success)' : 'var(--error)', fontWeight: 600 }}>{api.success ? `${api.statusCode} OK` : `${api.statusCode || 'Error'} - ${api.error || 'Failed'}`}</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Latency:</span> <span style={{ color: 'var(--text-secondary)' }}>{api.elapsedMs}ms</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Request ID:</span> <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 10 }}>{api.requestId}</span></div>
              {api.success && (
                <div style={{ marginTop: 8, padding: '10px 12px', background: 'rgba(16,185,129,0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <span style={{ color: 'var(--success)', fontSize: 11, fontWeight: 600 }}>✓ VERIFIED</span>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>End-to-end certificate-bound access confirmed</div>
                </div>
              )}
              {!api.success && api.responsePreview && (
                <div style={{ marginTop: 8, padding: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-sm)', fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', wordBreak: 'break-all', maxHeight: 80, overflow: 'auto' }}>
                  {api.responsePreview}
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Awaiting API call...</div>
          )}
        </div>
      </div>
    </div>
  )
}
