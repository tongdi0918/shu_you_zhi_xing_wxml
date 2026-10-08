// cloudfunctions/loadAllTourData/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const MAX_LIMIT = 1000

/**
 * 分页查询集合全部数据，突破前端100条限制
 */
async function queryAll(collectionName) {
  const collection = db.collection(collectionName)
  const countRes = await collection.count()
  const total = countRes.total
  if (total === 0) return []

  const batchTimes = Math.ceil(total / MAX_LIMIT)
  const tasks = []
  for (let i = 0; i < batchTimes; i++) {
    tasks.push(collection.skip(i * MAX_LIMIT).limit(MAX_LIMIT).get())
  }

  const results = await Promise.all(tasks)
  const allData = []
  results.forEach(res => allData.push(...res.data))
  return allData
}

exports.main = async (event, context) => {
  try {
    // 1. 并行查询景区+美食全量数据
    const [sceneries, foods] = await Promise.all([
      queryAll('sceneries'),
      queryAll('foods')
    ])
    console.log(`查询到景区${sceneries.length}条，美食${foods.length}条`)

    // 2. 收集所有云存储fileID（去空格+去重）
    const allItems = [...sceneries, ...foods]
    const fileIdSet = new Set()
    allItems.forEach(item => {
      if (item.image_url && typeof item.image_url === 'string') {
        const trimmed = item.image_url.trim()
        if (trimmed.startsWith('cloud://')) {
          fileIdSet.add(trimmed)
        }
      }
    })
    const uniqueFileIds = Array.from(fileIdSet)
    console.log(`待生成临时链接的图片数量：${uniqueFileIds.length}`)

    if (uniqueFileIds.length === 0) {
      return {
        success: true,
        sceneries,
        foods,
        totalScenic: sceneries.length,
        totalFood: foods.length
      }
    }

    // 3. 分批生成临时链接（兼容字段大小写）
    const BATCH_SIZE = 200
    const urlMap = {}

    for (let i = 0; i < uniqueFileIds.length; i += BATCH_SIZE) {
      const batch = uniqueFileIds.slice(i, i + BATCH_SIZE)
      try {
        const res = await cloud.getTempFileURL({ fileList: batch })
        // 同时兼容 fileID 和 fileId 两种大小写格式
        res.fileList.forEach(item => {
          const id = item.fileID || item.fileId
          const url = item.tempFileURL
          if (id && url) {
            urlMap[id] = url
          }
        })
        console.log(`第${Math.floor(i/BATCH_SIZE)+1}批生成成功，当前共${Object.keys(urlMap).length}个链接`)
      } catch (err) {
        console.error('批次生成临时链接失败：', err)
      }
    }

    console.log(`最终生成临时链接总数：${Object.keys(urlMap).length}`)

    // 4. 替换所有数据中的图片地址（去空格匹配）
    const replaceImage = (item) => {
      if (!item.image_url) return item
      const trimmedKey = item.image_url.trim()
      if (urlMap[trimmedKey]) {
        return { ...item, image_url: urlMap[trimmedKey] }
      }
      return item
    }

    const processedSceneries = sceneries.map(replaceImage)
    const processedFoods = foods.map(replaceImage)

    return {
      success: true,
      sceneries: processedSceneries,
      foods: processedFoods,
      totalScenic: sceneries.length,
      totalFood: foods.length,
      urlCount: Object.keys(urlMap).length
    }

  } catch (err) {
    console.error('加载全部旅游数据失败：', err)
    return {
      success: false,
      error: err.message
    }
  }
}
