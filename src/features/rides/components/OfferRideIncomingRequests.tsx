import { notificationsAPI } from '../../../services/notifications.js';
import { getConnectedRides, updateConnectedRide } from '../../../services/journeyLogistics';
import { updateRideBooking, type RideBookingRecord } from '../../../services/rideLifecycle';
import { DS, r } from '../../../pages/waselServiceShared';

type OfferRideIncomingRequestsProps = {
  incomingRequests: RideBookingRecord[];
  onStatusMessage: (message: string) => void;
};

export function OfferRideIncomingRequests({
  incomingRequests,
  onStatusMessage,
}: OfferRideIncomingRequestsProps) {
  if (incomingRequests.length === 0) return null;

  return (
    <div
      style={{
        background: DS.card,
        borderRadius: r(18),
        border: `1px solid ${DS.border}`,
        padding: '18px 18px 14px',
        marginBottom: 18,
      }}
    >
      <div style={{ color: DS.text, fontWeight: 800, marginBottom: 12 }}>
        Incoming booking requests
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {incomingRequests.map(request => (
          <div
            key={request.id}
            style={{
              background: DS.card2,
              border: `1px solid ${DS.border}`,
              borderRadius: r(14),
              padding: '12px 14px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ color: DS.text, fontWeight: 700, fontSize: '0.84rem' }}>
                  {request.from} to {request.to}
                </div>
                <div style={{ color: DS.sub, fontSize: '0.74rem', marginTop: 4 }}>
                  {request.passengerName} requested {request.seatsRequested} seat on {request.date}{' '}
                  at {request.time}.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={async () => {
                    try {
                      const updated = await updateRideBooking(request.id, {
                        status: 'confirmed',
                        paymentStatus: 'authorized',
                      });
                      const ride = getConnectedRides().find(item => item.id === request.rideId);
                      if (ride) {
                        updateConnectedRide(ride.id, {
                          seats: Math.max(0, ride.seats - request.seatsRequested),
                        });
                      }
                      if (updated) {
                        notificationsAPI
                          .createNotification({
                            title: 'Ride request confirmed',
                            message: `${updated.from} to ${updated.to} is now confirmed for ${updated.passengerName}.`,
                            type: 'booking',
                            priority: 'high',
                            action_url: '/app/my-trips?tab=rides',
                            channels: ['whatsapp', 'sms', 'email'],
                            contact: {
                              phone: updated.passengerPhone ?? null,
                              email: updated.passengerEmail ?? null,
                            },
                          })
                          .catch(() => {});
                      }
                      onStatusMessage('Booking request confirmed and seats updated.');
                    } catch {
                      onStatusMessage('Could not confirm this booking request right now.');
                    }
                  }}
                  style={{
                    height: 38,
                    padding: '0 14px',
                    borderRadius: '99px',
                    border: 'none',
                    background: DS.gradG,
                    color: DS.text,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Accept
                </button>
                <button
                  onClick={async () => {
                    try {
                      const updated = await updateRideBooking(request.id, {
                        status: 'rejected',
                        paymentStatus: 'failed',
                      });
                      if (updated) {
                        notificationsAPI
                          .createNotification({
                            title: 'Ride request declined',
                            message: `${updated.from} to ${updated.to} could not be confirmed. The rider can choose another departure.`,
                            type: 'booking',
                            priority: 'medium',
                            action_url: '/app/find-ride',
                            channels: ['whatsapp', 'sms', 'email'],
                            contact: {
                              phone: updated.passengerPhone ?? null,
                              email: updated.passengerEmail ?? null,
                            },
                          })
                          .catch(() => {});
                      }
                      onStatusMessage('Booking request declined.');
                    } catch {
                      onStatusMessage('Could not decline this booking request right now.');
                    }
                  }}
                  style={{
                    height: 38,
                    padding: '0 14px',
                    borderRadius: '99px',
                    border: `1px solid ${DS.border}`,
                    background: DS.card2,
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Decline
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
