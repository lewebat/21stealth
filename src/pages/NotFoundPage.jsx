import { Link } from 'react-router-dom'
import { Button } from '@ui'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center">
      <h1 className="text-display text-text-muted">404</h1>
      <p className="text-lead">Page not found.</p>
      <Link to="/dashboard">
        <Button variant="primary">Back to Dashboard</Button>
      </Link>
    </div>
  )
}
