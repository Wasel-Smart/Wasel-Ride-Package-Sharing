export function notFoundHandler(_req, res) {
    res.status(404).json({
        success: false,
        error: { code: 'not_found', message: 'Endpoint not found' },
        metadata: { timestamp: new Date().toISOString(), version: 'v1' },
    });
}
export function errorHandler(err, req, res, _next) {
    const requestId = req.requestId ?? 'unknown';
    const status = err instanceof Error && 'statusCode' in err ? err.statusCode : 500;
    const code = err instanceof Error && 'code' in err ? err.code : 'internal_error';
    const message = err instanceof Error && 'message' in err ? err.message : 'Internal server error';
    res.status(status).json({
        success: false,
        error: { code, message },
        metadata: { requestId, timestamp: new Date().toISOString(), version: 'v1', traceId: req.headers['x-trace-id'] ?? undefined },
    });
}
