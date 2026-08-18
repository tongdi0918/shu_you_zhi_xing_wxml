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
    showFoodAchievements: false,
  },

  onShow: function () {
    this.loadUserData();
    this.loadAchievements();
  },

  // 加载用户数据
  loadUserData: function () {
    const isLoggedIn = app.globalData.isLoggedIn;
    const userInfo = app.globalData.userInfo;
    const userCity = app.globalData.userCity || '未设置';
    const isAdmin = app.globalData.isAdmin || false;

    this.setData({
      isLoggedIn: isLoggedIn,
      userInfo: userInfo,
      userCity: userCity,
      isAdmin: isAdmin,
    });
  },

  // 加载成就数据（打卡点亮）
  loadAchievements: function () {
    if (!this.data.isLoggedIn || !app.globalData.userInfo) {
      return;
    }

    const userId = app.globalData.userInfo._id;

    // 获取景区打卡记录
    db.collection('checkins').where({
      userId: userId,
      type: 'scenic'
    }).get().then(res => {
      const scenicIds = res.data.map(item => item.targetId);
      this.setData({
        scenicCount: scenicIds.length,
        scenicAchievements: scenicIds,
      });
    }).catch(err => {
      console.log('获取景区打卡失败', err);
    });

    // 获取美食打卡记录
    db.collection('checkins').where({
      userId: userId,
      type: 'food'
    }).get().then(res => {
      const foodIds = res.data.map(item => item.targetId);
      this.setData({
        foodCount: foodIds.length,
        foodAchievements: foodIds,
      });
    }).catch(err => {
      console.log('获取美食打卡失败', err);
    });
  },

  // 切换显示景区成就
  toggleScenicAchievements: function () {
    this.setData({
      showScenicAchievements: !this.data.showScenicAchievements,
    });
  },

  // 切换显示美食成就
  toggleFoodAchievements: function () {
    this.setData({
      showFoodAchievements: !this.data.showFoodAchievements,
    });
  },

  // 跳转到登录页
  goToLogin: function () {
    wx.navigateTo({
      url: '/pages/login/login',
    });
  },

  // 跳转到注册页
  goToRegister: function () {
    wx.navigateTo({
      url: '/pages/register/register',
    });
  },

  // 设置城市
  setCity: function () {
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
      });
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
      },
    });
  },

  // 更新用户城市到云数据库
  updateUserCity: function (city) {
    const userId = app.globalData.userInfo._id;
    db.collection('users').doc(userId).update({
      data: {
        city: city,
        updateTime: new Date(),
      }
    }).then(() => {
      app.globalData.userCity = city;
      this.setData({
        userCity: city,
      });
      wx.showToast({
        title: '城市设置成功',
        icon: 'success',
      });
    }).catch(err => {
      wx.showToast({
        title: '设置失败，请重试',
        icon: 'none',
      });
      console.log('更新城市失败', err);
    });
  },

  // 查看我的收藏
  goToFavorites: function () {
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
      });
      return;
    }
    wx.navigateTo({
      url: '/pages/favorites/favorites',
    });
  },

  // 查看浏览历史
  goToHistory: function () {
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
      });
      return;
    }
    wx.navigateTo({
      url: '/pages/history/history',
    });
  },

  // 管理员后台
  goToAdmin: function () {
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
      });
      return;
    }
    if (!this.data.isAdmin) {
      wx.showToast({
        title: '您不是管理员',
        icon: 'none',
      });
      return;
    }
    wx.navigateTo({
      url: '/pages/admin/admin',
    });
  },

  // 关于我们
  showAbout: function () {
    wx.showModal({
      title: '产品介绍',
      content: '蜀游之行 - 带你探索四川的美食与美景\n\n本应用致力于为游客提供四川地区最优质的景区和美食推荐。\n\n版本:1.0.6',
      showCancel: false,
      confirmText: '知道了',
    });
  },

  // 退出登录
  handleLogout: function () {
    if (!this.data.isLoggedIn) {
      return;
    }
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          app.logout();
        }
      },
    });
  },

  // 查看景区详情（打卡点亮）
  viewScenicDetail: function (e) {
    const id = e.currentTarget.dataset.id;
    if (id) {
      wx.navigateTo({
        url: '/pages/scenic/scenic?id=' + id,
      });
    }
  },

  // 查看美食详情（打卡点亮）
  viewFoodDetail: function (e) {
    const id = e.currentTarget.dataset.id;
    if (id) {
      wx.navigateTo({
        url: '/pages/food/food?id=' + id,
      });
    }
  },
});