import type { StepStatus, FlowType } from '../App'

interface Props {
  steps: StepStatus[]
  flow?: FlowType
}

const flowNodes: Record<FlowType, { icon: string; label: string }[]> = {
  sni: [
    { icon: '🔐', label: 'Load Cert' },
    { icon: '⚡', label: 'MSAL Engine' },
    { icon: '🔑', label: 'Cert over mTLS' },
    { icon: '🎟️', label: 'Acquire Token' },
    { icon: '🌐', label: 'Call Downstream' },
  ],
  msi: [
    { icon: '📡', label: 'IMDS Metadata' },
    { icon: '📝', label: 'CSR Generation' },
    { icon: '📜', label: 'Cert Issued' },
    { icon: '🎟️', label: 'mTLS PoP Token' },
    { icon: '🔑', label: 'Azure Key Vault' },
  ],
  'fic-sni': [
    { icon: '🔐', label: 'SNI Cert (Leg 1)' },
    { icon: '🔄', label: 'Exchange Token' },
    { icon: '📎', label: 'FIC Assertion' },
    { icon: '🎟️', label: 'Final PoP Token' },
    { icon: '🌐', label: 'Call Downstream' },
  ],
  'fic-msi': [
    { icon: '🤖', label: 'MSI (Leg 1)' },
    { icon: '🔄', label: 'Exchange Token' },
    { icon: '📎', label: 'FIC Assertion' },
    { icon: '🎟️', label: 'Final PoP Token' },
    { icon: '🌐', label: 'Call Downstream' },
  ],
}

export default function TrustPipeline({ steps, flow = 'sni' }: Props) {
  const nodes = flowNodes[flow] || flowNodes.sni

  return (
    <div className="trust-pipeline">
      {nodes.map((node, i) => {
        const step = steps[i]
        const nodeClass = step?.status === 'complete' ? 'complete' :
                          step?.status === 'running' ? 'active' :
                          step?.status === 'failed' ? 'failed' : ''
        const connectorClass = i < nodes.length - 1 ?
          (steps[i]?.status === 'complete' ? 'complete' :
           steps[i + 1]?.status === 'running' ? 'animating' : '') : ''

        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            <div className="pipeline-node">
              <div className={`node-ring ${nodeClass}`}>
                <span style={{ fontSize: 34 }}>{node.icon}</span>
              </div>
              <span className="node-label">{node.label}</span>
            </div>
            {i < nodes.length - 1 && (
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32, padding: '0 4px' }}>
                <div className={`pipeline-connector ${connectorClass}`}>
                  <div className="beam" />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
