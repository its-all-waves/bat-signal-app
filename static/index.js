import { SSESource } from "https://esm.sh/jsr/@planigale/sse";

window.onload = async function() {
  const statusElems = {
    sseStatus: document.getElementById("sse-status"),
    batSignalStatus: document.getElementById("is-bat-signal-busy"),
  }
  let sseSource;
  try {
    sseSource = new SSESource("/connect", {
      method: "POST",
      body: JSON.stringify({ isAuthorizedLOL: true })
    })
    statusElems.sseStatus.textContent = "🟢"
  } catch (err) {
    console.error("Couldn't make SSE connection:", err)
    statusElems.sseStatus.textContent = "🔴"
    setTimeout(() => { location.reload() }, 5000)
  }
  try {
    for await (const event of sseSource) {
      if (!event.data) continue
      console.log(event.data)
      let data = null
      try {
        data = JSON.parse(event.data)
      } catch (err) {
        console.error("ERROR: Parsing JSON from SSE:", err)
      }
      if (data && !data.heartbeat) {
        const {
          is_bat_signal_busy,
          is_someone_coming,
        } = data
        statusElems.batSignalStatus.textContent =
          is_someone_coming
            ? "Coming!"
            : is_bat_signal_busy
              ? "Bat Signal raised!"
              : "Bat Signal ready."
      }
    }
    console.log("SSE connection closed.")
    statusElems.sseStatus.textContent = "🟡"
  } catch (err) {
    console.error("Lost SSE connection:", err);
    statusElems.sseStatus.textContent = "🔴"
    setTimeout(() => { location.reload() }, 5000)
  }
}

async function dingDong() {
  try {
    const resp = await fetch("/dingDong", {
      method: "POST",
      body: JSON.stringify({ isAuthorizedLOL: true })
    })
    const { success } = await resp.json()
    if (!success) return false
    return true
  } catch (err) {
    console.error(err)
    return false
  }
}

const Global = {
  dingDong
}

window.Global = Global
