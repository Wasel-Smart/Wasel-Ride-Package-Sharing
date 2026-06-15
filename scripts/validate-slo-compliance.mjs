#!/usr/bin/env node
import { readFileSync } from 'fs';

/**
 * Validates load test results against SLO targets
 */

const SLO_TARGETS = {
  ride_matching_p95: 700, // ms
  package_delivery_p95: 400, // ms
  payment_p95: 350, // ms
  api_gateway_p95: 250, // ms
  error_rate_max: 0.01, // 1%
  availability: 0.999, // 99.9%
};

const summaryFile = process.argv[2];

if (!summaryFile) {
  console.error('❌ Usage: validate-slo-compliance.mjs <summary-file.json>');
  process.exit(1);
}

try {
  const summary = JSON.parse(readFileSync(summaryFile, 'utf-8'));
  
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║           SLO Compliance Validation Report                       ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝');
  console.log('');
  
  const metrics = summary.metrics || {};
  let allPassed = true;
  
  // Ride Matching SLO
  const rideP95 = metrics.ride_request_latency?.values?.['p(95)'] || 0;
  const ridePass = rideP95 < SLO_TARGETS.ride_matching_p95;
  console.log(`Ride Matching p95: ${rideP95.toFixed(2)}ms ${ridePass ? '✅' : '❌'} (target: <${SLO_TARGETS.ride_matching_p95}ms)`);
  if (!ridePass) allPassed = false;
  
  // Package Delivery SLO
  const packageP95 = metrics.package_request_latency?.values?.['p(95)'] || 0;
  const packagePass = packageP95 < SLO_TARGETS.package_delivery_p95;
  console.log(`Package Delivery p95: ${packageP95.toFixed(2)}ms ${packagePass ? '✅' : '❌'} (target: <${SLO_TARGETS.package_delivery_p95}ms)`);
  if (!packagePass) allPassed = false;
  
  // Payment SLO
  const paymentP95 = metrics.payment_latency?.values?.['p(95)'] || 0;
  const paymentPass = paymentP95 < SLO_TARGETS.payment_p95;
  console.log(`Payment p95: ${paymentP95.toFixed(2)}ms ${paymentPass ? '✅' : '❌'} (target: <${SLO_TARGETS.payment_p95}ms)`);
  if (!paymentPass) allPassed = false;
  
  // API Gateway SLO
  const apiP95 = metrics.http_req_duration?.values?.['p(95)'] || 0;
  const apiPass = apiP95 < SLO_TARGETS.api_gateway_p95;
  console.log(`API Gateway p95: ${apiP95.toFixed(2)}ms ${apiPass ? '✅' : '❌'} (target: <${SLO_TARGETS.api_gateway_p95}ms)`);
  if (!apiPass) allPassed = false;
  
  // Error Rate SLO
  const errorRate = metrics.error_rate?.values?.rate || 0;
  const errorPass = errorRate < SLO_TARGETS.error_rate_max;
  console.log(`Error Rate: ${(errorRate * 100).toFixed(2)}% ${errorPass ? '✅' : '❌'} (target: <${SLO_TARGETS.error_rate_max * 100}%)`);
  if (!errorPass) allPassed = false;
  
  // Availability (inverse of error rate)
  const availability = 1 - errorRate;
  const availPass = availability >= SLO_TARGETS.availability;
  console.log(`Availability: ${(availability * 100).toFixed(3)}% ${availPass ? '✅' : '❌'} (target: >${SLO_TARGETS.availability * 100}%)`);
  if (!availPass) allPassed = false;
  
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (allPassed) {
    console.log('🎉 ALL SLOs PASSED - System is production ready!');
    console.log('');
    process.exit(0);
  } else {
    console.log('❌ SLO VIOLATIONS DETECTED - System needs optimization!');
    console.log('');
    console.log('Recommended actions:');
    if (!ridePass) console.log('  - Optimize ride matching algorithm');
    if (!packagePass) console.log('  - Scale package delivery workers');
    if (!paymentPass) console.log('  - Review payment service performance');
    if (!apiPass) console.log('  - Add API gateway caching');
    if (!errorPass) console.log('  - Investigate error sources');
    console.log('');
    process.exit(1);
  }
  
} catch (error) {
  console.error('❌ Error reading summary file:', error.message);
  process.exit(1);
}
