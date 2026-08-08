// pages/profile/profile.js
const app = getApp();

Page({
  data: {
    isLogin: false,
    user: {}
  },

  onShow() {
    const token = wx.getStorageSync('token');
    const user = wx.getStorageSync('user') || {};
    this.setData({
      isLogin: !!token,
      user: user
    });
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

  // 跳转到管理后台（仅管理员可见）
  goToDashboard() {
    wx.navigateTo({ url: '/pages/dashboard/dashboard' });
  },

  // 关于
  showAbout() {
    wx.showModal({
      title: '关于蜀游智行',
      content: '蜀游智行 - 四川旅游推荐平台\\n\\n提供四川景区查询、智能路线规划、个性化推荐等服务。\\n\\n© 李字雄 For 2026',
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