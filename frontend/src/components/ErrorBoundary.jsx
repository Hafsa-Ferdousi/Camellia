import { Component } from "react";
import "./ErrorBoundary.css";

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled UI error:", error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.assign("/");
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="error-boundary">
        <h1>Something went wrong</h1>
        <p>This page hit an unexpected error. Please try again.</p>
        <button type="button" onClick={this.handleReload}>
          Back to home
        </button>
      </div>
    );
  }
}
