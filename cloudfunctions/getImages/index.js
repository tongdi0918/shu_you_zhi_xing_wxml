// cloudfunctions/getImages/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const { fileList } = event

  if (!fileList || fileList.length === 0) {
    return { fileList: [] }
  }

  // 前端已分批，每次传入不超过50个，但为防万一，这里再分批处理
  const BATCH_SIZE = 50
  const batches = []
  for (let i = 0; i < fileList.length; i += BATCH_SIZE) {
    batches.push(fileList.slice(i, i + BATCH_SIZE))
  }

  const allResults = []
  for (const batch of batches) {
    try {
      const result = await cloud.getTempFileURL({
        fileList: batch
      })
      allResults.push(...result.fileList)
    } catch (err) {
      console.error('云函数内部批次获取失败：', err)
      // 如果某批失败，继续下一批
    }
  }

  return {
    fileList: allResults
  }
}