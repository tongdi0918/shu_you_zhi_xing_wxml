// pages/route/route.js
const app = getApp();

Page({
  data: {
    origin: '',            // 出发地（地址或坐标）
    destination: '',       // 目的地（地址或坐标）
    loading: false,
    routeResult: false,
    routeSummary: '',
    routeDistance: '',
    routeTime: '',
    routeTolls: '',
    routeSteps: [],
    // 地图相关
    mapCenter: {
      longitude: 104.07,
      latitude: 30.67
    },
    mapScale: 14,
    markers: [],
    polyline: []
  },

  onLoad(options) {
    // 从主页获取“所在城市”作为默认出发地
    this.loadDefaultOrigin();
  },

  /**
   * 加载默认出发地（用户主页的“所在城市”）
   * 数据来源：云开发数据库 users 集合中当前用户的 city 字段
   */
  loadDefaultOrigin() {
    const that = this;
    // 优先从全局缓存读取
    if (app.globalData && app.globalData.userCity) {
      this.setData({ origin: app.globalData.userCity });
      return;
    }
    // 从云数据库读取当前用户的所在城市
    const db = wx.cloud.database();
    db.collection('users').where({
      _openid: app.globalData.openid || ''  // 需确保已登录并获取openid
    }).get({
      success: res => {
        if (res.data && res.data.length > 0 && res.data[0].city) {
          const city = res.data[0].city;
          app.globalData.userCity = city;  // 缓存到全局
          that.setData({ origin: city });
        } else {
          // 若数据库中无数据，尝试使用当前位置
          that.getMyLocation();
        }
      },
      fail: () => {
        // 数据库读取失败，尝试使用当前位置
        that.getMyLocation();
      }
    });
  },

  /**
   * 获取当前位置并自动填写出发地（逆地理编码）
   */
  getMyLocation() {
    const that = this;
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        // 逆地理编码获取地址名称
        this.geocodeReverse(res.latitude, res.longitude, (address) => {
          if (address) {
            that.setData({
              origin: address,
              mapCenter: { longitude: res.longitude, latitude: res.latitude }
            });
          } else {
            that.setData({
              origin: `${res.latitude},${res.longitude}`,
              mapCenter: { longitude: res.longitude, latitude: res.latitude }
            });
          }
        });
      },
      fail: () => {
        wx.showToast({ title: '请授权位置权限', icon: 'none' });
      }
    });
  },

  /**
   * 逆地理编码（坐标 → 地址）
   */
  geocodeReverse(lat, lng, callback) {
    const key = app.globalData.amapKey;
    if (!key) {
      console.error('高德地图Key未配置');
      callback(null);
      return;
    }
    wx.request({
      url: `https://restapi.amap.com/v3/geocode/regeo?output=json&location=${lng},${lat}&key=${key}`,
      success: (res) => {
        if (res.data.status === '1' && res.data.regeocode) {
          callback(res.data.regeocode.formatted_address);
        } else {
          callback(null);
        }
      },
      fail: () => {
        callback(null);
      }
    });
  },

  /**
   * 地理编码（地址 → 坐标字符串 "lng,lat"）
   */
  geocode(address, callback) {
    const key = app.globalData.amapKey;
    if (!key) {
      console.error('高德地图Key未配置');
      callback(null);
      return;
    }
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
      fail: () => {
        callback(null);
      }
    });
  },

  /**
   * 输入框事件
   */
  setOrigin(e) {
    this.setData({ origin: e.detail.value });
  },
  setDestination(e) {
    this.setData({ destination: e.detail.value });
  },

  /**
   * 路径规划（核心方法）
   */
  async planRoute() {
    const { origin, destination } = this.data;
    if (!origin || !destination) {
      wx.showToast({ title: '请填写出发地和目的地', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    wx.showLoading({ title: '规划中...' });

    try {
      // 判断输入是否已经是坐标（格式：经度,纬度）
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
        this.setData({ loading: false });
        wx.showToast({ title: '未找到该地址，请检查输入', icon: 'none' });
        return;
      }

      const key = app.globalData.amapKey;
      if (!key) {
        wx.hideLoading();
        this.setData({ loading: false });
        wx.showToast({ title: '请配置高德地图Key', icon: 'none' });
        return;
      }

      // 调用高德地图驾车路径规划API
      const url = `https://restapi.amap.com/v3/direction/driving?origin=${originCoord}&destination=${destCoord}&extensions=all&output=json&key=${key}`;
      
      const res = await new Promise((resolve, reject) => {
        wx.request({ url, success: resolve, fail: reject });
      });

      wx.hideLoading();
      this.setData({ loading: false });

      if (res.data.status === '1' && res.data.route) {
        const route = res.data.route;
        const path = route.paths[0];
        const steps = path.steps || [];

        // 解析起点和终点坐标
        const originLngLat = originCoord.split(',').map(Number);
        const destLngLat = destCoord.split(',').map(Number);

        // 构建地图标记
        const markers = [
          {
            id: 1,
            longitude: originLngLat[0],
            latitude: originLngLat[1],
            title: '起点',
            iconPath: '/images/marker_start.png',  // 请准备对应图标
            width: 30,
            height: 30
          },
          {
            id: 2,
            longitude: destLngLat[0],
            latitude: destLngLat[1],
            title: '终点',
            iconPath: '/images/marker_end.png',    // 请准备对应图标
            width: 30,
            height: 30
          }
        ];

        // 构建路线折线（高德返回的路径点）
        let polyline = [];
        if (path.steps && path.steps.length > 0) {
          // 从每个step中提取polyline点
          let allPoints = [];
          path.steps.forEach(step => {
            if (step.polyline) {
              const points = step.polyline.split(';').map(p => {
                const [lng, lat] = p.split(',').map(Number);
                return { longitude: lng, latitude: lat };
              });
              allPoints = allPoints.concat(points);
            }
          });
          if (allPoints.length > 0) {
            polyline = [{
              points: allPoints,
              color: '#FF6B35',
              width: 6,
              dottedLine: false,
              arrowLine: true
            }];
          }
        }

        // 计算地图中心（起点和终点的中点）
        const centerLng = (originLngLat[0] + destLngLat[0]) / 2;
        const centerLat = (originLngLat[1] + destLngLat[1]) / 2;

        // 计算合适的缩放级别（根据距离）
        const distance = path.distance || 0;
        let scale = 14;
        if (distance > 50000) scale = 10;
        else if (distance > 20000) scale = 11;
        else if (distance > 10000) scale = 12;
        else if (distance > 5000) scale = 13;

        const summary = `从 ${origin} 到 ${destination}`;

        this.setData({
          routeResult: true,
          routeSummary: summary,
          routeDistance: (path.distance / 1000).toFixed(1) + ' km',
          routeTime: Math.round(path.duration / 60) + ' min',
          routeTolls: '¥' + (path.tolls || 0),
          routeSteps: steps.map(s => s.instruction.replace(/<[^>]+>/g, '')),
          mapCenter: { longitude: centerLng, latitude: centerLat },
          mapScale: scale,
          markers: markers,
          polyline: polyline
        });

        // 延迟一下让地图渲染完成后再调整视野
        setTimeout(() => {
          this.moveMapToRoute(originLngLat, destLngLat);
        }, 300);

      } else {
        wx.showToast({ title: '规划失败，请检查地址', icon: 'none' });
      }
    } catch (e) {
      wx.hideLoading();
      this.setData({ loading: false });
      console.error('路径规划错误:', e);
      wx.showToast({ title: '网络错误，请稍后重试', icon: 'none' });
    }
  },

  /**
   * 调整地图视野以包含起点和终点（抬高亮）
   */
  moveMapToRoute(originLngLat, destLngLat) {
    const mapContext = wx.createMapContext('routeMap', this);
    // 使用 includePoints 让地图自动调整到包含所有点
    mapContext.includePoints({
      points: [
        { longitude: originLngLat[0], latitude: originLngLat[1] },
        { longitude: destLngLat[0], latitude: destLngLat[1] }
      ],
      padding: [60, 60, 60, 60]
    });
  },

  /**
   * 返回首页
   */
  goBack() {
    wx.switchTab({ url: '/pages/home/home' });
  }
});