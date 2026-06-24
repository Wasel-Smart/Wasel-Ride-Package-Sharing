import { randomUUID } from 'crypto';
export function requestId(req, res, next) {
    const id = randomUUID();
    req.requestId = id;
    res.requestId = id;
    res.setHeader('x-request-id', id);
    next();
}
