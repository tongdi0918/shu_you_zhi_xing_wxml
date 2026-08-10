const app = getApp();

Page({
  data: {
    origin: '',
    destination: '',
    mapCenter: { longitude: 104.07, latitude: 30.67 },
    markers: [],
    polyline: [],
    routeResult: false,
    routeSummary: '',
    routeDistance: '',
    routeTime: '',
    routeTolls: '',
    routeSteps: []
  },
  setOrigin(e) { this.setData({ origin: e.detail.value }); },
  setDestination(e) { this.setData({ destination: e.detail.value }); },

  // 获取当前位置并自动填写出发地
  getMyLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        // 逆地理编码获取地址名称
        this.geocodeReverse(res.latitude, res.longitude, (address) => {
          this.setData({
            origin: address || `${res.latitude},${res.longitude}`,
            mapCenter: { longitude: res.longitude, latitude: res.latitude }
          });
        });
      },
      fail: () => { wx.showToast({ title: '请授权位置权限', icon: 'none' }); }
    });
  },

  // 逆地理编码（坐标 → 地址）
  geocodeReverse(lat, lng, callback) {
    const key = app.globalData.amapKey;
    wx.request({
      url: `https://restapi.amap.com/v3/geocode/regeo?output=json&location=${lng},${lat}&key=${key}`,
      success: (res) => {
        if (res.data.status === '1' && res.data.regeocode) {
          callback(res.data.regeocode.formatted_address);
        } else {
          callback(null);
        }
      },
      fail: () => { callback(null); }
    });
  },

  // 地理编码（地名 → 坐标字符串 "lng,lat"）
  geocode(address, callback) {
    const key = app.globalData.amapKey;
    wx.request({
      url: `https://restapi.amap.com/v3/geocode/geo?address=${encodeURIComponent(address)}&output=json&key=${key}`,
      success: (res) => {
        if (res.data.status === '1' && res.data.geocodes && res.data.geocodes.length > 0) {
          const loc = res.data.geocodes[0].location; // 格式 "lng,lat"
          callback(loc);
        } else {
          callback(null);
        }
      },
      fail: () => { callback(null); }
    });
  },

  // 规划路线
  async planRoute() {
    const { origin, destination } = this.data;
    if (!origin || !destination) {
      wx.showToast({ title: '请填写出发地和目的地', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '规划中...' });

    try {
      // 判断输入是否已经是坐标（包含逗号且符合数字格式）
      const isOriginCoord = /^\\d+\\.?\\d*,\\d+\\.?\\d*$/.test(origin);
      const isDestCoord = /^\\d+\\.?\\d*,\\d+\\.?\\d*$/.test(destination);

      let originCoord, destCoord;

      if (isOriginCoord) {
        originCoord = origin;
      } else {
        originCoord = await new Promise((resolve) => {
          this.geocode(origin, (loc) => resolve(loc));
        });
      }

      if (isDestCoord) {
        destCoord = destination;
      } else {
        destCoord = await new Promise((resolve) => {
          this.geocode(destination, (loc) => resolve(loc));
        });
      }

      if (!originCoord || !destCoord) {
        wx.hideLoading();
        wx.showToast({ title: '未找到该地址，请检查输入', icon: 'none' });
        return;
      }

      const key = app.globalData.amapKey;
      const url = `https://restapi.amap.com/v3/direction/driving?origin=${originCoord}&destination=${destCoord}&extensions=all&output=json&key=${key}`;
      const res = await new Promise((resolve, reject) => {
        wx.request({ url, success: resolve, fail: reject });
      });
      wx.hideLoading();

      if (res.data.status === '1' && res.data.route) {
        const route = res.data.route;
        const path = route.paths[0];
        const steps = path.steps || [];
        const summary = `从 ${origin} 到 ${destination}`;
        this.setData({
          routeResult: true,
          routeSummary: summary,
          routeDistance: (path.distance / 1000).toFixed(1) + ' km',
          routeTime: Math.round(path.duration / 60) + ' min',
          routeTolls: '¥' + (path.tolls || 0),
          routeSteps: steps.map(s => s.instruction.replace(/<[^>]+>/g, ''))
        });
      } else {
        wx.showToast({ title: '规划失败，请检查地址', icon: 'none' });
      }
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '网络错误，请稍后重试', icon: 'none' });
    }
  },

  goBack() { wx.switchTab({ url: '/pages/home/home' }); }
});