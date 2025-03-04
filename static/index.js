async function dingDong() {
  console.log("ding dong!")
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
