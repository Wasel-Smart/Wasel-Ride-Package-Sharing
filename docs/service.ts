import { Pool, type PoolClient } from 'pg';
import Stripe from 'stripe';
import http, { type Server } from 'http';

function sanitizeLogValue(value: unknown): string {
    if (value === null || value === undefined) return String(value);
    const str = String(value);
    return str.replace(/[\r\n\t\x00-\x1f\x7f-\x9f]/g, ' ').trim();
}

// Assuming these interfaces are defined elsewhere or will be defined
interface CaptureResult {
    paymentId: string;
    capturedAmount: number;
    providerTransactionId: string;
    status: 'success' | 'failed' | 'pending';
    errorMessage?: string;
}

interface RefundResult {
    refundId: string;
    paymentId: string;
    refundedAmount: number;
    providerRefundId: string;
    status: 'success' | 'failed' | 'pending';
    errorMessage?: string;
}

const ALLOWED_DB_HOSTS = ['localhost', '127.0.0.1', '.supabase.co', '.internal'];

function validateDatabaseUrl(url: string | undefined): string {
    if (!url) throw new Error('DATABASE_URL is not configured');
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        throw new Error('Invalid DATABASE_URL format');
    }
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
        throw new Error('Invalid database protocol');
    }
    const hostname = parsed.hostname;
    if (!ALLOWED_DB_HOSTS.some(allowed => hostname === allowed || hostname.endsWith(allowed))) {
        throw new Error(`Database host not in allowed list`);
    }
    return url;
}

// Initialize PostgreSQL connection pool
const pool = new Pool({
    connectionString: validateDatabaseUrl(process.env.DATABASE_URL),
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', sanitizeLogValue(err));
    process.exit(-1);
});

// Initialize Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20', // Use your desired API version
});

function toErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return 'Payment processing failed.';
}

export class PaymentReconciliationService {
    constructor() {
        console.log('PaymentReconciliationService initialized with PostgreSQL and Stripe clients.');
    }

    /**
     * Captures a payment using Stripe and updates the transaction status in the database.
     * @param paymentId Our internal payment ID.
     * @param amount The amount to capture.
     * @param currency The currency of the payment.
     * @param providerPaymentIntentId The Stripe PaymentIntent ID.
     * @returns The result of the capture operation.
     */
    async capturePayment(
        paymentId: string,
        amount: number,
        currency: string,
        providerPaymentIntentId: string,
    ): Promise<CaptureResult> {
        const client = await pool.connect();
        try {
            const paymentIntent = await stripe.paymentIntents.capture(providerPaymentIntentId, {
                amount_to_capture: Math.round(amount * 100), // Stripe expects amount in cents
            });

            const status = paymentIntent.status === 'succeeded' ? 'success' : 'failed';
            const result: CaptureResult = {
                paymentId,
                capturedAmount: (paymentIntent.amount_received ?? 0) / 100,
                providerTransactionId: paymentIntent.id,
                status,
                errorMessage: status === 'failed' ? paymentIntent.last_payment_error?.message : undefined,
            };

            await this.updateTransactionStatus(client, paymentId, status, paymentIntent.id, result.errorMessage);
            return result;
        } catch (error) {
            console.error('Stripe capture failed for payment:', sanitizeLogValue(error));
            const errorMessage = sanitizeLogValue(toErrorMessage(error));
            await this.updateTransactionStatus(client, paymentId, 'failed', undefined, errorMessage);
            return {
                paymentId,
                capturedAmount: 0,
                providerTransactionId: '',
                status: 'failed',
                errorMessage,
            };
        } finally {
            client.release();
        }
    }

    /**
     * Refunds a payment using Stripe and updates the transaction status in the database.
     * @param paymentId Our internal payment ID.
     * @param amount The amount to refund.
     * @param providerPaymentIntentId The Stripe PaymentIntent ID.
     * @returns The result of the refund operation.
     */
    async refundPayment(
        paymentId: string,
        amount: number,
        providerPaymentIntentId: string,
    ): Promise<RefundResult> {
        const client = await pool.connect();
        try {
            const refund = await stripe.refunds.create({
                payment_intent: providerPaymentIntentId,
                amount: Math.round(amount * 100), // Stripe expects amount in cents
            });

            const status = refund.status === 'succeeded' ? 'success' : 'failed';
            const result: RefundResult = {
                refundId: refund.id,
                paymentId,
                refundedAmount: (refund.amount ?? 0) / 100,
                providerRefundId: refund.id,
                status,
                errorMessage: status === 'failed' ? refund.failure_reason : undefined,
            };

            // Assuming a separate refund status or updating the original transaction status
            // For simplicity, we'll update the original transaction's status to 'refunded'
            await this.updateTransactionStatus(client, paymentId, 'refunded', undefined, result.errorMessage);
            return result;
        } catch (error) {
            console.error('Stripe refund failed for payment:', sanitizeLogValue(error));
            const errorMessage = sanitizeLogValue(toErrorMessage(error));
            await this.updateTransactionStatus(client, paymentId, 'failed', undefined, errorMessage); // Mark original transaction as failed if refund fails
            return {
                refundId: '',
                paymentId,
                refundedAmount: 0,
                providerRefundId: '',
                status: 'failed',
                errorMessage,
            };
        } finally {
            client.release();
        }
    }

    private async updateTransactionStatus(
        client: PoolClient,
        paymentId: string,
        status: 'success' | 'failed' | 'pending' | 'refunded',
        providerTransactionId?: string,
        errorMessage?: string,
    ): Promise<void> {
        await client.query(
            `UPDATE public.transactions
       SET
         status = $1,
         provider_transaction_id = COALESCE($2, provider_transaction_id),
         error_message = $3,
         updated_at = NOW()
       WHERE id = $4`,
            [status, providerTransactionId, errorMessage, paymentId],
        );
    }
}

async function isDbReady(): Promise<boolean> {
    try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        return true;
    } catch (e) {
        console.error('Readiness check failed: could not connect to database.', sanitizeLogValue(e));
        return false;
    }
}

function createHealthServer(): http.Server {
    const server = http.createServer((req, res) => {
        if (req.url === '/health' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'healthy', service: 'payment-reconciliation-service' }));
            return;
        }
        if (req.url === '/ready' && req.method === 'GET') {
            isDbReady().then(ready => {
                if (ready) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'ready' }));
                } else {
                    res.writeHead(503, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'not_ready', reason: 'database connection failed' }));
                }
            }).catch(() => {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'not_ready', reason: 'database connection failed' }));
            });
            return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    });

    return server;
}

function handleShutdown(server: Server) {
    console.log('Received shutdown signal. Closing server...');
    server.close(() => {
        console.log('HTTP server closed.');
        pool.end(() => {
            console.log('Database connection pool closed. Exiting.');
            process.exit(0);
        });
    });

    // Force shutdown after a timeout
    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
}

function main() {
    new PaymentReconciliationService();
    const PORT = Number(process.env.PORT ?? 3000);
    const server = createHealthServer();
    server.listen(PORT, () => {
        console.log(`Payment Reconciliation Service listening on port ${PORT}`);
    });

    process.on('SIGTERM', () => handleShutdown(server));
    process.on('SIGINT', () => handleShutdown(server));
}

main();
