import { ISinglePropertyCloudClient } from "arduino-iot-js";
import { ArduinoIoTCloud } from "arduino-iot-js";
import { jsClientDeviceId, jsClientSecretKey } from "./secrets.ts";

/**

`BatSignal` maintains a connection to Arduino IoT Cloud and
exposes the `on()` and `toggle()` methods.

# Usage:
```ts
const batSignal = new BatSignal()
await batSignal.connect()
batSignal.on()
batSignal.toggle()
```

*/
export default class BatSignal {
  private client: ISinglePropertyCloudClient | null = null;

  private isConnected = false;

  private batSignalVar = "bat_signal";

  /** Kept in sync with `bat_signal` in Arduino Cloud,
  but cannot initialize to the Cloud value. Can only
  listen and respond to change events. */
  private bat_signal = false;

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
    this.client.onPropertyValue(this.batSignalVar, (val: boolean) => {
      this.bat_signal = val;
      console.log(
        `CHANGED IN CLOUD: ${this.batSignalVar} -> ${this.bat_signal}`,
      );
    });
  }

  private assertIsConnected() {
    if (!this.isConnected) {
      throw new Error("ERROR: NOT CONNECTED TO ARDUINO CLOUD");
    }
  }

  private setBatSignal(val: boolean) {
    this.assertIsConnected();
    this.bat_signal = val;
    this.client!.sendProperty(this.batSignalVar, this.bat_signal);
  }

  on() {
    if (this.bat_signal === true) return;
    this.setBatSignal(true);
    console.log("TURNED ON BAT SIGNAL");
  }

  toggle() {
    this.setBatSignal(!this.bat_signal);
    console.log(`TOGGLED BAT SIGNAL -> ${this.bat_signal}`);
  }
}
