// pages/route/route.js
const QQMapWX = require('../../libs/qqmap-wx-jssdk.js');
const { TENCENT_MAP_KEY } = require('../../utils/config.js');

Page({
  data: {
    startAddress: '',
    endAddress: '',
    latitude: 39.908860,
    longitude: 116.397390,
    scale: 14,
    markers: [],
    polyline: [],
    showLocation: true,
    routeInfo: null,
    steps: []
  },

  onLoad: function() {
    this.qqmapsdk = new QQMapWX({ key: TENCENT_MAP_KEY });
    this.getMyLocation();
  },

  getMyLocation: function() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          latitude: res.latitude,
          longitude: res.longitude,
          markers: [{
            id: 0,
            latitude: res.latitude,
            longitude: res.longitude,
            title: '我的位置',
            iconPath: '/images/location.png',
            width: 30,
            height: 30
          }]
        });
      },
      fail: (err) => {
        console.error('定位失败', err);
        wx.showToast({ title: '请开启定位权限', icon: 'none' });
      }
    });
  },

  onStartInput: function(e) {
    this.setData({ startAddress: e.detail.value });
  },

  onEndInput: function(e) {
    this.setData({ endAddress: e.detail.value });
  },

  planRoute: function() {
    const start = this.data.startAddress.trim();
    const end = this.data.endAddress.trim();
    if (!start || !end) {
      wx.showToast({ title: '请输入出发地和目的地', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '规划中...' });

    this.qqmapsdk.geocoder({
      address: start,
      success: (res1) => {
        const sLoc = res1.result && res1.result.location;
        if (!sLoc || typeof sLoc.lat !== 'number' || typeof sLoc.lng !== 'number') {
          wx.hideLoading();
          wx.showToast({ title: '出发地解析失败，请更换更详细的地点', icon: 'none' });
          return;
        }
        this.qqmapsdk.geocoder({
          address: end,
          success: (res2) => {
            const eLoc = res2.result && res2.result.location;
            if (!eLoc || typeof eLoc.lat !== 'number' || typeof eLoc.lng !== 'number') {
              wx.hideLoading();
              wx.showToast({ title: '目的地解析失败，请更换更详细的地点', icon: 'none' });
              return;
            }
            const from = `${sLoc.lat},${sLoc.lng}`;
            const to = `${eLoc.lat},${eLoc.lng}`;
            this.qqmapsdk.direction({
              mode: 'driving',
              from: from,
              to: to,
              success: (res) => {
                wx.hideLoading();
                this.handleRouteResult(res, sLoc, eLoc);
              },
              fail: (err) => {
                wx.hideLoading();
                console.error('路线规划失败详情：', err);
                this.handleApiError(err);
              }
            });
          },
          fail: (err) => {
            wx.hideLoading();
            console.error('目的地地理编码失败：', err);
            this.handleApiError(err);
          }
        });
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('出发地地理编码失败：', err);
        this.handleApiError(err);
      }
    });
  },

  /**
   * 解码腾讯地图差分编码的 polyline 数组
   */
  decodePolyline: function(polyline) {
    if (!polyline || !Array.isArray(polyline) || polyline.length < 2) {
      return [];
    }
    const points = [];
    let lat = 0, lng = 0;
    for (let i = 0; i < polyline.length; i += 2) {
      const deltaLat = polyline[i];
      const deltaLng = polyline[i+1];
      if (i === 0) {
        lat = deltaLat;
        lng = deltaLng;
      } else {
        lat += deltaLat / 1e6;
        lng += deltaLng / 1e6;
      }
      points.push({ latitude: lat, longitude: lng });
    }
    return points;
  },

  handleRouteResult: function(res, sLoc, eLoc) {
    console.log('完整路线返回数据：', JSON.stringify(res, null, 2));
    const route = res.result.routes[0];
    if (!route) {
      wx.showToast({ title: '未找到路线', icon: 'none' });
      return;
    }

    // 提取基本数据
    const distance = (route.distance / 1000).toFixed(1);         // 公里
    // ★★★ 修正：腾讯地图 duration 单位为分钟，除以 60 得小时 ★★★
    const duration = (route.duration / 60).toFixed(1);          // 小时
    const toll = route.toll || 0;                               // 元
    const fuel = (route.distance / 1000 * 0.1).toFixed(1);      // 估算油耗（升）

    // ---- 解码顶层 polyline 获得真实路线点 ----
    let points = [];
    if (route.polyline && Array.isArray(route.polyline) && route.polyline.length >= 2) {
      points = this.decodePolyline(route.polyline);
      console.log(`解码后的路线点数量：${points.length}`);
    }

    if (points.length < 2) {
      console.error('提取到的路线点不足，无法绘制真实路线。', route.polyline);
      wx.showToast({ title: '无法获取完整路线细节，请更换起终点重试', icon: 'none' });
      return;
    }

    // ---- 构建绿色实线 ----
    const polyline = [{
      points: points,
      color: '#07c160',
      width: 6,
      dottedLine: false,
      arrowLine: true
    }];

    const startCoord = points[0];
    const endCoord = points[points.length - 1];
    const markers = [
      {
        id: 0,
        latitude: startCoord.latitude,
        longitude: startCoord.longitude,
        title: '起点',
        iconPath: '/images/start.png',
        width: 30,
        height: 30
      },
      {
        id: 1,
        latitude: endCoord.latitude,
        longitude: endCoord.longitude,
        title: '终点',
        iconPath: '/images/end.png',
        width: 30,
        height: 30
      }
    ];

    if (this.data.markers && this.data.markers.length > 0 && this.data.markers[0].id === 0) {
      markers.push(this.data.markers[0]);
    }

    // ---- 提取逐段导航步骤 ----
    let steps = [];
    if (route.steps && Array.isArray(route.steps)) {
      for (let step of route.steps) {
        const instruction = step.instruction || '';
        const road = step.road || '';
        const stepDistance = step.distance ? (step.distance / 1000).toFixed(1) : '';
        steps.push({
          instruction: instruction,
          road: road,
          distance: stepDistance
        });
      }
    }

    const midIndex = Math.floor(points.length / 2);
    this.setData({
      latitude: points[midIndex].latitude,
      longitude: points[midIndex].longitude,
      scale: 14,
      markers: markers,
      polyline: polyline,
      routeInfo: {
        distance: distance,
        duration: duration,   // 已修正为小时
        toll: toll,
        fuel: fuel
      },
      steps: steps
    });

    // 调整地图视野包含所有点
    const mapCtx = wx.createMapContext('routeMap');
    mapCtx.includePoints({
      points: points,
      padding: [60, 60, 60, 60]
    });
  },

  handleApiError: function(err) {
    console.error('地图API调用失败：', err);
    let msg = '请求失败，请重试';
    if (err.status) {
      switch (err.status) {
        case 348:
          msg = '参数错误，请检查输入地址是否准确（如：牛佛镇 → 自贡市大安区牛佛镇）';
          break;
        case 110:
          msg = '请求来源未被授权（请检查Key是否正确）';
          break;
        case 121:
          msg = '日配额已用完，请更换腾讯地图Key';
          break;
        default:
          msg = `错误码 ${err.status}：${err.message || '未知错误'}`;
      }
    } else {
      msg = err.message || msg;
    }
    wx.showModal({
      title: '规划失败',
      content: msg,
      showCancel: false
    });
  }
});