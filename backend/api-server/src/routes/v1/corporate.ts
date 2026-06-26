import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth.ts';
import { validate } from '../middleware/validate.ts';
import { z } from 'zod';

const router = Router();

const CreateOrganizationSchema = z.object({
  name: z.string().min(1),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
  billingAddress: z.string().optional(),
  taxId: z.string().optional(),
});

const AddMemberSchema = z.object({
  userId: z.string().uuid(),
  employeeId: z.string().optional(),
  costCenter: z.string().optional(),
});

const AddCreditSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default('JOD'),
  expiresAt: z.string().datetime().optional(),
});

const GenerateInvoiceSchema = z.object({
  organizationId: z.string().uuid(),
  billingPeriodStart: z.string().datetime(),
  billingPeriodEnd: z.string().datetime(),
});

router.post('/organizations', authenticate, requireRole(['admin']), validate(CreateOrganizationSchema), async (req: Request, res: Response) => {
  try {
    const input = CreateOrganizationSchema.parse(req.body);
    const db = await import('@wasel/backend-shared/db').then(m => m.getDb());
    const ownerId = (req as unknown as { user: { id: string } }).user.id;

    const result = await db.unsafe(
      `INSERT INTO organizations (name, contact_email, contact_phone, billing_address, tax_id, owner_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [input.name, input.contactEmail, input.contactPhone, input.billingAddress, input.taxId, ownerId]
    );

    res.status(201).json({ success: true, data: result[0] });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: (error as Error).message } });
  }
});

router.post('/organizations/:id/members', authenticate, requireRole(['admin', 'billing']), validate(AddMemberSchema), async (req: Request, res: Response) => {
  try {
    const input = AddMemberSchema.parse(req.body);
    const db = await import('@wasel/backend-shared/db').then(m => m.getDb());

    const result = await db.unsafe(
      `INSERT INTO organization_members (organization_id, user_id, employee_id, cost_center)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.params.id, input.userId, input.employeeId, input.costCenter]
    );

    res.status(201).json({ success: true, data: result[0] });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: (error as Error).message } });
  }
});

router.post('/organizations/:id/credits', authenticate, requireRole(['admin', 'billing']), validate(AddCreditSchema), async (req: Request, res: Response) => {
  try {
    const input = AddCreditSchema.parse(req.body);
    const db = await import('@wasel/backend-shared/db').then(m => m.getDb());

    const result = await db.unsafe(
      `INSERT INTO corporate_credits (organization_id, amount, currency, remaining, expires_at, status)
       VALUES ($1, $2, $3, $2, $4, 'active')
       RETURNING *`,
      [req.params.id, input.amount, input.currency, input.expiresAt || null]
    );

    res.status(201).json({ success: true, data: result[0] });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: (error as Error).message } });
  }
});

router.post('/invoices/generate', authenticate, requireRole(['admin', 'billing']), validate(GenerateInvoiceSchema), async (req: Request, res: Response) => {
  try {
    const input = GenerateInvoiceSchema.parse(req.body);
    const db = await import('@wasel/backend-shared/db').then(m => m.getDb());

    const trips = await db.unsafe(
      `SELECT SUM(p.amount) as total, COUNT(*) as trip_count
       FROM payments p
       WHERE p.user_id IN (
         SELECT user_id FROM organization_members WHERE organization_id = $1
       )
       AND p.created_at >= $2 AND p.created_at <= $3
       AND p.status = 'completed'`,
      [input.organizationId, input.billingPeriodStart, input.billingPeriodEnd]
    );

    const totalAmount = Number(trips[0]?.total || 0);
    const lineItems = [
      { description: `Trip payments (${trips[0]?.trip_count || 0} trips)`, amount: totalAmount },
    ];

    const result = await db.unsafe(
      `INSERT INTO invoices (organization_id, billing_period_start, billing_period_end, total_amount, currency, status, line_items)
       VALUES ($1, $2, $3, $4, 'JOD', 'draft', $5)
       RETURNING *`,
      [input.organizationId, input.billingPeriodStart, input.billingPeriodEnd, totalAmount, JSON.stringify(lineItems)]
    );

    res.status(201).json({ success: true, data: result[0] });
  } catch (error) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: (error as Error).message } });
  }
});

router.get('/organizations/:id/invoices', authenticate, requireRole(['admin', 'billing']), async (req: Request, res: Response) => {
  try {
    const db = await import('@wasel/backend-shared/db').then(m => m.getDb());
    const invoices = await db.unsafe(
      'SELECT * FROM invoices WHERE organization_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json({ success: true, data: invoices });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch invoices' } });
  }
});

export default router;

