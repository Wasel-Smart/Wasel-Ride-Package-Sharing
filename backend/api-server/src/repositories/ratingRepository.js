import { getDb } from '@wasel/backend-shared/db';
import { logger } from '@wasel/backend-shared/logging/logger';
import { ValidationError, InternalError } from '@wasel/backend-shared/errors/app-errors';
export class RatingRepository {
    db = getDb();
    async createRating(input) {
        if (input.score < 1 || input.score > 5) {
            throw new ValidationError('Rating must be between 1 and 5');
        }
        if (input.tripId) {
            const bookingCheck = await this.db.unsafe(`SELECT COUNT(*) as count FROM trip_bookings
         WHERE trip_id = $1 AND passenger_id = $2 AND status = 'completed'`, [input.tripId, input.raterId]);
            if (Number(bookingCheck[0]?.count || 0) === 0) {
                throw new ValidationError('You can only rate completed trips you participated in');
            }
        }
        try {
            const result = await this.db.unsafe(`INSERT INTO reviews (reviewer_id, reviewee_id, trip_id, rating, review, driver_rating)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, reviewer_id as rater_id, reviewee_id as target_id,
                   'driver' as target_type, trip_id, rating as score,
                   ARRAY[]::text[] as tags, review as comment,
                   'published' as status, created_at`, [
                input.raterId,
                input.targetId,
                input.tripId || null,
                input.score,
                input.comment || null,
                input.score,
            ]);
            return result[0];
        }
        catch (error) {
            logger.error({ error, input }, 'Failed to create rating');
            throw new InternalError('Failed to create rating', error);
        }
    }
    async findRatingsForUser(userId, page, limit) {
        const offset = (page - 1) * limit;
        const countResult = await this.db.unsafe('SELECT COUNT(*) as total FROM reviews WHERE reviewee_id = $1', [userId]);
        const total = Number(countResult[0]?.total || 0);
        const data = await this.db.unsafe(`SELECT id, reviewer_id as rater_id, reviewee_id as target_id,
              'driver' as target_type, trip_id, rating as score,
              ARRAY[]::text[] as tags, review as comment,
              'published' as status, created_at
       FROM reviews WHERE reviewee_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`, [userId, limit, offset]);
        return {
            data: data,
            meta: { total, page, limit },
        };
    }
    async getAverageRating(userId) {
        const result = await this.db.unsafe(`SELECT AVG(rating)::DECIMAL(3,2) as average, COUNT(*) as count
       FROM reviews WHERE reviewee_id = $1`, [userId]);
        const row = result[0];
        return {
            average: Number(row.average) || 0,
            count: Number(row.count) || 0,
        };
    }
}
export const ratingRepository = new RatingRepository();
