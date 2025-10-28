# Ding Dong / Bat Signal Server

## Run the Server Locally

- Install dependencies: `npm i && deno cache`
- Start the dev server: `deno task dev`

## Build & Run the Docker Container

- Build: `docker build -t ding-dong .`
- Run: `docker run -p 80:8080 ding-dong` or `docker run -d --restart=always -p 80:8080 ding-dong`

## Architecture

Arduino Cloud is the hub for the data that's shared between the Bat Signal (physical device) and the frontend at NolaDevs.org. Cloud Variables are defined in Arduino Cloud and synced with the same variables declared in the physical device's source code. The Deno Server is registered with Arduino Cloud, allowing for the reading/writing of Cloud Variables from any frontend registered with the Deno Server.

### Bat Signal (Physical Device)

The physical device itself is called "Bat Signal". "Ding Dong" is how we refer to the whole system.

Bat Signal is a light-emitting "doorbell" that's triggered by the press of a button on the page at [NolaDevs.org/letmein](https://NolaDevs.org/letmein). 

Bat Signal does two things:

1. When the Ding Dong button is pressed on the web frontend, it projects a large image onto the wall inside the building.
2. When the on-device button is pressed, it tells the frontend that someone is coming to let them in.

### Arduino Cloud

The 'Bat Signal' is the **Thing**. The **Thing** takes the Sketch (source code), an **Associated Device**, and **Cloud Variables**.

The Deno Server is represented as a **Thing** in Arduino Cloud, and thus also has an **Associated Device**. In this case, the **Associated Device**' is a "manual" device type, using the JS library provided by Arduino Cloud.

Arduino Cloud dispatches **Cloud Variable** change events to a **Thing's** **Associated Device**, and event handlers are defined in the **Associated Device's** source code.

Each **Thing** gets its own **Cloud Variables**. It's possible to sync **Cloud Variables** of multple **Things**.

> You'd think that you could declare **Cloud Variables**, then at least read from multiple devices, allowing for a single source of truth, but this is not the way Arduino Cloud is designed. In order to sync variables across multiple **Things**, we create **Cloud Variables** of the same type in both **Things** that we want to keep in sync, then set each variable to be synced in Arduino Cloud.

> One annoying effect of the way we sync data between multiple **Things** is, if you have a **Dashboard** set up with toggle switches representing 2 synced **Cloud Variables**, toggling one does not toggle the other, making it appear as if the underlying **Cloud Variables** are not in-sync. However, the end-to-end result is what we expect--when we press the Ding Dong button in the web UI, the physical device's relay is triggered.
>> Here, the Deno Server **Thing's** `bat_signal` **Cloud Variable** is synced with that of the Bat Signal **Thing**. The web UI tells the Deno Server to mutate it's **Thing's** `bat_signal`, which triggers the change in that of the Bat Signal **Thing**.)

Here's the relationship between the synced Cloud Variables:

```
Bat Signal
├─ bat_signal ────────┐
└─ im_coming ──────┐  │
                   │  │
Deno Server        │  │
├─ bat_signal ─────┘  │
└─ someone_is_coming ─┘
```

#### Terms

- [**Thing**](https://docs.arduino.cc/arduino-cloud/cloud-interface/things)
- [**Cloud Variable**](https://docs.arduino.cc/arduino-cloud/cloud-interface/things#variables)
- [**Associated Device**](https://docs.arduino.cc/arduino-cloud/hardware/devices)
- [**Dashboard**](https://docs.arduino.cc/arduino-cloud/cloud-interface/dashboard-widgets)

### Deno Server (This Repo)

The Deno Server serves as a proxy between Arduino Cloud and frontends whose hosts are registered with the Deno Server, such as NolaDevs.org.

It runs in a Docker container behind nginx on a VPS, and maintains a connection to Arduino Cloud using [arduino-iot-js](https://github.com/arduino/arduino-iot-js). This lib facilitates sending/receiving cloud variable change events to/from Arduino Cloud.

Server-sent events (SSE) are used to stream data to the frontend. To share the incoming Cloud Variable changes with multiple clients, Deno's [unstable] `BroadcastChannel` API is used.

