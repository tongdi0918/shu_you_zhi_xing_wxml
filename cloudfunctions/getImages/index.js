// cloudfunctions/getImages/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV  // 自动使用当前云环境
})

exports.main = async (event, context) => {
  const { fileList } = event  // 接收前端传入的 fileID 数组

  if (!fileList || fileList.length === 0) {
    return { fileList: [] }
  }

  try {
    // 调用云开发接口换取临时链接（一次最多 50 个）[reference:4]
    const result = await cloud.getTempFileURL({
      fileList: fileList
    })

    // 返回结果，每个 item 包含 fileID 和 tempFileURL
    return {
      fileList: result.fileList
    }
  } catch (err) {
    console.error('云函数获取图片链接失败：', err)
    return {
      fileList: [],
      error: err.message
    }
  }
}