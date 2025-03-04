async function dingDong() {
  console.log("ding dong!")
  try {
    const resp = await fetch("/dingDong")
  } catch (err) {
    console.error(err)
    return
  }
}
