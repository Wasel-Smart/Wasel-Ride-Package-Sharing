import { ratingRepository } from '../repositories/ratingRepository.js';
import { ValidationError } from '@wasel/backend-shared/errors/app-errors';
export class RatingService {
    async submitRating(input) {
        if (input.score < 1 || input.score > 5) {
            throw new ValidationError('Rating must be between 1 and 5');
        }
        return ratingRepository.createRating({
            raterId: input.raterId,
            targetId: input.targetId,
            targetType: input.targetType,
            tripId: input.tripId,
            score: input.score,
            comment: input.comment,
            tags: input.tags,
        });
    }
    async getRatingsForUser(userId, page, limit) {
        return ratingRepository.findRatingsForUser(userId, page, limit);
    }
    async getAverageRating(userId) {
        return ratingRepository.getAverageRating(userId);
    }
}
export const ratingService = new RatingService();
