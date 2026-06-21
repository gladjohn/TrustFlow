import { useState } from 'react'
import type { DemoState } from '../App'

interface Props {
  state: DemoState
}

type Tab = 'certificate' | 'token' | 'headers' | 'response' | 'logs'

export default function TechnicalPage({ state }: Props) {
  const [tab, setTab] = useState<Tab>('token')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'certificate', label: 'Certificate' },
    { id: 'token', label: 'Token' },
    { id: 'headers', label: 'Headers' },
    { id: 'response', label: 'API Response' },
    { id: 'logs', label: 'Logs' },
  ]

  return (
    <div className="animate-in">
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Technical Details</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>
        Detailed diagnostic information for troubleshooting
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: 'none',
              background: tab === t.id ? 'rgba(59,130,246,0.15)' : 'transparent',
              color: tab === t.id ? 'var(--accent-blue)' : 'var(--text-muted)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="code-viewer">
        <pre style={{ whiteSpace: 'pre-wrap' }}>
          {getTabContent(tab, state)}
        </pre>
      </div>
    </div>
  )
}

function getTabContent(tab: Tab, state: DemoState): string {
  switch (tab) {
    case 'certificate':
      return state.certificates?.length
        ? JSON.stringify(state.certificates[0], null, 2)
        : '// No certificate data available. Run the flow first.'
    case 'token':
      return state.tokenResult
        ? JSON.stringify(state.tokenResult, null, 2)
        : '// No token data available. Run the flow first.'
    case 'headers':
      return `// Request Headers (mTLS bound)
Authorization: Bearer <pop_token>
x-ms-tokenboundauth: <binding_proof>
Content-Type: application/json
x-ms-client-request-id: ${state.apiResult?.requestId ?? '<pending>'}
User-Agent: TrustFlow/1.0`
    case 'response':
      return state.apiResult
        ? JSON.stringify(state.apiResult, null, 2)
        : '// No API response available. Run the flow first.'
    case 'logs':
      return state.steps.map(s =>
        `[Step ${s.step}] ${s.label} — ${s.status.toUpperCase()}${s.detail ? ` (${s.detail})` : ''}`
      ).join('\n')
  }
}
