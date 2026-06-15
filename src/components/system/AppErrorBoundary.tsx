import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { logger } from '@/utils/monitoring';

interface AppErrorBoundaryState {
  hasError: boolean;
  error: string;
}

function shouldIgnoreRuntimeError(message: string): boolean {
  return [
    'IframeMessageAbortError',
    'message port was destroyed',
    'Message aborted',
    'setupMessageChannel',
  ].some(pattern => message.includes(pattern));
}

export class AppErrorBoundary extends Component<
  { children: ReactNode },
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false, error: '' };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    const message = error instanceof Error ? error.message : String(error);

    if (shouldIgnoreRuntimeError(message)) {
      return { hasError: false, error: '' };
    }

    return { hasError: true, error: message };
  }

  componentDidCatch(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    if (!shouldIgnoreRuntimeError(message)) {
      logger.error('Unhandled React runtime error', error);
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="flex min-h-[var(--app-min-height)] items-center justify-center bg-background p-6 text-foreground">
        <Card className="w-full max-w-lg border-destructive/30 bg-card shadow-[var(--wasel-shadow-lg)]">
          <CardHeader className="gap-3">
            <div className="flex size-12 items-center justify-center rounded-[var(--radius-sm)] bg-destructive/10 text-destructive">
              <AlertTriangle className="size-6" aria-hidden="true" />
            </div>
            <CardTitle className="text-[length:var(--text-h2)]">App error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{this.state.error}</p>
            <Button onClick={() => window.location.reload()}>Reload</Button>
          </CardContent>
        </Card>
      </main>
    );
  }
}

