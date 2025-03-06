import { SSESource } from "https://esm.sh/jsr/@planigale/sse";

window.onload = async function() {
  const statusElems = {
    sseStatus: document.getElementById("sse-status"),
    isBatSignalBusy: document.getElementById("is-bat-signal-busy"),
    isSomeoneComing: document.getElementById("is-someone-coming"),
  }
  const sseSource = new SSESource("/connect", {
    method: "POST",
    body: JSON.stringify({ isAuthorizedLOL: true })
  })
  try {
    for await (const event of sseSource) {
      statusElems.sseStatus.textContent = "🟢"
      if (!event.data) continue
      console.log(event.data)
      let data = null
      try {
        data = JSON.parse(event.data)
      } catch (err) {
        console.error("ERROR: Parsing JSON from SSE:", err)
      }
      if (data) {
        const {
          sse_interval_ms: _,
          is_bat_signal_busy,
          is_someone_coming,
        } = data
        statusElems.isBatSignalBusy.textContent = is_bat_signal_busy
          ? "Bat Signal raised!"
          : "Bat Signal ready."
        statusElems.isSomeoneComing.textContent = is_someone_coming
          ? "Coming!" : "\xa0"
      }
    }
    console.log("SSE connection closed.")
    statusElems.sseStatus.textContent = "🟡"
  } catch (err) {
    // console.error("ERROR: Couldn't connect or lost connection to the event stream:", err);
    statusElems.sseStatus.textContent = "🔴"
    console.error(err)
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
