import React, { Component, ReactNode } from "react";

export class StoryCardErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[StoryCardErrorBoundary] Isolated card render error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-dashed border-border p-4 h-40 flex flex-col items-center justify-center bg-secondary/10 text-center">
          <span className="text-xl mb-1">📰</span>
          <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">Story Unavailable</span>
        </div>
      );
    }
    return this.props.children;
  }
}
