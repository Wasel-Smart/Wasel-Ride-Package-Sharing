import { useState } from 'react';
import { Star } from 'lucide-react';
import { ratingsService, RatingSubmission } from '@/services/ratings';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface RateDriverModalProps {
  bookingId: string;
  tripId: string;
  driverId: string;
  driverName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const RATING_TAGS = [
  'punctual',
  'clean_car',
  'friendly',
  'safe_driving',
  'good_communication',
  'professional',
];

export function RateDriverModal({
  bookingId,
  tripId,
  driverId,
  driverName,
  onClose,
  onSuccess,
}: RateDriverModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const submission: RatingSubmission = {
        bookingId,
        tripId,
        driverId,
        rating,
        review: review.trim() || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      };

      await ratingsService.submitRating(submission);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit rating');
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md p-6">
        <h2 className="text-2xl font-bold mb-4">Rate Your Trip</h2>
        <p className="text-gray-600 mb-6">How was your experience with {driverName}?</p>

        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                size={40}
                className={
                  star <= (hoveredRating || rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }
              />
            </button>
          ))}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            What did you like? (Optional)
          </label>
          <div className="flex flex-wrap gap-2">
            {RATING_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {tag.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Additional Comments (Optional)
          </label>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="Share more about your experience..."
            className="w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
            maxLength={500}
          />
          <p className="text-xs text-gray-500 mt-1">{review.length}/500</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1"
            disabled={loading || rating === 0}
          >
            {loading ? 'Submitting...' : 'Submit Rating'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
