import { useState, useCallback, useEffect } from 'react'
import NavRail from './components/NavRail'
import TopBar from './components/TopBar'
import TelemetryPanel from './components/TelemetryPanel'
import Overview from './pages/Overview'
import CertificatePage from './pages/CertificatePage'
import TokenPage from './pages/TokenPage'
import MtlsPage from './pages/MtlsPage'
import ApiCallPage from './pages/ApiCallPage'
import ResultsPage from './pages/ResultsPage'
import TechnicalPage from './pages/TechnicalPage'
import { callBackend, setProgressCallback } from './bridge'

export type Page = 'overview' | 'certificate' | 'token' | 'mtls' | 'apicall' | 'results' | 'technical'
export type FlowType = 'sni' | 'msi' | 'fic-sni' | 'fic-msi'

export interface StepStatus {
  step: number
  status: 'idle' | 'running' | 'complete' | 'failed'
  label: string
  detail?: string
}

export interface DemoState {
  steps: StepStatus[]
  isRunning: boolean
  activeFlow: FlowType
  tokenResult?: any
  popResult?: any
  apiResult?: any
  certificates?: any[]
  environment?: any
}

const flowSteps: Record<FlowType, StepStatus[]> = {
  sni: [
    { step: 1, status: 'idle', label: 'Certificate Store' },
    { step: 2, status: 'idle', label: 'MSAL Token Engine' },
    { step: 3, status: 'idle', label: 'mTLS Binding' },
    { step: 4, status: 'idle', label: 'mTLS Channel' },
    { step: 5, status: 'idle', label: 'Downstream API' },
  ],
  msi: [
    { step: 1, status: 'idle', label: 'IMDS Metadata' },
    { step: 2, status: 'idle', label: 'CSR Generation' },
    { step: 3, status: 'idle', label: 'Cert Issued' },
    { step: 4, status: 'idle', label: 'mTLS PoP Token' },
    { step: 5, status: 'idle', label: 'Azure Key Vault' },
  ],
  'fic-sni': [
    { step: 1, status: 'idle', label: 'SNI Cert (Leg 1)' },
    { step: 2, status: 'idle', label: 'Exchange Token' },
    { step: 3, status: 'idle', label: 'FIC Assertion' },
    { step: 4, status: 'idle', label: 'Final PoP Token' },
    { step: 5, status: 'idle', label: 'Downstream API' },
  ],
  'fic-msi': [
    { step: 1, status: 'idle', label: 'MSI (Leg 1)' },
    { step: 2, status: 'idle', label: 'Exchange Token' },
    { step: 3, status: 'idle', label: 'FIC Assertion' },
    { step: 4, status: 'idle', label: 'Final PoP Token' },
    { step: 5, status: 'idle', label: 'Downstream API' },
  ],
}

const initialSteps = flowSteps.sni

function tryParseJson(val: any): any {
  if (typeof val === 'string') {
    try { return JSON.parse(val) } catch { return val }
  }
  return val
}

export default function App() {
  const [page, setPage] = useState<Page>('overview')
  const [msalLogs, setMsalLogs] = useState<string[]>([])
  const [state, setState] = useState<DemoState>({
    steps: [...initialSteps],
    isRunning: false,
    activeFlow: 'sni',
  })

  // Listen for MSAL log messages from C# backend
  useEffect(() => {
    (window as any).__trustflow_log = (logLine: string) => {
      setMsalLogs(prev => [...prev, logLine])
    }
    return () => { delete (window as any).__trustflow_log }
  }, [])

  const runDemo = useCallback(async () => {
    setMsalLogs([])
    const steps = flowSteps[state.activeFlow]
    setState(s => ({ ...s, isRunning: true, steps: steps.map(st => ({ ...st, status: 'idle' as const })) }))

    setProgressCallback((data: any) => {
      setState(s => ({
        ...s,
        steps: s.steps.map(st =>
          st.step === data.step ? { ...st, status: data.status, label: data.label, detail: data.detail } : st
        )
      }))
    })

    const result = await callBackend('runFullDemo', { flow: state.activeFlow })
    const tokenResult = tryParseJson(result.tokenResult)
    const popResult = tryParseJson(result.popResult)
    const apiResult = tryParseJson(result.apiResult)

    // Also fetch certificates for technical details
    const certData = await callBackend('getCertificates')
    setState(s => ({ ...s, isRunning: false, tokenResult, popResult, apiResult, certificates: certData?.certificates }))

    setProgressCallback(null)
  }, [state.activeFlow])

  const changeFlow = useCallback((flow: FlowType) => {
    setMsalLogs([])
    setState({ steps: [...flowSteps[flow]], isRunning: false, activeFlow: flow })
  }, [])

  const resetDemo = useCallback(() => {
    setMsalLogs([])
    setState({ steps: [...initialSteps], isRunning: false })
  }, [])

  const setCerts = useCallback((certs: any[]) => {
    setState(s => ({ ...s, certificates: certs }))
  }, [])

  const pageComponent = () => {
    switch (page) {
      case 'overview': return <Overview state={state} onRunDemo={runDemo} msalLogs={msalLogs} />
      case 'certificate': return <CertificatePage state={state} onCertsLoaded={setCerts} />
      case 'token': return <TokenPage state={state} />
      case 'mtls': return <MtlsPage state={state} />
      case 'apicall': return <ApiCallPage state={state} onRunDemo={runDemo} />
      case 'results': return <ResultsPage state={state} onReset={resetDemo} onRunAgain={runDemo} />
      case 'technical': return <TechnicalPage state={state} />
      default: return <Overview state={state} onRunDemo={runDemo} msalLogs={msalLogs} />
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'row', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <NavRail currentPage={page} onNavigate={setPage} />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, height: '100vh' }}>
        <TopBar onRunDemo={runDemo} isRunning={state.isRunning} activeFlow={state.activeFlow} onFlowChange={changeFlow} />
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {pageComponent()}
        </div>
      </div>
      <TelemetryPanel steps={state.steps} />
    </div>
  )
}
