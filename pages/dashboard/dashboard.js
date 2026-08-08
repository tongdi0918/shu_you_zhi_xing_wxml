const app = getApp();

Page({
  data: {
    stats: { sceneries: 0, foods: 0, users: 0, orders: 0 }
  },

  onLoad() {
    this.loadStats();
  },

  async loadStats() {
    try {
      const res = await wx.request({
        url: `${app.globalData.apiBase}/api/admin/stats`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${wx.getStorageSync('token') || ''}`
        }
      });
      if (res.data.code === 0) {
        this.setData({ stats: res.data.data });
      }
    } catch (e) {
      console.error('加载统计失败', e);
    }
  },

  goToScenicMgr() {
    wx.navigateTo({ url: '/pages/scenic-mgr/scenic-mgr' });
  },

  goToFoodMgr() {
    wx.navigateTo({ url: '/pages/food-mgr/food-mgr' });
  },

  goToUserMgr() {
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  goBack() {
    wx.navigateBack();
  }
});