<<<<<<< HEAD
export function errorHandler(err, _req, res, _next) {
    const statusCode = err.statusCode || 500;
    const code = err.code || 'internal_error';
    const message = err.message || 'Internal server error';
    res.status(statusCode).json({
        success: false,
        error: { code, message },
        meta: { timestamp: new Date().toISOString() },
    });
}
export default errorHandler;
=======
export * from './errors.ts';
>>>>>>> 3f91593102061af94f82b9db9416273735742bdf
