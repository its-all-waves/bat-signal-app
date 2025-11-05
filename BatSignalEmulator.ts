import type { ISinglePropertyCloudClient } from "./MockArduinoCloud.ts";
import { MockArduinoIoTCloud, MockCloudClient } from "./MockArduinoCloud.ts";

/**
 * BatSignalEmulator - Test version of BatSignal using mock Arduino Cloud
 *
 * This emulator allows you to test the full BatSignal functionality
 * without connecting to actual Arduino hardware. It simulates:
 * - Arduino device responses
 * - Acknowledgement flow
 * - Sensor triggers
 * - Offline/online scenarios
 *
 * # Usage:
 * ```ts
 * const batSignal = new BatSignalEmulator({
 *   deviceResponseDelay: 200, // Simulate 200ms Arduino response time
 *   simulateOffline: false,    // Start in online mode
 * })
 * await batSignal.connect()
 * batSignal.on()
 *
 * // Test offline scenario
 * batSignal.setOffline(true)
 * batSignal.on() // This will fail gracefully
 *
 * // Test sensor trigger
 * batSignal.simulateSensorTrigger(true)
 * ```
 */

interface EmulatorConfig {
  /** Simulate Arduino device response delay in ms (default: 100) */
  deviceResponseDelay?: number;
  /** Start with device offline (default: false) */
  simulateOffline?: boolean;
}

export default class BatSignalEmulator {
  private client: MockCloudClient | null = null;

  private isConnected = false;

  private readonly BAT_SIGNAL_VAR = "bat_signal";

  /** Kept in sync with `bat_signal` in Arduino Cloud,
  but cannot initialize to the Cloud value. Can only
  listen and respond to change events. */
  private bat_signal = false;

  private readonly SOMEONE_IS_COMING_VAR = "someone_is_coming";

  private someone_is_coming = false;

  private readonly DID_BAT_SIGNAL_TURN_ON_VAR = "did_bat_signal_turn_on";

  /** Used for acknowledgement from Arduino device.
  When Arduino receives bat_signal=true and turns on its projector,
  it sets this to true. Server then updates local state and resets to false. */
  private did_bat_signal_turn_on = false;

  /* Used to announce Arduino var changes, triggering outgoing SSE message */
  private broadcastChannel = new BroadcastChannel('bat-signal');

  private config: EmulatorConfig;

  constructor(config: EmulatorConfig = {}) {
    this.config = config;
    console.log("[EMULATOR] BatSignalEmulator initialized");
  }

  async connect() {
    try {
      this.client = await MockArduinoIoTCloud.connect({
        deviceId: "mock-device-id",
        secretKey: "mock-secret-key",
        deviceResponseDelay: this.config.deviceResponseDelay,
        simulateOffline: this.config.simulateOffline,
        onConnected: () => {
          console.log("CONNECTED TO ARDUINO CLOUD (EMULATOR MODE)");
          this.isConnected = true;
        },
        onDisconnect: (message) => {
          console.error("ERROR: DISCONNECTED FROM ARDUINO CLOUD (EMULATOR MODE):", message);
          this.isConnected = false;
        },
        onOffline: () => {
          console.error("ERROR: OFFLINE -- WHAT CAUSED THIS?");
          this.isConnected = false;
        },
      });
    } catch (err) {
      console.error("ERROR: COULD NOT CONNECT TO ARDUINO CLOUD (EMULATOR MODE):", err);
      return;
    }

    // keep local in sync with cloud
    this.client.onPropertyValue(this.BAT_SIGNAL_VAR, (val: boolean) => {
      this.bat_signal = val;
      this.broadcastChannel.postMessage("CHANGED");
      console.log(
        `CHANGED IN CLOUD: ${this.BAT_SIGNAL_VAR} -> ${this.bat_signal}`,
      );
    });
    this.client.onPropertyValue(this.SOMEONE_IS_COMING_VAR, (val: boolean) => {
      this.someone_is_coming = val;
      this.broadcastChannel.postMessage("CHANGED");
      console.log(
        `CHANGED IN CLOUD: ${this.SOMEONE_IS_COMING_VAR} -> ${this.someone_is_coming}`,
      );
    });

    // Handle acknowledgement from Arduino device
    this.client.onPropertyValue(this.DID_BAT_SIGNAL_TURN_ON_VAR, (val: boolean) => {
      this.did_bat_signal_turn_on = val;
      console.log(
        `CHANGED IN CLOUD: ${this.DID_BAT_SIGNAL_TURN_ON_VAR} -> ${this.did_bat_signal_turn_on}`,
      );

      // When Arduino acknowledges it turned on the projector
      if (val === true) {
        console.log("RECEIVED ACKNOWLEDGEMENT FROM ARDUINO: Bat Signal projector is ON");
        // Update local state and broadcast to clients
        this.bat_signal = true;
        this.broadcastChannel.postMessage("CHANGED");

        // Reset acknowledgement flag so Arduino can respond to next request
        this.client!.sendProperty(this.DID_BAT_SIGNAL_TURN_ON_VAR, false);
        console.log("RESET ACKNOWLEDGEMENT FLAG");
      }
    });
  }

  /* @throws */
  private assertIsConnected() {
    if (!this.isConnected) {
      throw new Error("ERROR: NOT CONNECTED TO ARDUINO CLOUD");
    }
  }

  /* @throws */
  private setBatSignal(val: boolean, cloudOnly = false) {
    this.assertIsConnected();
    this.client!.sendProperty(this.BAT_SIGNAL_VAR, val);

    // Only update local state and broadcast if not waiting for acknowledgement
    if (!cloudOnly) {
      this.bat_signal = val;
      this.broadcastChannel.postMessage("CHANGED");
    }
  }

  /* @throws */
  on() {
    // Send to cloud only, wait for Arduino acknowledgement before updating local state
    this.setBatSignal(true, true);
    console.log("SENT BAT SIGNAL REQUEST TO ARDUINO (waiting for acknowledgement)");
  }

  /* @throws */
  off() {
    this.setBatSignal(false);
    console.log("TURNED OFF BAT SIGNAL");
  }

  /* @throws */
  toggle() {
    this.setBatSignal(!this.bat_signal);
    console.log(`TOGGLED BAT SIGNAL -> ${this.bat_signal}`);
  }

  isOn() {
    return this.bat_signal;
  }

  isSomeoneComing() {
    return this.someone_is_coming;
  }

  // ===== EMULATOR-SPECIFIC METHODS =====

  /**
   * Simulate the someone_is_coming sensor being triggered
   * This is how you can test the sensor functionality
   */
  simulateSensorTrigger(isTriggered: boolean) {
    if (!this.client) {
      throw new Error("ERROR: NOT CONNECTED TO ARDUINO CLOUD");
    }
    console.log(`[EMULATOR] Simulating sensor trigger: ${isTriggered}`);
    this.client.simulateSensorTrigger(isTriggered);
  }

  /**
   * Toggle the device offline/online status
   * Use this to test how the system behaves when Arduino is offline
   */
  setOffline(offline: boolean) {
    if (!this.client) {
      throw new Error("ERROR: NOT CONNECTED TO ARDUINO CLOUD");
    }
    console.log(`[EMULATOR] Setting device offline=${offline}`);
    this.client.setOffline(offline);
  }

  /**
   * Get the current connection status
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      bat_signal: this.bat_signal,
      someone_is_coming: this.someone_is_coming,
      did_bat_signal_turn_on: this.did_bat_signal_turn_on,
    };
  }
}
