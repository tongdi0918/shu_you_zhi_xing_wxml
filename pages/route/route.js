// pages/route/route.js
const app = getApp();
const QQMapWX = require('../../libs/qqmap-wx-jssdk.js');  // 请确认SDK路径

Page({
  data: {
    // ----- 输入区 -----
    startAddress: '',        // 出发地（用户可手动编辑）
    destination: '',         // 目的地
    loading: false,          // 规划中状态

    // ----- 地图相关 -----
    latitude: 39.908823,
    longitude: 116.397470,
    scale: 14,
    markers: [],
    polylines: [],

    // ----- 路线详情 -----
    routeDistance: '--',
    routeTime: '--',
    routeTolls: '--',
    steps: [],
    hasRoute: false,
  },

  onShow() {
    // 仅在首次加载或用户未手动修改时，从全局数据填充默认出发地
    // 若用户已手动输入过，则保留用户输入（此处不覆盖）
    if (!this.data.startAddress) {
      const userCity = app.globalData.userCity || '';
      if (userCity) {
        this.setData({ startAddress: userCity });
      }
    }
  },

  /**
   * 监听出发地输入
   */
  onStartInput(e) {
    this.setData({ startAddress: e.detail.value });
  },

  /**
   * 监听目的地输入
   */
  onDestinationInput(e) {
    this.setData({ destination: e.detail.value });
  },

  /**
   * 规划路线 —— 核心方法
   */
  async planRoute() {
    const { startAddress, destination } = this.data;

    // 1. 校验输入
    if (!startAddress || startAddress.trim() === '') {
      wx.showToast({ title: '请输入出发地', icon: 'none' });
      return;
    }
    if (!destination || destination.trim() === '') {
      wx.showToast({ title: '请输入目的地', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    try {
      const qqmapsdk = new QQMapWX({
        key: 'PCOBZ-7TC3C-HY32K-A2BQJ-PGYKV-MTBZI',  // ⚠️ 替换为您的腾讯地图Key
      });

      // 2. 并发地理编码
      const [startGeo, destGeo] = await Promise.all([
        this.geocodeAddress(qqmapsdk, startAddress.trim()),
        this.geocodeAddress(qqmapsdk, destination.trim()),
      ]);

      if (!startGeo || !destGeo) {
        wx.showToast({ title: '地址解析失败，请检查输入', icon: 'none' });
        this.setData({ loading: false });
        return;
      }

      // 3. 驾车路线规划
      const directionRes = await new Promise((resolve, reject) => {
        qqmapsdk.direction({
          mode: 'driving',
          from: {
            latitude: startGeo.lat,
            longitude: startGeo.lng,
          },
          to: {
            latitude: destGeo.lat,
            longitude: destGeo.lng,
          },
          success: (res) => resolve(res),
          fail: (err) => reject(err),
        });
      });

      if (directionRes.status !== 0 || !directionRes.result || !directionRes.result.routes || directionRes.result.routes.length === 0) {
        wx.showToast({ title: '未找到可行路线', icon: 'none' });
        this.setData({ loading: false });
        return;
      }

      const route = directionRes.result.routes[0];
      const polylinePoints = this.decodePolyline(route.polyline);

      // 4. 更新地图
      this.setData({
        polylines: [{
          points: polylinePoints,
          color: '#00CC44',
          width: 6,
          dottedLine: false,
          arrowLine: true,
        }],
        markers: [
          {
            id: 0,
            latitude: startGeo.lat,
            longitude: startGeo.lng,
            title: '出发地',
            iconPath: '/images/marker_start.png',
            width: 30,
            height: 30,
          },
          {
            id: 1,
            latitude: destGeo.lat,
            longitude: destGeo.lng,
            title: '目的地',
            iconPath: '/images/marker_end.png',
            width: 30,
            height: 30,
          },
        ],
        latitude: (startGeo.lat + destGeo.lat) / 2,
        longitude: (startGeo.lng + destGeo.lng) / 2,
        scale: 12,
      });

      // 5. 解析路线详情
      const distanceKm = (route.distance / 1000).toFixed(1);
      const timeMin = Math.round(route.duration / 60);
      const timeHour = timeMin >= 60 ? `${Math.floor(timeMin / 60)}小时${timeMin % 60}分钟` : `${timeMin}分钟`;
      const tolls = route.toll_fee ? `¥${route.toll_fee.toFixed(1)}` : '无过路费';

      const steps = (route.steps || []).map((step, index) => {
        const rawInstruction = step.instruction || '';
        const distanceText = step.distance ? `${(step.distance / 1000).toFixed(1)}千米` : `${step.distance}米`;
        let displayText = rawInstruction;
        if (!rawInstruction || rawInstruction.length < 3) {
          const dir = step.direction || '';
          const action = step.action || '';
          displayText = `${dir} ${distanceText} ${action}`.trim();
        }
        return {
          index: index + 1,
          displayText: displayText || `步骤 ${index + 1}`,
          raw: step,
        };
      });

      this.setData({
        routeDistance: `${distanceKm} km`,
        routeTime: timeHour,
        routeTolls: tolls,
        steps: steps,
        hasRoute: true,
        loading: false,
      });

    } catch (err) {
      console.error('路线规划失败:', err);
      wx.showToast({
        title: err.errMsg || '路线规划失败，请重试',
        icon: 'none',
      });
      this.setData({ loading: false });
    }
  },

  /**
   * 地理编码：地址 → { lat, lng }
   */
  geocodeAddress(qqmapsdk, address) {
    return new Promise((resolve, reject) => {
      qqmapsdk.geocoder({
        address: address,
        success: (res) => {
          if (res.status === 0 && res.result && res.result.location) {
            resolve({
              lat: res.result.location.lat,
              lng: res.result.location.lng,
            });
          } else {
            reject(new Error(`地理编码失败: ${res.message || '未知错误'}`));
          }
        },
        fail: (err) => {
          reject(err);
        },
      });
    });
  },

  /**
   * 解码腾讯地图 polyline
   */
  decodePolyline(encoded) {
    if (!encoded || encoded.length < 2) return [];
    const coords = [];
    let lat = 0,
      lng = 0;
    lat = encoded[0] / 1e6;
    lng = encoded[1] / 1e6;
    coords.push({ latitude: lat, longitude: lng });
    for (let i = 2; i < encoded.length; i += 2) {
      lat += encoded[i] / 1e6;
      lng += encoded[i + 1] / 1e6;
      coords.push({ latitude: lat, longitude: lng });
    }
    return coords;
  },

  /**
   * 获取我的位置（填充到目的地）
   */
  getMyLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const qqmapsdk = new QQMapWX({
          key: 'PCOBZ-7TC3C-HY32K-A2BQJ-PGYKV-MTBZI',  // ⚠️ 替换
        });
        qqmapsdk.reverseGeocoder({
          location: {
            latitude: res.latitude,
            longitude: res.longitude,
          },
          success: (geoRes) => {
            if (geoRes.status === 0 && geoRes.result) {
              const address = geoRes.result.address || 
                              geoRes.result.formatted_addresses?.recommend || 
                              '当前位置';
              this.setData({
                destination: address,
              });
              wx.showToast({ title: '已获取当前位置', icon: 'success' });
            } else {
              wx.showToast({ title: '位置解析失败，请手动输入', icon: 'none' });
            }
          },
          fail: () => {
            wx.showToast({ title: '位置解析失败，请手动输入', icon: 'none' });
          },
        });
      },
      fail: () => {
        wx.showToast({
          title: '请授权定位权限后重试',
          icon: 'none',
        });
      },
    });
  },
});