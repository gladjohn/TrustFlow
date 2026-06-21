import { useEffect } from 'react'
import type { DemoState } from '../App'
import { callBackend } from '../bridge'

interface Props {
  state: DemoState
  onCertsLoaded: (certs: any[]) => void
}

export default function CertificatePage({ state, onCertsLoaded }: Props) {
  const certs = state.certificates ?? []

  useEffect(() => {
    if (certs.length === 0) {
      callBackend('getCertificates').then((result: any) => {
        if (result?.certificates?.length > 0) {
          onCertsLoaded(result.certificates)
        }
      })
    }
  }, [])

  return (
    <div className="animate-in">
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Certificate Store</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>
        Certificates available for mTLS client authentication
      </p>

      {certs.length === 0 ? (
        <div className="glow-card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🔐</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>No Certificates Loaded</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Run the demo to scan the certificate store</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
          {certs.map((cert: any, i: number) => (
            <div key={i} className={`glow-card ${cert.isMtlsReady ? '' : ''}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span className={`status-badge ${cert.isMtlsReady ? 'success' : 'error'}`}>
                  {cert.isMtlsReady ? '● mTLS Ready' : '● Not Ready'}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{cert.storeLocation}</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
                {cert.subject}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 11 }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Issuer:</span> <span style={{ color: 'var(--text-secondary)' }}>{cert.issuer?.substring(0, 40)}</span></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Expires:</span> <span style={{ color: cert.isExpired ? 'var(--error)' : 'var(--text-secondary)' }}>{cert.notAfter}</span></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Thumbprint:</span> <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{cert.thumbprint?.substring(0, 16)}...</span></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Private Key:</span> <span style={{ color: cert.hasPrivateKey ? 'var(--success)' : 'var(--error)' }}>{cert.hasPrivateKey ? 'Present' : 'Missing'}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {certs.length > 0 && (
        <div className="glow-card" style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 16, borderColor: 'rgba(59,130,246,0.3)' }}>
          <span style={{ fontSize: 24 }}>🛡️</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Private key remains protected</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              The mTLS certificate's private key is non-exportable and stays within the Windows certificate store.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
