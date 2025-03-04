import { ISinglePropertyCloudClient } from "arduino-iot-js";
import { ArduinoIoTCloud } from "arduino-iot-js";
import { deviceId, secretKey } from "./secrets.ts";

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

  private batSignalVar = "bat_signal";

  /** Kept in sync with `bat_signal` in Arduino Cloud,
  but cannot initialize to the Cloud value. Can only
  listen respond to change events. */
  private bat_signal = false;

  constructor() {}

  public async connect() {
    this.client = await ArduinoIoTCloud.connect({
      deviceId,
      secretKey,
      onConnected() {
        console.log("CONNECTED TO ARDUINO CLOUD");
      },
      onDisconnect(message) {
        console.error("ERROR: DISCONNECTED FROM ARDUIONO CLOUD:", message);
      },
    });

    // keep local in sync with cloud
    this.client.onPropertyValue(this.batSignalVar, (val: boolean) => {
      this.bat_signal = val;
      console.log(
        `CHANGED IN CLOUD: ${this.batSignalVar} -> ${this.bat_signal}`,
      );
    });
  }

  private ensureConnection() {
    if (!this.client) {
      throw new Error("Could not connect to Arduino Cloud.");
    }
  }

  on() {
    this.ensureConnection();
    this.client!.sendProperty(this.batSignalVar, true);
    console.log("TURNED ON BAT SIGNAL");
  }

  toggle() {
    this.ensureConnection();
    this.bat_signal = !this.bat_signal;
    this.client!.sendProperty(this.batSignalVar, this.bat_signal);
    console.log(`TOGGLED BAT SIGNAL -> ${this.bat_signal}`);
  }
}
