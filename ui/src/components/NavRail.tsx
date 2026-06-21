import type { Page } from '../App'

const navItems: { id: Page; icon: string; label: string }[] = [
  { id: 'overview', icon: '◎', label: 'Overview' },
  { id: 'certificate', icon: '🔐', label: 'Cert' },
  { id: 'token', icon: '⚡', label: 'Token' },
  { id: 'mtls', icon: '🔒', label: 'mTLS' },
  { id: 'apicall', icon: '🌐', label: 'API' },
  { id: 'results', icon: '✓', label: 'Results' },
  { id: 'technical', icon: '⟨/⟩', label: 'Details' },
]

interface Props {
  currentPage: Page
  onNavigate: (page: Page) => void
}

export default function NavRail({ currentPage, onNavigate }: Props) {
  return (
    <nav className="nav-rail">
      <div style={{ marginBottom: 24, fontSize: 20, fontWeight: 800, color: 'var(--accent-blue)' }}>◆</div>
      {navItems.map(item => (
        <button
          key={item.id}
          className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
          onClick={() => onNavigate(item.id)}
        >
          <span style={{ fontSize: 26 }}>{item.icon}</span>
          <span className="nav-item-label">{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
