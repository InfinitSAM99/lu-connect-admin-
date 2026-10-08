import { Component } from 'react';

export default class ErrorCatcher extends Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }

  componentDidCatch(error) {
    console.error('CAUGHT ERROR:', error);
    this.setState({ err: error });
  }

  render() {
    if (this.state.err) {
      return (
        <div style={{ padding: 20, background: '#000', color: '#fff', minHeight: '100vh' }}>
          <h1 style={{ color: '#ef4444' }}>App crashed</h1>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: '#aaa' }}>
            {String(this.state.err?.message || this.state.err)}
          </pre>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, color: '#666' }}>
            {String(this.state.err?.stack || '').slice(0, 800)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
