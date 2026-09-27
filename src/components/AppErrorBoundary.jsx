import { Component } from 'react';

export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <main className="fatal-error" role="alert"><div><p className="eyebrow">Application error</p><h1>Something went wrong.</h1><p>Your saved server data has not been changed by this display error.</p><button type="button" className="button button-primary" onClick={() => window.location.reload()}>Reload</button></div></main>;
    }
    return this.props.children;
  }
}
