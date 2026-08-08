App({
  globalData: {
    token: null,
    user: null,
    amapKey:'913eae31d381977a5d4c13c93833a29b'
  },

  onLaunch() {
    console.log('===== App onLaunch 开始 =====');
    if (!wx.cloud) {
      console.error('❌ 微信版本不支持云开发');
      return;
    }
    wx.cloud.init({
      env: 'cloud1-d2gphu7bt75dc5910',   
      traceUser: true
    });
    console.log('✅ 云开发初始化完成');

    // 读取本地登录信息
    const token = wx.getStorageSync('token');
    const user = wx.getStorageSync('user');
    if (token) {
      this.globalData.token = token;
      this.globalData.user = user;
    }
    console.log('===== App onLaunch 结束 =====');
  }
});