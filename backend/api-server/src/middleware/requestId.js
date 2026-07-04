<<<<<<< HEAD
import { randomUUID } from 'crypto';
export function requestId(req, res, next) {
    const id = randomUUID();
    req.requestId = id;
    res.requestId = id;
    res.setHeader('x-request-id', id);
    next();
}
=======
export * from './requestId.ts';
>>>>>>> 3f91593102061af94f82b9db9416273735742bdf
