import { NextResponse } from 'next/server';

// Prevent static caching – always re‑run on each request
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Optional lightweight dependency checks (e.g., DB ping) could be added here
    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
