/**
 * Trip Cancellation Component
 * 
 * Smart cancellation with dynamic refund calculation
 * based on time and trip status.
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Label } from './ui/label';
import { AlertTriangle, DollarSign, Clock, Info } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../services/core';
import { paymentService } from '../services/integrations';
import { toast } from 'sonner';

interface CancelTripProps {
  tripId: string;
  tripStatus: string;
  fare: number;
  scheduledTime?: Date;
  onCancel: () => void;
  onClose: () => void;
}

interface RefundCalculation {
  originalFare: number;
  cancellationFee: number;
  refundAmount: number;
  refundPercentage: number;
  reason: string;
}

export function CancelTrip({
  tripId,
  tripStatus,
  fare,
  scheduledTime,
  onCancel,
  onClose,
}: CancelTripProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [refundCalc, setRefundCalc] = useState<RefundCalculation | null>(null);

  // Calculate refund based on cancellation policy
  const calculateRefund = (): RefundCalculation => {
    const now = new Date();
    let refundPercentage = 0;
    let reason = '';

    if (tripStatus === 'scheduled' && scheduledTime) {
      const minutesUntilTrip = (scheduledTime.getTime() - now.getTime()) / 60000;

      if (minutesUntilTrip > 60) {
        refundPercentage = 100;
        reason = 'Cancelled more than 1 hour before scheduled time';
      } else if (minutesUntilTrip > 30) {
        refundPercentage = 50;
        reason = 'Cancelled 30-60 minutes before scheduled time';
      } else {
        refundPercentage = 0;
        reason = 'Cancelled less than 30 minutes before scheduled time';
      }
    } else if (tripStatus === 'waiting') {
      refundPercentage = 100;
      reason = 'Driver not yet assigned';
    } else if (tripStatus === 'assigned') {
      refundPercentage = 90;
      reason = 'Driver assigned but not en route';
    } else if (tripStatus === 'arriving') {
      refundPercentage = 50;
      reason = 'Driver is on the way to pickup';
    } else if (tripStatus === 'picked_up' || tripStatus === 'in_progress') {
      refundPercentage = 0;
      reason = 'Trip already in progress - no refund';
    } else {
      refundPercentage = 100;
      reason = 'Default refund policy';
    }

    const refundAmount = (fare * refundPercentage) / 100;
    const cancellationFee = fare - refundAmount;

    return {
      originalFare: fare,
      cancellationFee,
      refundAmount,
      refundPercentage,
      reason,
    };
  };

  useEffect(() => {
    setRefundCalc(calculateRefund());
  }, [tripStatus, fare, scheduledTime]);

  const handleCancelTrip = async () => {
    if (!cancellationReason) {
      toast.error('Please select a cancellation reason');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to cancel this trip?\n\n` +
      `Refund: JOD ${refundCalc?.refundAmount.toFixed(2) || '0.00'}\n` +
      `Cancellation Fee: JOD ${refundCalc?.cancellationFee.toFixed(2) || '0.00'}`
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      // Update trip status to cancelled
      const { error: updateError } = await supabase
        .from('trips')
        .update({
          status: 'cancelled',
          cancellation_reason: cancellationReason,
          cancellation_notes: additionalNotes,
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', tripId);

      if (updateError) throw updateError;

      // Process refund if applicable
      if (refundCalc && refundCalc.refundAmount > 0) {
        // In production, this would call the payment service
        const refundResult = await paymentService.refund(
          tripId,
          refundCalc.refundAmount
        );

        if (!refundResult.success) {
          throw new Error('Refund processing failed');
        }

        // Record refund in database
        await supabase.from('refunds').insert({
          trip_id: tripId,
          amount: refundCalc.refundAmount,
          cancellation_fee: refundCalc.cancellationFee,
          reason: cancellationReason,
          status: 'processed',
          created_at: new Date().toISOString(),
        });
      }

      toast.success(
        refundCalc?.refundAmount 
          ? `Trip cancelled. JOD ${refundCalc.refundAmount.toFixed(2)} will be refunded to your original payment method within 3-5 business days.`
          : 'Trip cancelled successfully.'
      );

      onCancel();
    } catch (error) {
      console.error('Failed to cancel trip:', error);
      toast.error('Failed to cancel trip. Please try again or contact support.');
    } finally {
      setLoading(false);
    }
  };

  if (!refundCalc) {
    return null;
  }

  return (
    <Card className="border-2 border-destructive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          Cancel Trip
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Refund Calculation */}
        <div className="p-4 bg-muted rounded-lg space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="w-4 h-4" />
            {refundCalc.reason}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Original Fare</span>
              <span className="font-semibold">JOD {refundCalc.originalFare.toFixed(2)}</span>
            </div>
            
            {refundCalc.cancellationFee > 0 && (
              <div className="flex justify-between text-red-600">
                <span className="text-sm">Cancellation Fee</span>
                <span className="font-semibold">- JOD {refundCalc.cancellationFee.toFixed(2)}</span>
              </div>
            )}

            <div className="border-t pt-2 flex justify-between">
              <span className="font-semibold">Refund Amount</span>
              <span className="text-xl font-bold text-green-600">
                JOD {refundCalc.refundAmount.toFixed(2)}
              </span>
            </div>

            {refundCalc.refundPercentage > 0 && (
              <Badge variant="outline" className="w-full justify-center">
                {refundCalc.refundPercentage}% Refund
              </Badge>
            )}
          </div>
        </div>

        {/* Cancellation Reason */}
        <div>
          <Label htmlFor="reason">Cancellation Reason *</Label>
          <Select value={cancellationReason} onValueChange={setCancellationReason}>
            <SelectTrigger>
              <SelectValue placeholder="Select a reason" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="changed_plans">Changed Plans</SelectItem>
              <SelectItem value="found_alternative">Found Alternative Transportation</SelectItem>
              <SelectItem value="driver_delay">Driver Taking Too Long</SelectItem>
              <SelectItem value="wrong_location">Entered Wrong Location</SelectItem>
              <SelectItem value="emergency">Emergency</SelectItem>
              <SelectItem value="price_too_high">Price Too High</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Additional Notes */}
        <div>
          <Label htmlFor="notes">Additional Notes (Optional)</Label>
          <Textarea
            id="notes"
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="Any additional information..."
            rows={3}
          />
        </div>

        {/* Cancellation Policy */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-sm mb-2">Cancellation Policy</h4>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>• Free cancellation before driver assignment</li>
            <li>• 10% fee if driver assigned but not en route</li>
            <li>• 50% fee if driver is on the way</li>
            <li>• No refund once trip has started</li>
            <li>• Scheduled trips: Free cancellation 60+ min before pickup</li>
            <li>• Refunds processed within 3-5 business days</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="destructive"
            className="flex-1"
            onClick={handleCancelTrip}
            disabled={loading}
          >
            {loading ? 'Cancelling...' : 'Confirm Cancellation'}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Keep Trip
          </Button>
        </div>

        {refundCalc.refundAmount === 0 && (
          <p className="text-xs text-center text-destructive">
            ⚠️ Warning: You will not receive a refund for this cancellation
          </p>
        )}
      </CardContent>
    </Card>
  );
}
