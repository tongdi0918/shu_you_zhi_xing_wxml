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

  setOrigin(e) {
    this.setData({ origin: e.detail.value });
  },

  setDestination(e) {
    this.setData({ destination: e.detail.value });
  },

  getMyLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          origin: `${res.latitude},${res.longitude}`,
          mapCenter: { longitude: res.longitude, latitude: res.latitude }
        });
      },
      fail: () => {
        wx.showToast({ title: '请授权位置权限', icon: 'none' });
      }
    });
  },

  async planRoute() {
    const { origin, destination } = this.data;
    if (!origin || !destination) {
      wx.showToast({ title: '请填写出发地和目的地', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '规划中...' });

    try {
      const res = await wx.request({
        url: `${app.globalData.apiBase}/api/route/plan`,
        method: 'POST',
        data: { origin, destination }
      });

      wx.hideLoading();

      if (res.data.code === 0) {
        const data = res.data.data;
        this.setData({
          routeResult: true,
          routeSummary: data.summary || '路线规划完成',
          routeDistance: data.distance || '--',
          routeTime: data.duration || '--',
          routeTolls: data.tolls || '--',
          routeSteps: data.steps || [],
          markers: data.markers || [],
          polyline: data.polyline || []
        });
      } else {
        wx.showToast({ title: res.data.message || '规划失败', icon: 'none' });
      }
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '网络错误', icon: 'none' });
    }
  },

  goBack() {
    wx.switchTab({ url: '/pages/home/home' });
  }
});