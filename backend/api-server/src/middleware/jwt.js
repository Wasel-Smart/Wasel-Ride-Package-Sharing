import jwt from 'jsonwebtoken';
export function createJWTAuthMiddleware(secret) {
    return function authenticate(req, res, next) {
        const header = req.headers.authorization;
        if (!header?.startsWith('Bearer ')) {
            return next(new Error('Missing authorization header'));
        }
        const token = header.slice('Bearer '.length);
        if (!token) {
            return next(new Error('Empty token'));
        }
        try {
            const payload = jwt.verify(token, secret);
            req.user = {
                id: payload.sub,
                role: payload.role,
            };
            next();
        }
        catch {
            return next(new Error('Invalid or expired token'));
        }
    };
}
export function generateTokens(userId, role, secret, accessExpiry, refreshExpiry) {
    const accessToken = jwt.sign({ sub: userId, role }, secret, { expiresIn: `${accessExpiry}s` });
    const refreshToken = jwt.sign({ sub: userId, role }, secret, { expiresIn: `${refreshExpiry}s` });
    return { accessToken, refreshToken };
}
