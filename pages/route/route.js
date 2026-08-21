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

  // 输入出发地
  onStartInput: function(e) {
    this.setData({ startAddress: e.detail.value });
  },

  // 输入目的地
  onEndInput: function(e) {
    this.setData({ endAddress: e.detail.value });
  },

  // 路径规划
  planRoute: function() {
    const start = this.data.startAddress.trim();
    const end = this.data.endAddress.trim();
    if (!start || !end) {
      wx.showToast({ title: '请输入出发地和目的地', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '规划中...' });

    // 地理编码出发地
    this.qqmapsdk.geocoder({
      address: start,
      success: (res1) => {
        console.log('出发地地理编码结果：', res1);
        const sLoc = res1.result && res1.result.location;
        if (!sLoc || typeof sLoc.lat !== 'number' || typeof sLoc.lng !== 'number') {
          wx.hideLoading();
          wx.showToast({ title: '出发地解析失败，请更换更详细的地点', icon: 'none' });
          return;
        }
        // 地理编码目的地
        this.qqmapsdk.geocoder({
          address: end,
          success: (res2) => {
            console.log('目的地地理编码结果：', res2);
            const eLoc = res2.result && res2.result.location;
            if (!eLoc || typeof eLoc.lat !== 'number' || typeof eLoc.lng !== 'number') {
              wx.hideLoading();
              wx.showToast({ title: '目的地解析失败，请更换更详细的地点', icon: 'none' });
              return;
            }
            const from = `${sLoc.lat},${sLoc.lng}`;
            const to = `${eLoc.lat},${eLoc.lng}`;
            console.log(`开始路线规划: from=${from}, to=${to}`);
            // 驾车路线规划
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

  // 处理路线结果
  handleRouteResult: function(res, sLoc, eLoc) {
    console.log('完整路线返回数据：', JSON.stringify(res, null, 2));
    const route = res.result.routes[0];
    if (!route) {
      wx.showToast({ title: '未找到路线', icon: 'none' });
      return;
    }

    // 提取基本数据
    const distance = (route.distance / 1000).toFixed(1);
    const duration = (route.duration / 3600).toFixed(1);
    const toll = route.toll || 0;
    // 估算油耗（假设每公里0.1升）
    const fuel = (route.distance / 1000 * 0.1).toFixed(1);

    // ---- 提取分步导航指令 ----
    const steps = [];
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

    // ---- 提取路线点（polyline） ----
    let points = [];
    if (route.steps && Array.isArray(route.steps)) {
      for (let step of route.steps) {
        let poly = step.polyline || step.path || step.coords || step.points;
        if (poly && Array.isArray(poly) && poly.length > 0) {
          for (let coord of poly) {
            let lat, lng;
            if (coord.lat !== undefined && coord.lng !== undefined) {
              lat = coord.lat;
              lng = coord.lng;
            } else if (coord.latitude !== undefined && coord.longitude !== undefined) {
              lat = coord.latitude;
              lng = coord.longitude;
            } else if (Array.isArray(coord) && coord.length >= 2) {
              lat = coord[0];
              lng = coord[1];
            } else {
              continue;
            }
            if (typeof lat === 'number' && typeof lng === 'number') {
              points.push({ latitude: lat, longitude: lng });
            }
          }
        }
      }
    }
    console.log(`提取到 ${points.length} 个路线点`);

    // 如果points为空，使用起点和终点构建两点连线（降级方案）
    if (points.length === 0) {
      console.warn('未提取到polyline点，使用起终点两点连线');
      if (sLoc && eLoc) {
        points = [
          { latitude: sLoc.lat, longitude: sLoc.lng },
          { latitude: eLoc.lat, longitude: eLoc.lng }
        ];
        wx.showToast({ title: '仅显示起终点连线，缺少详细路径', icon: 'none' });
      } else {
        wx.showToast({ title: '无法获取坐标点，请重试', icon: 'none' });
        return;
      }
    }

    // 构建绿色曲线（真实驾车路线）
    const polyline = [{
      points: points,
      color: '#07c160',
      width: 6,
      dottedLine: false,
      arrowLine: true
    }];

    // 设置起点终点标记
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

    // 保留用户位置标记（如果有）
    if (this.data.markers && this.data.markers.length > 0 && this.data.markers[0].id === 0) {
      markers.push(this.data.markers[0]);
    }

    this.setData({
      latitude: (startCoord.latitude + endCoord.latitude) / 2,
      longitude: (startCoord.longitude + endCoord.longitude) / 2,
      scale: 14,
      markers: markers,
      polyline: polyline,
      routeInfo: {
        distance: distance,
        duration: duration,
        toll: toll,
        fuel: fuel
      },
      steps: steps
    });

    // 调整地图视野包含所有点（抬高抬亮地图详情）
    const mapCtx = wx.createMapContext('routeMap');
    mapCtx.includePoints({
      points: points,
      padding: [60, 60, 60, 60]
    });
  },

  // API错误处理
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