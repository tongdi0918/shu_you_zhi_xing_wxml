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
    routeInfo: null
  },

  onLoad: function() {
    this.qqmapsdk = new QQMapWX({ key: TENCENT_MAP_KEY });
    this.getMyLocation();
  },

  // 获取用户当前位置
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

  // 核心：规划路线（带配额错误处理）
  planRoute: function() {
    const start = this.data.startAddress.trim();
    const end = this.data.endAddress.trim();
    if (!start || !end) {
      wx.showToast({ title: '请输入出发地和目的地', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '规划中...' });

    // 地理编码 + 路线规划（错误处理中捕获 121 状态码）
    this.qqmapsdk.geocoder({
      address: start,
      success: (res1) => {
        const sLat = res1.result.location.lat;
        const sLng = res1.result.location.lng;
        this.qqmapsdk.geocoder({
          address: end,
          success: (res2) => {
            const eLat = res2.result.location.lat;
            const eLng = res2.result.location.lng;
            this.qqmapsdk.direction({
              mode: 'driving',
              from: sLat + ',' + sLng,
              to: eLat + ',' + eLng,
              success: (res) => {
                wx.hideLoading();
                this.handleRouteResult(res);
              },
              fail: (err) => {
                wx.hideLoading();
                this.handleApiError(err);
              }
            });
          },
          fail: (err) => {
            wx.hideLoading();
            this.handleApiError(err);
          }
        });
      },
      fail: (err) => {
        wx.hideLoading();
        this.handleApiError(err);
      }
    });
  },

  // 统一处理 API 错误（重点：配额超限提示）
  handleApiError: function(err) {
    console.error('地图API调用失败', err);
    if (err.status === 121) {
      wx.showModal({
        title: 'API调用达上限',
        content: '当前腾讯地图Key的日配额已用完，请更换为您自己的Key（在utils/config.js中修改）',
        showCancel: false
      });
    } else {
      wx.showToast({
        title: err.message || '请求失败，请重试',
        icon: 'none'
      });
    }
  },

  handleRouteResult: function(res) {
    const route = res.result.routes[0];
    if (!route) {
      wx.showToast({ title: '未找到路线', icon: 'none' });
      return;
    }

    const distance = (route.distance / 1000).toFixed(1);
    const duration = (route.duration / 3600).toFixed(1);
    const toll = route.toll || 0;

    const points = [];
    const steps = [];
    for (let step of route.steps) {
      if (step.polyline) {
        for (let coord of step.polyline) {
          points.push({ latitude: coord.lat, longitude: coord.lng });
        }
      }
      steps.push({ instruction: step.instruction });
    }

    const markers = [
      {
        id: 0,
        latitude: points[0].latitude,
        longitude: points[0].longitude,
        title: '出发地',
        iconPath: '/images/start.png',
        width: 30,
        height: 30
      },
      {
        id: 1,
        latitude: points[points.length - 1].latitude,
        longitude: points[points.length - 1].longitude,
        title: '目的地',
        iconPath: '/images/end.png',
        width: 30,
        height: 30
      }
    ];

    this.setData({
      polyline: [{ points, color: '#00FF00', width: 6 }],
      markers: markers,
      routeInfo: { distance, duration, toll, steps }
    });

    const mapCtx = wx.createMapContext('map');
    mapCtx.includePoints({ points, padding: [50, 50, 50, 50] });
  }
});