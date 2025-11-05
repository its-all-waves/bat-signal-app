/**
 * MockArduinoCloud - Emulates Arduino IoT Cloud for testing
 *
 * This mock simulates the Arduino device and cloud connection,
 * allowing you to test the BatSignal functionality without
 * connecting to actual Arduino hardware.
 */

export interface ISinglePropertyCloudClient {
  sendProperty: (name: string, value: boolean) => void;
  onPropertyValue: (name: string, callback: (value: boolean) => void) => void;
}

interface MockCloudConfig {
  deviceId: string;
  secretKey: string;
  onConnected: () => void;
  onDisconnect: (message: string) => void;
  onOffline: () => void;
  /** Simulate Arduino device response delay in ms (default: 100) */
  deviceResponseDelay?: number;
  /** Simulate device being offline (default: false) */
  simulateOffline?: boolean;
}

class MockCloudClient implements ISinglePropertyCloudClient {
  private propertyCallbacks = new Map<string, (value: boolean) => void>();
  private propertyValues = new Map<string, boolean>();
  private config: MockCloudConfig;

  constructor(config: MockCloudConfig) {
    this.config = config;

    // Initialize property values
    this.propertyValues.set("bat_signal", false);
    this.propertyValues.set("someone_is_coming", false);
    this.propertyValues.set("did_bat_signal_turn_on", false);
  }

  sendProperty(name: string, value: boolean): void {
    console.log(`[MOCK CLOUD] Sending ${name} = ${value} to cloud`);

    if (this.config.simulateOffline) {
      console.log(`[MOCK CLOUD] Device is offline, property not delivered`);
      return;
    }

    // Update the cloud value
    this.propertyValues.set(name, value);

    // Simulate Arduino device processing the command
    this.simulateArduinoResponse(name, value);
  }

  onPropertyValue(name: string, callback: (value: boolean) => void): void {
    this.propertyCallbacks.set(name, callback);
    console.log(`[MOCK CLOUD] Registered listener for ${name}`);
  }

  private simulateArduinoResponse(propertyName: string, value: boolean): void {
    const delay = this.config.deviceResponseDelay || 100;

    // Simulate Arduino device behavior
    if (propertyName === "bat_signal" && value === true) {
      // Arduino receives bat_signal=true, turns on projector, sends acknowledgement
      setTimeout(() => {
        console.log(`[MOCK ARDUINO] Received bat_signal=true, turning on projector`);
        console.log(`[MOCK ARDUINO] Sending acknowledgement: did_bat_signal_turn_on=true`);

        const callback = this.propertyCallbacks.get("did_bat_signal_turn_on");
        if (callback) {
          callback(true);
        }
      }, delay);
    } else if (propertyName === "bat_signal" && value === false) {
      // Arduino receives bat_signal=false, turns off projector
      setTimeout(() => {
        console.log(`[MOCK ARDUINO] Received bat_signal=false, turning off projector`);

        const callback = this.propertyCallbacks.get("bat_signal");
        if (callback) {
          callback(false);
        }
      }, delay);
    } else if (propertyName === "did_bat_signal_turn_on" && value === false) {
      // Server resets acknowledgement flag
      setTimeout(() => {
        console.log(`[MOCK ARDUINO] Acknowledgement reset received`);

        const callback = this.propertyCallbacks.get("did_bat_signal_turn_on");
        if (callback) {
          callback(false);
        }
      }, delay / 2);
    }
  }

  /**
   * Simulate someone_is_coming sensor being triggered
   * Call this manually to test the sensor functionality
   */
  simulateSensorTrigger(isTriggered: boolean): void {
    console.log(`[MOCK ARDUINO] Sensor triggered: someone_is_coming=${isTriggered}`);

    this.propertyValues.set("someone_is_coming", isTriggered);

    const callback = this.propertyCallbacks.get("someone_is_coming");
    if (callback) {
      callback(isTriggered);
    }
  }

  /**
   * Toggle offline/online status
   */
  setOffline(offline: boolean): void {
    this.config.simulateOffline = offline;

    if (offline) {
      console.log(`[MOCK CLOUD] Device went offline`);
      this.config.onOffline();
    } else {
      console.log(`[MOCK CLOUD] Device came back online`);
      this.config.onConnected();
    }
  }
}

export class MockArduinoIoTCloud {
  static async connect(config: MockCloudConfig): Promise<MockCloudClient> {
    console.log(`[MOCK CLOUD] Connecting to Arduino Cloud (mock mode)`);
    console.log(`[MOCK CLOUD] Device ID: ${config.deviceId}`);

    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 100));

    if (config.simulateOffline) {
      console.log(`[MOCK CLOUD] Connection failed: device offline`);
      throw new Error("Failed to connect to Arduino Cloud (mock offline mode)");
    }

    const client = new MockCloudClient(config);

    // Call onConnected callback
    config.onConnected();

    return client;
  }
}

export { MockCloudClient };
