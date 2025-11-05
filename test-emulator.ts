/**
 * Test script for the BatSignal Emulator
 *
 * This script demonstrates how to use the emulator API and tests
 * various scenarios including acknowledgement flow and sensor triggers.
 *
 * Run with: deno run --allow-net test-emulator.ts
 */

const BASE_URL = "http://localhost:8080";

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

console.log("🦇 BAT SIGNAL EMULATOR TEST CLIENT\n");

// Test 1: Check initial status
console.log("Test 1: Checking initial status...");
try {
  const response = await fetch(`${BASE_URL}/emulator/status`);
  const status = await response.json();
  console.log("✓ Initial status:", status);
} catch (err) {
  console.error("✗ Failed:", err.message);
  console.error("Make sure server is running: deno run --allow-net --allow-read server-emulator.ts");
  Deno.exit(1);
}

await sleep(1000);

// Test 2: Connect to SSE stream
console.log("\nTest 2: Connecting to SSE stream...");
const eventSource = new EventSource(`${BASE_URL}/connect`);
const messages: any[] = [];

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  messages.push(data);
  console.log("📡 Received SSE:", data);
};

eventSource.onerror = (err) => {
  console.error("✗ SSE Error:", err);
};

await sleep(1000);

// Test 3: Trigger bat signal (ding dong)
console.log("\nTest 3: Triggering bat signal (ding dong)...");
try {
  const response = await fetch(`${BASE_URL}/dingDong`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isAuthorizedLOL: true }),
  });
  const result = await response.json();
  console.log("✓ Ding dong result:", result);
} catch (err) {
  console.error("✗ Failed:", err.message);
}

await sleep(500);

// Wait for acknowledgement to come through
console.log("\nWaiting for Arduino acknowledgement...");
await sleep(1000);

// Test 4: Check status after bat signal
console.log("\nTest 4: Checking status after bat signal...");
try {
  const response = await fetch(`${BASE_URL}/emulator/status`);
  const status = await response.json();
  console.log("✓ Status after bat signal:", status);

  if (status.bat_signal === true) {
    console.log("✓ Bat signal is ON (acknowledgement received!)");
  } else {
    console.log("⚠ Bat signal is still OFF (acknowledgement not yet received)");
  }
} catch (err) {
  console.error("✗ Failed:", err.message);
}

await sleep(1000);

// Test 5: Trigger sensor
console.log("\nTest 5: Simulating sensor trigger (someone_is_coming)...");
try {
  const response = await fetch(`${BASE_URL}/emulator/sensor`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ triggered: true }),
  });
  const result = await response.json();
  console.log("✓ Sensor trigger result:", result);
} catch (err) {
  console.error("✗ Failed:", err.message);
}

await sleep(1000);

// Test 6: Check status after sensor
console.log("\nTest 6: Checking status after sensor trigger...");
try {
  const response = await fetch(`${BASE_URL}/emulator/status`);
  const status = await response.json();
  console.log("✓ Status after sensor:", status);

  if (status.someone_is_coming === true) {
    console.log("✓ Sensor detected someone coming!");
  }
} catch (err) {
  console.error("✗ Failed:", err.message);
}

await sleep(1000);

// Test 7: Simulate device going offline
console.log("\nTest 7: Simulating device going offline...");
try {
  const response = await fetch(`${BASE_URL}/emulator/offline`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ offline: true }),
  });
  const result = await response.json();
  console.log("✓ Offline toggle result:", result);
} catch (err) {
  console.error("✗ Failed:", err.message);
}

await sleep(500);

// Test 8: Try ding dong while offline
console.log("\nTest 8: Trying ding dong while device is offline...");
try {
  const response = await fetch(`${BASE_URL}/dingDong`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isAuthorizedLOL: true }),
  });
  const result = await response.json();
  console.log("✓ Ding dong result (offline):", result);

  if (result.success === false) {
    console.log("✓ Correctly failed when device is offline");
  }
} catch (err) {
  console.error("✗ Failed:", err.message);
}

await sleep(1000);

// Test 9: Bring device back online
console.log("\nTest 9: Bringing device back online...");
try {
  const response = await fetch(`${BASE_URL}/emulator/offline`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ offline: false }),
  });
  const result = await response.json();
  console.log("✓ Online toggle result:", result);
} catch (err) {
  console.error("✗ Failed:", err.message);
}

await sleep(1000);

// Summary
console.log("\n" + "=".repeat(50));
console.log("TEST SUMMARY");
console.log("=".repeat(50));
console.log(`Total SSE messages received: ${messages.length}`);
console.log("\nMessages:");
messages.forEach((msg, i) => {
  console.log(`  ${i + 1}. ${JSON.stringify(msg)}`);
});

console.log("\n✓ All tests completed!");
console.log("\nNote: SSE connection is still open. Press Ctrl+C to exit.");

// Keep the script running to receive SSE messages
await new Promise(() => {});
