import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', color: '#FF4444', background: '#161B22', borderRadius: '12px', margin: '24px' }}>
          <h2>Something went wrong.</h2>
          <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}>{this.state.error?.toString()}</pre>
          <button onClick={() => this.setState({ hasError: false, error: null })} style={{ padding: '8px 16px', background: '#30363D', color: '#E6EDF3', border: 'none', borderRadius: '8px', cursor: 'pointer', marginTop: '16px' }}>Try Again</button>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
