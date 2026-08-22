// 云函数入口文件
const cloud = require('wx-server-sdk');
const axios = require('axios');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 高德地图API Key
const AMAP_KEY = '68ff2afb0b6d70f0a6970b71737729a6';

// 高德地图API基础URL
const AMAP_BASE = 'https://restapi.amap.com/v3';

exports.main = async (event, context) => {
  const { action } = event;

  // 地理编码（地址转经纬度）
  if (action === 'geocode') {
    return await geocode(event);
  }

  // 路线规划
  if (action === 'route') {
    return await routePlan(event);
  }

  return { status: 'error', message: '未知操作' };
};

// 地理编码
async function geocode(event) {
  const { address, location } = event;
  try {
    let url;
    if (address) {
      url = `${AMAP_BASE}/geocode/geo?key=${AMAP_KEY}&address=${encodeURIComponent(address)}`;
    } else if (location) {
      url = `${AMAP_BASE}/geocode/regeo?key=${AMAP_KEY}&location=${location}`;
    } else {
      return { status: 'error', message: '缺少参数' };
    }

    const response = await axios.get(url);
    const data = response.data;

    if (data.status === '1') {
      if (address && data.geocodes && data.geocodes.length > 0) {
        const loc = data.geocodes[0].location.split(',');
        return {
          status: 'success',
          location: { lng: parseFloat(loc[0]), lat: parseFloat(loc[1]) },
          city: data.geocodes[0].city || data.geocodes[0].province
        };
      } else if (location && data.regeocode) {
        return {
          status: 'success',
          city: data.regeocode.addressComponent.city || data.regeocode.addressComponent.province
        };
      }
    }
    return { status: 'error', message: '地理编码失败' };
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}

// 驾车路线规划
async function routePlan(event) {
  const { origin, destination } = event;
  if (!origin || !destination) {
    return { status: 'error', message: '缺少起点或终点' };
  }

  try {
    // 1. 地理编码获取起点和终点经纬度
    const originGeo = await geocode({ address: origin });
    const destGeo = await geocode({ address: destination });

    if (originGeo.status !== 'success' || destGeo.status !== 'success') {
      return { status: 'error', message: '地址转换失败，请检查输入' };
    }

    const originLoc = `${originGeo.location.lng},${originGeo.location.lat}`;
    const destLoc = `${destGeo.location.lng},${destGeo.location.lat}`;

    // 2. 调用高德驾车路线规划API
    const url = `${AMAP_BASE}/direction/driving?key=${AMAP_KEY}&origin=${originLoc}&destination=${destLoc}&extensions=all`;

    const response = await axios.get(url);
    const data = response.data;

    if (data.status === '1' && data.route && data.route.paths && data.route.paths.length > 0) {
      const path = data.route.paths[0];
      // 提取总距离（米转公里）、时间（秒转小时）、过路费
      const distance = (parseFloat(path.distance) / 1000).toFixed(1);
      const duration = (parseFloat(path.duration) / 3600).toFixed(1);
      const toll = path.tolls || '0';

      // 提取详细路段
      const steps = [];
      if (path.steps) {
        for (let step of path.steps) {
          steps.push({
            instruction: step.instruction.replace(/<[^>]+>/g, ''), // 去除HTML标签
            distance: step.distance
          });
        }
      }

      // 提取polyline（整条路线坐标串）
      let polyline = '';
      for (let step of path.steps) {
        if (step.polyline) {
          polyline += step.polyline + ';';
        }
      }
      polyline = polyline.slice(0, -1); // 去掉末尾分号

      return {
        status: 'success',
        data: {
          polyline: polyline,
          startLocation: originGeo.location,
          endLocation: destGeo.location,
          distance: distance,
          duration: duration,
          toll: toll,
          steps: steps
        }
      };
    } else {
      return { status: 'error', message: data.info || '路线规划失败' };
    }
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}