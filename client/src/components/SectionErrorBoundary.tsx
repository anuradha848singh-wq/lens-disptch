import React from "react";
import { logComponentError } from "@/lib/logger";

export class SectionErrorBoundary extends React.Component<
  { children: React.ReactNode; fallbackMessage?: string },
  { hasError: boolean; errorMessage?: string }
> {
  constructor(props: { children: React.ReactNode; fallbackMessage?: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: error?.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[SectionErrorBoundary]", error, info.componentStack);
    logComponentError(error, info.componentStack || undefined);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 border border-red-200 bg-red-50 text-red-900 rounded-md my-4">
          <h3 className="font-bold text-sm mb-2 text-red-800">
            {this.props.fallbackMessage || "Failed to load this section."}
          </h3>
          <p className="text-xs opacity-80 mb-4">{this.state.errorMessage}</p>
          <button
            onClick={() => this.setState({ hasError: false, errorMessage: undefined })}
            className="text-xs bg-red-100 px-3 py-1.5 rounded hover:bg-red-200 transition-colors font-medium text-red-800"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
