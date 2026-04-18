import { jobs } from '../../services/jobQueue';

export const rideQueue = {
  async matchDriver(rideId: string, bookingId: string) {
    const jobId = await jobs.matchDriver(rideId, 1);
    if (!jobId) {
      throw new Error(`Driver matching could not start for booking ${bookingId}.`);
    }
    return jobId;
  },
};
