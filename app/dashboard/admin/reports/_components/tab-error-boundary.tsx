"use client";

import React from "react";

interface State {
  error: Error | null;
}

export class TabErrorBoundary extends React.Component<
  { label: string; children: React.ReactNode },
  State
> {
  constructor(props: { label: string; children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-6 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
          <p className="font-semibold text-red-800 dark:text-red-400 mb-1">
            {this.props.label} failed to render
          </p>
          <p className="text-sm text-red-700 dark:text-red-500 font-mono">
            {this.state.error.message}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
