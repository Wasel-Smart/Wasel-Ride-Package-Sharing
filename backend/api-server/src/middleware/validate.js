import { ValidationError } from '@wasel/backend-shared/errors/app-errors';
export function validate(schema) {
    return (req, res, next) => {
        try {
            req.body = schema.parse(req.body);
            next();
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Invalid request body';
            next(new ValidationError(message, { cause: err instanceof Error ? err.message : String(err) }));
        }
    };
}
export function validateQuery(schema) {
    return (req, _res, next) => {
        try {
            req.query = schema.parse(req.query);
            next();
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Invalid query parameters';
            next(new ValidationError(message, { cause: err instanceof Error ? err.message : String(err) }));
        }
    };
}
