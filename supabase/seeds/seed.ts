import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// -------------------------
// Helpers
// -------------------------
const random = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const uuid = () => crypto.randomUUID();

const cities = [
  'Amsterdam',
  'Rotterdam',
  'Utrecht',
  'Eindhoven',
  'Groningen',
  'Antwerp',
  'Brussels'
];

const names = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley'];

// -------------------------
// SEED DATA GENERATORS
// -------------------------

async function seedUsers(count = 50) {
  const users = Array.from({ length: count }).map(() => ({
    id: uuid(),
    full_name: random(names) + ' ' + random(['Smith', 'Johnson', 'Brown']),
    email: `user_${Math.random().toString(36).substring(7)}@test.com`,
    role: random(['passenger', 'driver', 'admin']),
    created_at: new Date().toISOString()
  }));

  const { error } = await supabase.from('users').insert(users);
  if (error) throw error;

  return users;
}

async function seedBuses(drivers: any[]) {
  const buses = Array.from({ length: 20 }).map(() => ({
    id: uuid(),
    driver_id: random(drivers).id,
    capacity: 30 + Math.floor(Math.random() * 20),
    plate_number: `BUS-${Math.floor(Math.random() * 9999)}`,
    status: 'active'
  }));

  const { error } = await supabase.from('buses').insert(buses);
  if (error) throw error;

  return buses;
}

async function seedTrips(buses: any[]) {
  const trips = Array.from({ length: 60 }).map(() => {
    const from = random(cities);
    let to = random(cities);
    while (to === from) to = random(cities);

    const departure = new Date();
    departure.setDate(departure.getDate() + Math.floor(Math.random() * 10));

    return {
      id: uuid(),
      bus_id: random(buses).id,
      from_city: from,
      to_city: to,
      departure_time: departure.toISOString(),
      price: 10 + Math.random() * 50,
      status: random(['scheduled', 'active', 'completed'])
    };
  });

  const { error } = await supabase.from('trips').insert(trips);
  if (error) throw error;

  return trips;
}

async function seedBookings(users: any[], trips: any[]) {
  const bookings = Array.from({ length: 120 }).map(() => ({
    id: uuid(),
    user_id: random(users).id,
    trip_id: random(trips).id,
    seat_number: Math.floor(Math.random() * 40),
    status: random(['confirmed', 'cancelled', 'pending']),
    payment_status: random(['paid', 'unpaid', 'refunded'])
  }));

  const { error } = await supabase.from('bookings').insert(bookings);
  if (error) throw error;

  return bookings;
}

async function seedPackages(users: any[], trips: any[]) {
  const packages = Array.from({ length: 80 }).map(() => ({
    id: uuid(),
    sender_id: random(users).id,
    receiver_id: random(users).id,
    trip_id: random(trips).id,
    weight_kg: +(Math.random() * 20).toFixed(2),
    status: random(['created', 'in_transit', 'delivered', 'lost']),
    tracking_code: `PKG-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
  }));

  const { error } = await supabase.from('packages').insert(packages);
  if (error) throw error;

  return packages;
}

async function seedPayments(users: any[]) {
  const payments = Array.from({ length: 200 }).map(() => ({
    id: uuid(),
    user_id: random(users).id,
    amount: +(Math.random() * 100).toFixed(2),
    currency: 'EUR',
    status: random(['success', 'failed', 'pending', 'refunded']),
    provider: random(['stripe', 'paypal', 'wallet']),
    created_at: new Date().toISOString()
  }));

  const { error } = await supabase.from('payments').insert(payments);
  if (error) throw error;

  return payments;
}

// -------------------------
// MAIN RUNNER
// -------------------------

async function runSeed() {
  console.log('🚀 Starting Supabase seed...');

  try {
    console.log('👤 Seeding users...');
    const users = await seedUsers(50);

    const drivers = users.filter(u => u.role === 'driver');

    console.log('🚌 Seeding buses...');
    const buses = await seedBuses(drivers);

    console.log('🚏 Seeding trips...');
    const trips = await seedTrips(buses);

    console.log('🎟️ Seeding bookings...');
    await seedBookings(users, trips);

    console.log('📦 Seeding packages...');
    await seedPackages(users, trips);

    console.log('💳 Seeding payments...');
    await seedPayments(users);

    console.log('✅ SEED COMPLETE');
  } catch (err) {
    console.error('❌ SEED FAILED:', err);
  }
}

runSeed();
