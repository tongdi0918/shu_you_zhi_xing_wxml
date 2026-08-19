// pages/dashboard/dashboard.js
const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    stats: {
      sceneries: 0,
      foods: 0,
      users: 0,
      orders: 0
    }
  },

  onLoad() {
    this.loadStats();
  },

  async loadStats() {
    try {
      // 并行查询各集合数量
      const [scenicRes, foodRes, userRes] = await Promise.all([
        db.collection('sceneries').count(),
        db.collection('foods').count(),
        db.collection('users').count()
      ]);

      this.setData({
        stats: {
          sceneries: scenicRes.total || 0,
          foods: foodRes.total || 0,
          users: userRes.total || 0,
          orders: 0  // 订单功能暂未实现
        }
      });
    } catch (err) {
      console.error('加载统计失败', err);
      wx.showToast({ title: '加载统计失败', icon: 'none' });
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