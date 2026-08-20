App({
  globalData: {
    token: null,
    userLocation: { city: '未设置', latitude: 0, longitude: 0 } ,
    user: null,
    amapKey: '68ff2afb0b6d70f0a6970b71737729a6',
    tencentMapKey:'PCOBZ-7TC3C-HY32K-A2BQJ-PGYKV-MTBZI'
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
     // 检查登录状态
     const userInfo = wx.getStorageSync('userInfo');
     if (userInfo) {
       this.globalData.userInfo = userInfo;
       this.globalData.isLoggedIn = true;
     }
 
     // 获取用户城市
     this.getUserCity();
   
  },
  // 获取用户城市
  getUserCity: function () {
    const that = this;
    if (this.globalData.userInfo && this.globalData.userInfo._id) {
      const db = wx.cloud.database();
      db.collection('users').doc(this.globalData.userInfo._id).get().then(res => {
        if (res.data && res.data.city) {
          that.globalData.userCity = res.data.city;
          that.globalData.isAdmin = res.data.role === 'admin';
        }
      }).catch(err => {
        console.log('获取用户城市失败', err);
      });
    }
  },

  // 登录成功后更新全局数据
  setUserInfo: function (userInfo) {
    this.globalData.userInfo = userInfo;
    this.globalData.isLoggedIn = true;
    wx.setStorageSync('userInfo', userInfo);
    if (userInfo.city) {
      this.globalData.userCity = userInfo.city;
    }
    if (userInfo.role === 'admin') {
      this.globalData.isAdmin = true;
    }
  },

  // 退出登录
  logout: function () {
    this.globalData.userInfo = null;
    this.globalData.isLoggedIn = false;
    this.globalData.userCity = '';
    this.globalData.isAdmin = false;
    wx.removeStorageSync('userInfo');
    wx.reLaunch({
      url: '/pages/profile/profile',
    });
  },  
});