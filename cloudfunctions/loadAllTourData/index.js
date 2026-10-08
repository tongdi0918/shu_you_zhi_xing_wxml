// cloudfunctions/loadAllTourData/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const MAX_LIMIT = 1000 // 云函数端单次最大查询条数

/**
 * 分页查询集合全部数据
 * 云函数端默认最多返回100条，通过 skip + limit 分页突破
 */
async function queryAll(collectionName) {
  const collection = db.collection(collectionName)
  const countRes = await collection.count()
  const total = countRes.total
  if (total === 0) return []

  const batchTimes = Math.ceil(total / MAX_LIMIT)
  const tasks = []
  for (let i = 0; i < batchTimes; i++) {
    tasks.push(
      collection.skip(i * MAX_LIMIT).limit(MAX_LIMIT).get()
    )
  }
  const results = await Promise.all(tasks)
  const allData = []
  results.forEach(res => allData.push(...res.data))
  return allData
}

/**
 * 智能替换图片链接
 * 1. 如果是 cloud:// 开头，尝试换取临时链接
 * 2. 如果临时链接换取失败，保留原始 fileID（小程序 image 组件可直接渲染 cloud:// 开头的 fileID）[reference:4]
 * 3. 如果已经是 https:// 开头，直接保留
 */
function buildImageUrlMap(items) {
  const fileIdSet = new Set()
  items.forEach(item => {
    if (item.image_url && typeof item.image_url === 'string') {
      const trimmed = item.image_url.trim()
      if (trimmed.startsWith('cloud://')) {
        fileIdSet.add(trimmed)
      }
    }
  })
  return Array.from(fileIdSet)
}

exports.main = async (event, context) => {
  try {
    // 1. 并行查询景区 + 美食全量数据
    const [sceneries, foods] = await Promise.all([
      queryAll('sceneries'),
      queryAll('foods')
    ])

    console.log(`[loadAllTourData] 查询到景区 ${sceneries.length} 条，美食 ${foods.length} 条`)

    // 2. 收集所有 cloud:// 开头的 fileID
    const allItems = [...sceneries, ...foods]
    const uniqueFileIds = buildImageUrlMap(allItems)

    console.log(`[loadAllTourData] 待处理图片数量：${uniqueFileIds.length}`)

    // 3. 分批生成临时链接
    //    每批最多50个（避免单次请求过大），同时做失败兜底
    const BATCH_SIZE = 50
    const urlMap = {} // fileID -> tempFileURL

    for (let i = 0; i < uniqueFileIds.length; i += BATCH_SIZE) {
      const batch = uniqueFileIds.slice(i, i + BATCH_SIZE)
      try {
        const res = await cloud.getTempFileURL({ fileList: batch })
        res.fileList.forEach(item => {
          const id = item.fileID || item.fileId
          const url = item.tempFileURL
          if (id && url) {
            urlMap[id] = url
          }
        })
        console.log(`[loadAllTourData] 第${Math.floor(i / BATCH_SIZE) + 1}批处理成功，累计 ${Object.keys(urlMap).length} 个链接`)
      } catch (err) {
        // 某批失败不影响其他批次，失败的文件保留原始 fileID 作为兜底
        console.error(`[loadAllTourData] 第${Math.floor(i / BATCH_SIZE) + 1}批获取临时链接失败：`, err)
      }
    }

    // 4. 替换数据中的图片地址
    //    优先使用临时链接，没有临时链接的保留原始 fileID（image 组件可直接渲染）[reference:5]
    const replaceImage = (item) => {
      if (!item.image_url) return item
      const trimmedKey = item.image_url.trim()
      if (urlMap[trimmedKey]) {
        return { ...item, image_url: urlMap[trimmedKey] }
      }
      // 没有拿到临时链接时，保留原始 fileID（cloud:// 开头）
      // 小程序 image 组件可以直接渲染 cloud:// 开头的 fileID
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
    console.error('[loadAllTourData] 加载全部旅游数据失败：', err)
    return {
      success: false,
      error: err.message
    }
  }
}