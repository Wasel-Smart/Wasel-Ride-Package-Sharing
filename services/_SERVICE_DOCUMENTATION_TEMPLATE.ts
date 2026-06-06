/**
 * Service Layer Documentation Template
 * Copy this template to document each service module
 */

/**
 * Booking Service
 * 
 * Responsible for creating, managing, and retrieving bookings.
 * Handles booking lifecycle: creation → confirmation → payment → completion
 * 
 * @example
 * ```typescript
 * import { bookingService } from '@/services/bookings';
 * 
 * // Search available trips
 * const trips = await bookingService.searchTrips({
 *   startLocation: { lat: 31.9, lng: 35.9 },
 *   endLocation: { lat: 31.8, lng: 35.9 },
 *   date: new Date(),
 * });
 * 
 * // Create booking
 * const booking = await bookingService.createBooking({
 *   tripId: 'trip-123',
 *   passengers: 2,
 * });
 * ```
 * 
 * @category Services
 * @see {@link PaymentService} for payment-related operations
 * @see {@link TripService} for trip management
 */

/**
 * Service Contract
 * 
 * This service exposes the following methods:
 * 
 * ### Trip Search
 * - `searchTrips(options)` - Find available trips
 * - `getTripDetails(tripId)` - Get specific trip details
 * 
 * ### Booking Management
 * - `createBooking(data)` - Create new booking
 * - `getBooking(bookingId)` - Retrieve booking details
 * - `cancelBooking(bookingId)` - Cancel booking
 * - `updateBooking(bookingId, data)` - Update booking
 * - `listBookings(filter)` - List user's bookings
 * 
 * ### Error Handling
 * All methods throw specifically typed errors:
 * - {@link AuthenticationError} - Authentication required
 * - {@link ValidationError} - Invalid input data
 * - {@link NetworkError} - Network/API errors
 * - {@link PaymentError} - Payment-related issues
 */

/**
 * Dependency Injection
 * 
 * Service depends on:
 * - Supabase client for database operations
 * - Stripe client for payment processing
 * - Logger for error tracking
 * 
 * These are injected via service factory pattern to enable easy mocking in tests.
 */

/**
 * Performance Considerations
 * 
 * - Trip search results are cached for 5 minutes
 * - Booking details are cached for 1 hour
 * - List operations support pagination (limit/offset)
 * - Network retries with exponential backoff (3 attempts)
 */

/**
 * Testing
 * 
 * @see tests/integration/booking.test.ts - Integration tests
 * @see tests/unit/services/bookings.test.ts - Unit tests
 * 
 * Key test scenarios:
 * - Search with invalid location returns validation error
 * - Booking without auth returns 401
 * - Duplicate bookings prevented
 * - Payment failure cancels booking
 */

/**
 * Monitoring & Observability
 * 
 * Service emits the following events to Sentry:
 * - `booking.created` - New booking created
 * - `booking.cancelled` - Booking cancelled
 * - `trip.search.failed` - Trip search failed
 * 
 * Key metrics tracked:
 * - Search latency
 * - Booking creation success rate
 * - Payment processing time
 */

/**
 * Migration Notes
 * 
 * Version 1.0 (Current):
 * - Trip search filters by date and location
 * - Bookings require authentication
 * - Payment required within 1 hour of booking
 * 
 * Planned for v2.0:
 * - Support scheduled (pre-book) trips
 * - Allow guest bookings with email verification
 * - Split payment options
 */

// Example - DO NOT IMPORT THIS FILE
// This is documentation only - refer to actual service implementation
