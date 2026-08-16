// pages/profile/profile.js
const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    isLogin: false,
    user: {},
    cityList: ['成都', '乐山', '阿坝', '绵阳', '宜宾', '自贡', '泸州', '德阳', '广元', '遂宁', '内江', '资阳', '眉山', '雅安', '巴中', '达州', '南充', '广安', '攀枝花', '凉山'],
    selectedCityIndex: 0   
  },

  onShow() {
    const token = wx.getStorageSync('token');
    const user = wx.getStorageSync('user') || {};
    this.setData({
      isLogin: !!token,
      user: user
    });
    // 从云数据库同步最新用户信息（含位置）
    if (token) {
      this.loadUserFromCloud();
    }
  },

  // ===== 从云数据库加载用户信息 =====
  async loadUserFromCloud() {
    try {
      const res = await db.collection('users').where({
        _openid: '{openid}'
      }).get();
      if (res.data && res.data.length > 0) {
        const cloudUser = res.data[0];
        const localUser = this.data.user;
        // 合并数据（保留云端的location）
        const mergedUser = {
          ...localUser,
          ...cloudUser,
          location: cloudUser.location || localUser.location || {}
        };
        this.setData({ user: mergedUser });
        // 更新本地缓存
        wx.setStorageSync('user', mergedUser);
      }
    } catch (err) {
      console.warn('从云数据库加载用户信息失败', err);
    }
  },

  // ===== 编辑位置 =====
  editLocation() {
    if (!this.data.isLogin) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    wx.showModal({
      title: '设置我的位置',
      editable: true,
      placeholderText: '请输入所在城市，如：成都',
      success: (res) => {
        if (res.confirm && res.content) {
          const city = res.content.trim().replace('市', '');
          if (city) {
            this.updateLocation(city);
          }
        }
      }
    });
  },


// pages/profile/profile.js



  loadUserLocation() {
    const location = app.globalData.userLocation;
    if (location && location.city && location.city !== '未设置') {
      this.setData({
        userLocation: location
      });
      const index = this.data.cityList.indexOf(location.city);
      if (index > -1) {
        this.setData({ selectedCityIndex: index });
      }
    } else {
      // 从云数据库获取
      this.fetchLocationFromDB();
    }
  },

  async fetchLocationFromDB() {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('users').where({
        _openid: '{openid}'
      }).get();
      if (res.data.length > 0 && res.data[0].location) {
        const location = res.data[0].location;
        app.globalData.userLocation = location;
        this.setData({ userLocation: location });
        const index = this.data.cityList.indexOf(location.city);
        if (index > -1) {
          this.setData({ selectedCityIndex: index });
        }
      }
    } catch (err) {
      console.error('获取用户位置失败', err);
    }
  },

  // ===== 城市选择 =====
  onCityChange(e) {
    const index = e.detail.value;
    const city = this.data.cityList[index];
    this.setData({
      selectedCityIndex: index,
      'userLocation.city': city
    });
    // 保存到全局
    app.globalData.userLocation = this.data.userLocation;
    // 保存到云数据库
    this.saveLocationToDB(city);
    wx.showToast({
      title: '已保存位置',
      icon: 'success'
    });
  },

  async saveLocationToDB(city) {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('users').where({
        _openid: '{openid}'
      }).get();
      if (res.data.length > 0) {
        await db.collection('users').doc(res.data[0]._id).update({
          data: {
            location: { city, latitude: 0, longitude: 0 }
          }
        });
      } else {
        await db.collection('users').add({
          data: {
            location: { city, latitude: 0, longitude: 0 },
            nickName: this.data.userInfo.nickName || '用户'
          }
        });
      }
    } catch (err) {
      console.error('保存位置失败', err);
    }
  },



  // ===== 更新位置到云数据库 =====
  async updateLocation(city) {
    wx.showLoading({ title: '保存中...' });
    try {
      await db.collection('users').where({
        _openid: '{openid}'
      }).update({
        data: {
          location: {
            city: city,
            province: '四川',
            updateTime: new Date()
          }
        }
      });
      // 更新本地数据
      const user = this.data.user;
      user.location = { city: city, province: '四川' };
      this.setData({ user });
      wx.setStorageSync('user', user);
      wx.hideLoading();
      wx.showToast({ title: '位置已更新', icon: 'success' });
    } catch (err) {
      wx.hideLoading();
      console.error('更新位置失败', err);
      wx.showToast({ title: '更新失败，请重试', icon: 'none' });
    }
  },

  // 跳转到收藏
  goToFavorites() {
    if (!this.data.isLogin) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    wx.navigateTo({ url: '/pages/favorites/favorites' });
  },

  // 跳转到历史
  goToHistory() {
    if (!this.data.isLogin) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    wx.navigateTo({ url: '/pages/history/history' });
  },

  // 跳转到推荐
  goToRecommend() {
    wx.switchTab({ url: '/pages/recommend/recommend' });
  },

  // 跳转到管理后台
  goToDashboard() {
    wx.navigateTo({ url: '/pages/dashboard/dashboard' });
  },

  // 关于
  showAbout() {
    wx.showModal({
      title: '关于蜀游智行',
      content: '蜀游智行 - 四川旅游推荐平台\\\\n\\\\n提供四川景区查询、智能路线规划、个性化推荐等服务。\\\\n\\\\n? 李字雄 For 2026',
      showCancel: false
    });
  },

  // 退出登录
  doLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('token');
          wx.removeStorageSync('user');
          app.globalData.token = null;
          app.globalData.user = null;
          this.setData({ isLogin: false, user: {} });
          wx.showToast({ title: '已退出', icon: 'success' });
        }
      }
    });
  }
});