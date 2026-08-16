App({
  globalData: {
    token: null,
    userLocation: { city: '未设置', latitude: 0, longitude: 0 } ,
    user: null,
    amapKey: '913eae31d381977a5d4c13c93833a29b'
  },
  onLaunch() {
    if (!wx.cloud) {
      console.error('? 微信版本不支持云开发');
      return;
    }
    wx.cloud.init({
      env: 'cloud1-d2gphu7bt75dc5910',
      traceUser: true
    });
    const token = wx.getStorageSync('token');
    const user = wx.getStorageSync('user');
    if (token) {
      this.globalData.token = token;
      this.globalData.user = user;
    }
  }
});