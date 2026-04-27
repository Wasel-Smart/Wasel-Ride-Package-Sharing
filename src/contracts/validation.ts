import { type ZodType } from 'zod';
import { ValidationError } from '../utils/errors';

export function parseContract<T>(
  schema: ZodType<T>,
  payload: unknown,
  contractName: string,
  contractVersion: string,
): T {
  const parsed = schema.safeParse(payload);
  if (parsed.success) {
    return parsed.data;
  }

  const issues = parsed.error.issues.map(issue => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));

  throw new ValidationError(
    `Response contract violation for ${contractName}@${contractVersion}: ${issues
      .map(issue => `${issue.path || 'payload'} ${issue.message}`)
      .join('; ')}`,
    {
      contractName,
      contractVersion,
      issues,
    },
  );
}
