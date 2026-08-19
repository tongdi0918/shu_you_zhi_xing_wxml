// pages/profile/profile.js
const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    userCity: '',
    isAdmin: false,
    scenicCount: 0,
    foodCount: 0,
    scenicAchievements: [],
    foodAchievements: [],
    showScenicAchievements: false,
    showFoodAchievements: false
  },

  onShow() {
    this.loadUserData();
    this.loadAchievements();
  },

  // ===== 加载用户数据 =====
  loadUserData() {
    const isLoggedIn = app.globalData.isLoggedIn || false;
    const userInfo = app.globalData.userInfo || null;
    const userCity = app.globalData.userCity || '未设置';
    const isAdmin = app.globalData.isAdmin || false;
    this.setData({ isLoggedIn, userInfo, userCity, isAdmin });
  },

  // ===== 加载成就数据（打卡点亮） =====
  async loadAchievements() {
    if (!this.data.isLoggedIn || !app.globalData.userInfo) {
      return;
    }
    const userId = app.globalData.userInfo._id;

    try {
      // 获取景区打卡记录
      const scenicRes = await db.collection('checkins').where({
        userId: userId,
        type: 'scenic'
      }).get();
      const scenicIds = scenicRes.data.map(item => item.targetId);

      // 获取景区详情
      let scenicList = [];
      if (scenicIds.length > 0) {
        const detailRes = await db.collection('sceneries').where({
          _id: db.command.in(scenicIds)
        }).get();
        scenicList = detailRes.data.map(item => ({ ...item, highlight: false }));
      }

      // 获取美食打卡记录
      const foodRes = await db.collection('checkins').where({
        userId: userId,
        type: 'food'
      }).get();
      const foodIds = foodRes.data.map(item => item.targetId);

      let foodList = [];
      if (foodIds.length > 0) {
        const detailRes = await db.collection('foods').where({
          _id: db.command.in(foodIds)
        }).get();
        foodList = detailRes.data.map(item => ({ ...item, highlight: false }));
      }

      this.setData({
        scenicCount: scenicList.length,
        scenicAchievements: scenicList,
        foodCount: foodList.length,
        foodAchievements: foodList
      });
    } catch (err) {
      console.error('加载成就失败', err);
    }
  },

  // ===== 切换景区成就展开 =====
  toggleScenicAchievements() {
    this.setData({
      showScenicAchievements: !this.data.showScenicAchievements
    });
  },

  // ===== 切换美食成就展开 =====
  toggleFoodAchievements() {
    this.setData({
      showFoodAchievements: !this.data.showFoodAchievements
    });
  },

  // ===== 点击缩略图切换高亮 =====
  toggleHighlight(e) {
    const { index, type } = e.currentTarget.dataset;
    const key = type === 'scenic' ? 'scenicAchievements' : 'foodAchievements';
    const list = this.data[key];
    // 切换当前项的高亮状态
    list[index].highlight = !list[index].highlight;
    this.setData({
      [key]: list
    });
  },

  // ===== 跳转登录 =====
  goToLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  // ===== 跳转注册 =====
  goToRegister() {
    wx.navigateTo({ url: '/pages/register/register' });
  },

  // ===== 设置城市 =====
  setCity() {
    if (!this.data.isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '设置城市',
      editable: true,
      placeholderText: '请输入您所在的城市',
      success: (res) => {
        if (res.confirm && res.content) {
          const city = res.content.trim();
          if (city) {
            this.updateUserCity(city);
          }
        }
      }
    });
  },

  // ===== 更新用户城市 =====
  async updateUserCity(city) {
    const userId = app.globalData.userInfo._id;
    try {
      await db.collection('users').doc(userId).update({
        data: { city: city, updateTime: new Date() }
      });
      app.globalData.userCity = city;
      app.globalData.userInfo.city = city;
      wx.setStorageSync('userInfo', app.globalData.userInfo);
      this.setData({ userCity: city });
      wx.showToast({ title: '城市设置成功', icon: 'success' });
    } catch (err) {
      wx.showToast({ title: '设置失败，请重试', icon: 'none' });
      console.error('更新城市失败', err);
    }
  },

  // ===== 跳转收藏 =====
  goToFavorites() {
    if (!this.data.isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/favorites/favorites' });
  },

  // ===== 跳转历史 =====
  goToHistory() {
    if (!this.data.isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/history/history' });
  },

  // ===== 跳转管理后台 =====
  goToDashboard() {
    if (!this.data.isAdmin) {
      wx.showToast({ title: '无权限', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/dashboard/dashboard' });
  },

  // ===== 关于我们 =====
  goToAbout() {
    wx.showModal({
      title: '关于蜀游智行',
      content: '蜀游智行 v1.0\\n为您推荐四川最美的景区和最地道的美食',
      showCancel: false
    });
  },

  // ===== 退出登录 =====
  logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('token');
          wx.removeStorageSync('userInfo');
          wx.removeStorageSync('isAdmin');
          app.globalData.token = null;
          app.globalData.userInfo = null;
          app.globalData.isLoggedIn = false;
          app.globalData.isAdmin = false;
          this.setData({
            isLoggedIn: false,
            userInfo: null,
            scenicAchievements: [],
            foodAchievements: [],
            scenicCount: 0,
            foodCount: 0
          });
          wx.showToast({ title: '已退出', icon: 'success' });
        }
      }
    });
  }
});