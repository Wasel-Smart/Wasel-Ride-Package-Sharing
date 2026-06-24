import { ratingRepository } from '../repositories/ratingRepository';
import { NotFoundError, ValidationError, InternalError } from '@wasel/backend-shared/errors/app-errors';

export class RatingService {
  async submitRating(input: {
    raterId: string;
    targetId: string;
    targetType: string;
    tripId?: string;
    score: number;
    comment?: string;
    tags?: string[];
  }) {
    if (input.score < 1 || input.score > 5) {
      throw new ValidationError('Rating must be between 1 and 5');
    }

    return ratingRepository.createRating({
      raterId: input.raterId,
      targetId: input.targetId,
      targetType: input.targetType as 'driver' | 'passenger' | 'bus_operator',
      tripId: input.tripId,
      score: input.score,
      comment: input.comment,
      tags: input.tags,
    });
  }

  async getRatingsForUser(userId: string, page: number, limit: number) {
    return ratingRepository.findRatingsForUser(userId, page, limit);
  }

  async getAverageRating(userId: string) {
    return ratingRepository.getAverageRating(userId);
  }
}

export const ratingService = new RatingService();
