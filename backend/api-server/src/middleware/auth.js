import { UnauthorizedError, ForbiddenError } from '@wasel/backend-shared/errors/app-errors';
import jwt from 'jsonwebtoken';
import { config } from '@wasel/backend-shared/config';
export function authenticate(req, res, next) {
    try {
        const header = req.headers.authorization;
        if (!header?.startsWith('Bearer ')) {
            return next(new UnauthorizedError('Missing or invalid authorization header'));
        }
        const token = header.slice('Bearer '.length);
        if (!token) {
            return next(new UnauthorizedError('Empty token'));
        }
        let payload;
        try {
            payload = jwt.verify(token, config.jwt.secret);
        }
        catch {
            return next(new UnauthorizedError('Invalid or expired token'));
        }
        req.user = {
            id: payload.sub,
            role: payload.role,
        };
        next();
    }
    catch (error) {
        next(error);
    }
}
export function requireRole(allowedRoles) {
    return (req, _res, next) => {
        const user = req.user;
        if (!user) {
            return next(new UnauthorizedError('No user context'));
        }
        if (!allowedRoles.includes(user.role)) {
            return next(new ForbiddenError(`Role '${user.role}' is not authorized`));
        }
        next();
    };
}
