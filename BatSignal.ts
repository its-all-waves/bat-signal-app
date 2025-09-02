import type { ISinglePropertyCloudClient } from "npm:arduino-iot-js";
import { ArduinoIoTCloud } from "npm:arduino-iot-js";
import { jsClientDeviceId, jsClientSecretKey } from "./secrets.ts";

/**
 *
 * `BatSignal` maintains a connection to Arduino IoT Cloud
 * and controls the associated device with its public methods.
 *
 * When Arduino Cloud sends down a variable update, a Deno
 * `BroadcastChannel` is used to notify the SSE stream generator.
 *
 * Use it like a singleton.
 *
 * # Usage:
 * ```ts
 * const batSignal = new BatSignal()
 * await batSignal.connect()
 * batSignal.on()
 * ```
 */

export default class BatSignal {
  private client: ISinglePropertyCloudClient | null = null;

  private isConnected = false;

  private readonly BAT_SIGNAL_VAR = "bat_signal";

  /** Kept in sync with `bat_signal` in Arduino Cloud,
  but cannot initialize to the Cloud value. Can only
  listen and respond to change events. */
  private bat_signal = false;

  private readonly SOMEONE_IS_COMING_VAR = "someone_is_coming";

  private someone_is_coming = false;

  /* Used to announce Arduino var changes, triggering outgoing SSE message */
  private broadcastChannel = new BroadcastChannel('bat-signal');

  constructor() {}

  async connect() {
    try {
      this.client = await ArduinoIoTCloud.connect({
        deviceId: jsClientDeviceId,
        secretKey: jsClientSecretKey,
        onConnected: () => {
          console.log("CONNECTED TO ARDUINO CLOUD");
          this.isConnected = true;
        },
        onDisconnect: (message) => {
          console.error("ERROR: DISCONNECTED FROM ARDUIONO CLOUD:", message);
          this.isConnected = false;
        },
        onOffline: () => {
          console.error("ERROR: OFFLINE -- WHAT CAUSED THIS?");
          this.isConnected = false;
        },
      });
    } catch (err) {
      console.error("ERROR: COULD NOT CONNECT TO ARDUINO CLOUD:", err);
      return;
    }

    // keep local in sync with cloud
    this.client.onPropertyValue(this.BAT_SIGNAL_VAR, (val: boolean) => {
      this.bat_signal = val;

      // DEBUG
      // console.log("BROADCAST FROM BAT SIGNAL")

      this.broadcastChannel.postMessage("CHANGED");
      console.log(
        `CHANGED IN CLOUD: ${this.BAT_SIGNAL_VAR} -> ${this.bat_signal}`,
      );
    });
    this.client.onPropertyValue(this.SOMEONE_IS_COMING_VAR, (val: boolean) => {
      this.someone_is_coming = val;

      // DEBUG
      // console.log("BROADCAST SOMEONE IS COMING")

      this.broadcastChannel.postMessage("CHANGED");
      console.log(
        `CHANGED IN CLOUD: ${this.SOMEONE_IS_COMING_VAR} -> ${this.someone_is_coming}`,
      );
    });
  }

  /* @throws */
  private assertIsConnected() {
    if (!this.isConnected) {
      throw new Error("ERROR: NOT CONNECTED TO ARDUINO CLOUD");
    }
  }

  /* @throws */
  private setBatSignal(val: boolean) {
    this.assertIsConnected();
    this.bat_signal = val;
    this.client!.sendProperty(this.BAT_SIGNAL_VAR, this.bat_signal);

    // DEBUG
    // console.log("BROADCAST SET BAT SIGNAL")

    this.broadcastChannel.postMessage("CHANGED");
  }

  /* @throws */
  on() {
    this.setBatSignal(true);
    console.log("TURNED ON BAT SIGNAL");
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
}
