App({
  globalData: {
    token: null,
    userLocation: {
      city: '未设置',
      latitude: 0,
      longitude: 0
    },
    user: null,
    userInfo: null,
    isLoggedIn: false,
    userCity: '未设置',
    isAdmin: false,
    amapKey: '68ff2afb0b6d70f0a6970b71737729a6',
    tencentMapKey: 'PCOBZ-7TC3C-HY32K-A2BQJ-PGYKV-MTBZI'
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

    // 恢复登录状态
    const token = wx.getStorageSync('token');
    const user = wx.getStorageSync('user');
    if (token) {
      this.globalData.token = token;
      this.globalData.user = user;
    }

    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.globalData.userInfo = userInfo;
      this.globalData.isLoggedIn = true;
      // 从缓存恢复城市
      const cachedCity = wx.getStorageSync('userCity');
      if (cachedCity) {
        this.globalData.userCity = cachedCity;
      }
      // 异步从云数据库获取最新城市（同时更新缓存）
      this.getUserCity();
    }
  },

  // ===== 获取用户城市（优先缓存，兜底云数据库） =====
  getUserCity: function() {
    const that = this;
    const userId = this.globalData.userInfo?._id;

    if (!userId) {
      console.log('?? 未登录，无法获取城市');
      return;
    }

    // 1. 优先从本地缓存读取
    const cachedCity = wx.getStorageSync('userCity');
    if (cachedCity && cachedCity !== '未设置') {
      that.globalData.userCity = cachedCity;
      console.log('? 从缓存读取城市:', cachedCity);
      return;
    }

    // 2. 缓存不存在或为"未设置"，从云数据库获取
    const db = wx.cloud.database();
    db.collection('users').doc(userId).get()
      .then(res => {
        if (res.data && res.data.city) {
          const city = res.data.city;
          that.globalData.userCity = city;
          // 同步写入缓存
          wx.setStorageSync('userCity', city);
          console.log('? 从云数据库获取城市:', city);
        } else {
          console.log('?? 云数据库中无城市信息');
        }
      })
      .catch(err => {
        console.log('? 获取用户城市失败', err);
        // 失败时使用缓存中的值（如果有）
        const fallbackCity = wx.getStorageSync('userCity');
        if (fallbackCity) {
          that.globalData.userCity = fallbackCity;
        }
      });
  },

  // ===== 登录成功后更新全局数据 =====
  setUserInfo: function(userInfo) {
    this.globalData.userInfo = userInfo;
    this.globalData.isLoggedIn = true;
    wx.setStorageSync('userInfo', userInfo);

    if (userInfo.city) {
      this.globalData.userCity = userInfo.city;
      wx.setStorageSync('userCity', userInfo.city);
    }

    if (userInfo.role === 'admin') {
      this.globalData.isAdmin = true;
    }
  },

  // ===== 设置用户城市（供 profile 页面调用） =====
  setUserCity: function(city) {
    if (!city || city.trim() === '') return;
    const trimmedCity = city.trim();
    this.globalData.userCity = trimmedCity;
    wx.setStorageSync('userCity', trimmedCity);
    console.log('? 城市已更新并缓存:', trimmedCity);
  },

  // ===== 退出登录 =====
  logout: function() {
    this.globalData.userInfo = null;
    this.globalData.isLoggedIn = false;
    this.globalData.userCity = '未设置';
    this.globalData.isAdmin = false;
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('userCity');
    wx.reLaunch({
      url: '/pages/profile/profile',
    });
  }
});