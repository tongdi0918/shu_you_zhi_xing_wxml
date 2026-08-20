// pages/route/route.js
const app = getApp();

Page({
  data: {
    // 出发地：存储为对象 { name: '成都市', latitude: 30.57, longitude: 104.07 }
    origin: { name: '', latitude: 0, longitude: 0 },
    // 目的地：存储为对象 { name: '都江堰', latitude: 30.99, longitude: 103.65 }
    destination: { name: '', latitude: 0, longitude: 0 },
    // 界面状态
    loading: false,
    routeResult: false,
    // 路径规划结果
    routeSummary: '',
    routeDistance: '', // 总公里数
    routeTime: '', // 预估时间
    routeTolls: '', // 高速过路费
    routeSteps: [], // 详细路段列表
    // 地图相关
    mapCenter: { longitude: 104.07, latitude: 30.67 },
    mapScale: 14,
    markers: [],
    polyline: [],
    // 是否显示详情
    showDetail: false
  },

  onLoad(options) {
    // 从云数据库加载用户所在城市作为默认出发地
    this.loadDefaultOrigin();
  },

  /**
   * 加载默认出发地（用户主页的"所在城市"）
   * 数据来源：云开发数据库 users 集合中当前用户的 city 字段
   * 同时获取该城市的经纬度坐标
   */
  loadDefaultOrigin() {
    const that = this;
    const db = wx.cloud.database();

    // 从云数据库读取当前用户的所在城市
    db.collection('users').where({
      _openid: app.globalData.openid || ''
    }).get({
      success: res => {
        if (res.data && res.data.length > 0 && res.data[0].city) {
          const cityName = res.data[0].city;
          // 对城市名称进行地理编码，获取经纬度
          that.geocode(cityName, (location) => {
            if (location) {
              const [lng, lat] = location.split(',').map(Number);
              that.setData({
                'origin.name': cityName,
                'origin.latitude': lat,
                'origin.longitude': lng,
                'mapCenter': { longitude: lng, latitude: lat }
              });
              // 缓存到全局
              app.globalData.userCity = cityName;
              app.globalData.userCityLng = lng;
              app.globalData.userCityLat = lat;
            } else {
              // 编码失败，尝试使用当前位置
              that.getMyLocation();
            }
          });
        } else {
          // 数据库中无城市数据，尝试使用当前位置
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
        that.geocodeReverse(res.latitude, res.longitude, (address) => {
          if (address) {
            that.setData({
              'origin.name': address,
              'origin.latitude': res.latitude,
              'origin.longitude': res.longitude,
              'mapCenter': {
                longitude: res.longitude,
                latitude: res.latitude
              }
            });
          } else {
            that.setData({
              'origin.name': `${res.latitude},${res.longitude}`,
              'origin.latitude': res.latitude,
              'origin.longitude': res.longitude,
              'mapCenter': {
                longitude: res.longitude,
                latitude: res.latitude
              }
            });
          }
        });
      },
      fail: () => {
        wx.showToast({
          title: '请授权位置权限',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 逆地理编码（坐标 → 地址）- 使用腾讯地图API
   */
  geocodeReverse(lat, lng, callback) {
    const key = app.globalData.tencentMapKey;
    if (!key) {
      console.error('腾讯地图Key未配置');
      callback(null);
      return;
    }
    wx.request({
      url: `https://apis.map.qq.com/ws/geocoder/v1/`,
      data: {
        location: `${lat},${lng}`,
        key: key,
        output: 'json'
      },
      success: (res) => {
        if (res.data.status === 0 && res.data.result) {
          callback(res.data.result.address);
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
   * 地理编码（地址 → 坐标字符串 "lng,lat"）- 使用腾讯地图API
   */
  geocode(address, callback) {
    const key = app.globalData.tencentMapKey;
    if (!key) {
      console.error('腾讯地图Key未配置');
      callback(null);
      return;
    }
    wx.request({
      url: `https://apis.map.qq.com/ws/geocoder/v1/`,
      data: {
        address: address,
        key: key,
        output: 'json'
      },
      success: (res) => {
        if (res.data.status === 0 && res.data.result) {
          const location = res.data.result.location;
          const loc = `${location.lng},${location.lat}`;
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
   * 输入框事件 - 出发地
   */
  setOrigin(e) {
    const value = e.detail.value;
    this.setData({
      'origin.name': value
    });
  },

  /**
   * 输入框事件 - 目的地
   */
  setDestination(e) {
    const value = e.detail.value;
    this.setData({
      'destination.name': value
    });
  },

  /**
   * 路径规划（核心方法）
   * 使用腾讯地图驾车路径规划 API
   */
  async planRoute() {
    const { origin, destination } = this.data;

    // 验证输入
    if (!origin.name || !destination.name) {
      wx.showToast({
        title: '请填写出发地和目的地',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true, showDetail: false });
    wx.showLoading({ title: '规划中...' });

    try {
      // 获取出发地坐标（如果已有则直接使用，否则编码）
      let originCoord = '';
      if (origin.latitude && origin.longitude) {
        originCoord = `${origin.longitude},${origin.latitude}`;
      } else {
        originCoord = await new Promise((resolve) => {
          this.geocode(origin.name, (loc) => resolve(loc));
        });
        if (originCoord) {
          const [lng, lat] = originCoord.split(',').map(Number);
          this.setData({
            'origin.latitude': lat,
            'origin.longitude': lng
          });
        }
      }

      // 获取目的地坐标
      let destCoord = '';
      if (destination.latitude && destination.longitude) {
        destCoord = `${destination.longitude},${destination.latitude}`;
      } else {
        destCoord = await new Promise((resolve) => {
          this.geocode(destination.name, (loc) => resolve(loc));
        });
        if (destCoord) {
          const [lng, lat] = destCoord.split(',').map(Number);
          this.setData({
            'destination.latitude': lat,
            'destination.longitude': lng
          });
        }
      }

      if (!originCoord || !destCoord) {
        wx.hideLoading();
        this.setData({ loading: false });
        wx.showToast({
          title: '未找到该地址，请检查输入',
          icon: 'none'
        });
        return;
      }

      const key = app.globalData.tencentMapKey;
      if (!key) {
        wx.hideLoading();
        this.setData({ loading: false });
        wx.showToast({
          title: '请配置腾讯地图Key',
          icon: 'none'
        });
        return;
      }

      // 调用腾讯地图驾车路径规划 API
      const [fromLng, fromLat] = originCoord.split(',').map(Number);
      const [toLng, toLat] = destCoord.split(',').map(Number);

      const url = `https://apis.map.qq.com/ws/direction/v1/driving/`;
      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: url,
          data: {
            from: `${fromLat},${fromLng}`,
            to: `${toLat},${toLng}`,
            key: key,
            output: 'json'
          },
          success: resolve,
          fail: reject
        });
      });

      wx.hideLoading();
      this.setData({ loading: false });

      if (res.data.status === 0 && res.data.result) {
        const result = res.data.result;
        const routes = result.routes;

        if (routes && routes.length > 0) {
          const route = routes[0];
          // 总距离（米）转公里
          const distanceKm = (route.distance / 1000).toFixed(1);
          // 总时间（分钟）转小时
          const durationMin = route.duration;
          const hours = Math.floor(durationMin / 60);
          const minutes = durationMin % 60;
          const timeStr = hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟`;

          // 高速过路费（腾讯地图可能不直接返回，从 toll_cost 获取）
          const tolls = route.toll_cost || 0;

          // 提取逐段导航步骤
          const steps = [];
          if (route.steps) {
            route.steps.forEach((step) => {
              // 提取行驶方向、距离、操作动作、道路名称
              const direction = step.direction || '';
              const distance = step.distance ? (step.distance / 1000).toFixed(1) + '千米' : '';
              const instruction = step.instruction || '';
              // 解析 instruction 获取操作动作
              let action = '';
              if (instruction.includes('左转')) action = '左转';
              else if (instruction.includes('右转')) action = '右转';
              else if (instruction.includes('直行')) action = '直行';
              else if (instruction.includes('掉头')) action = '掉头';
              else if (instruction.includes('进入')) action = '进入';
              else if (instruction.includes('驶出')) action = '驶出';
              else action = '行驶';

              // 提取道路名称
              let roadName = step.road_name || '';
              if (!roadName && instruction) {
                const match = instruction.match(/沿(.*?)(?:向|行驶|进入)/);
                if (match) roadName = match[1];
              }

              // 格式化显示：向西南行驶 159 米左转
              let displayText = direction;
              if (distance) displayText += ` ${distance}`;
              displayText += action;
              if (roadName) displayText += `，沿${roadName}`;

              steps.push({
                direction: direction,
                distance: step.distance || 0,
                distanceText: distance,
                action: action,
                roadName: roadName || '无名路',
                instruction: instruction,
                displayText: displayText
              });
            });
          }

          // 构建路线点（polyline）
          const polylinePoints = [];
          if (route.polyline) {
            route.polyline.forEach(p => {
              polylinePoints.push({
                latitude: p.lat,
                longitude: p.lng
              });
            });
          }

          // 绿色线条
          const polyline = [{
            points: polylinePoints,
            color: '#00FF00',
            width: 6,
            dottedLine: false
          }];

          // 设置地图中心点（两点中间）
          const centerLng = (fromLng + toLng) / 2;
          const centerLat = (fromLat + toLat) / 2;

          this.setData({
            routeResult: true,
            routeSummary: `从 ${origin.name} 到 ${destination.name}`,
            routeDistance: `${distanceKm} km`,
            routeTime: timeStr,
            routeTolls: `¥${tolls.toFixed(2)}`,
            routeSteps: steps,
            polyline: polyline,
            mapCenter: { longitude: centerLng, latitude: centerLat },
            mapScale: 12,
            showDetail: true,
            markers: [
              {
                id: 0,
                latitude: fromLat,
                longitude: fromLng,
                title: origin.name,
                iconPath: '/images/marker_start.png'
              },
              {
                id: 1,
                latitude: toLat,
                longitude: toLng,
                title: destination.name,
                iconPath: '/images/marker_end.png'
              }
            ]
          });
        } else {
          wx.showToast({
            title: '未找到驾车路线',
            icon: 'none'
          });
        }
      } else {
        wx.showToast({
          title: res.data.message || '路径规划失败',
          icon: 'none'
        });
      }
    } catch (err) {
      wx.hideLoading();
      this.setData({ loading: false });
      console.error('路径规划错误:', err);
      wx.showToast({
        title: '网络请求失败，请重试',
        icon: 'none'
      });
    }
  },

  /**
   * 我的位置 - 获取当前位置并设置为出发地
   */
  useMyLocation() {
    const that = this;
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        that.geocodeReverse(res.latitude, res.longitude, (address) => {
          if (address) {
            that.setData({
              'origin.name': address,
              'origin.latitude': res.latitude,
              'origin.longitude': res.longitude,
              'mapCenter': {
                longitude: res.longitude,
                latitude: res.latitude
              }
            });
            wx.showToast({
              title: '已获取当前位置',
              icon: 'success'
            });
          } else {
            wx.showToast({
              title: '获取位置失败',
              icon: 'none'
            });
          }
        });
      },
      fail: () => {
        wx.showToast({
          title: '请授权位置权限',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 返回上一页
   */
  goBack() {
    wx.navigateBack();
  }
});