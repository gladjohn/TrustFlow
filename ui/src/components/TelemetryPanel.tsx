import type { StepStatus } from '../App'

interface Props {
  steps: StepStatus[]
}

const statusColors: Record<string, string> = {
  idle: 'var(--text-muted)',
  running: 'var(--warning)',
  complete: 'var(--success)',
  failed: 'var(--error)',
}

const telemetryItems = [
  { label: 'Certificate', step: 1 },
  { label: 'Private Key', step: 1, sub: true },
  { label: 'Token', step: 2 },
  { label: 'Binding Cert', step: 3 },
  { label: 'mTLS Channel', step: 4 },
  { label: 'API Response', step: 5 },
]

function getStatus(steps: StepStatus[], stepNum: number, isSub?: boolean): { text: string; color: string } {
  const step = steps.find(s => s.step === stepNum)
  if (!step) return { text: 'Unknown', color: 'var(--text-muted)' }
  switch (step.status) {
    case 'idle': return { text: isSub ? 'Protected' : 'Ready', color: statusColors.idle }
    case 'running': return { text: 'Processing', color: statusColors.running }
    case 'complete': return { text: isSub ? 'Non-exportable' : 'Verified', color: statusColors.complete }
    case 'failed': return { text: 'Failed', color: statusColors.failed }
  }
}

export default function TelemetryPanel({ steps }: Props) {
  return (
    <aside className="telemetry-panel">
      <div className="telemetry-title">Live Trust Telemetry</div>
      {telemetryItems.map((item, i) => {
        const status = getStatus(steps, item.step, item.sub)
        return (
          <div key={i} className={`telemetry-card ${steps.find(s => s.step === item.step)?.status === 'running' ? 'active' : ''}`}>
            <span className="telemetry-label">{item.label}</span>
            <span className="telemetry-value" style={{ color: status.color }}>
              {status.text}
            </span>
          </div>
        )
      })}
      <div style={{ marginTop: 24, padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: 8 }}>Pipeline Progress</div>
        {steps.map(step => (
          <div key={step.step} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: statusColors[step.status],
              boxShadow: step.status === 'running' ? `0 0 8px ${statusColors.running}` : 'none'
            }} />
            <span style={{ fontSize: 11, color: step.status === 'idle' ? 'var(--text-muted)' : 'var(--text-secondary)', flex: 1 }}>
              {step.label}
            </span>
            {step.detail && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{step.detail}</span>}
          </div>
        ))}
      </div>
    </aside>
  )
}
