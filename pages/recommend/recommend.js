const app = getApp();

Page({
  data: {
    recommendScenery: [],
    recommendFood: []
  },

  onShow() {
    this.loadRecommend();
  },

  async loadRecommend() {
    wx.showLoading({ title: '加载推荐...' });

    try {
      const res = await wx.request({
        url: `${app.globalData.apiBase}/api/recommend`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${wx.getStorageSync('token') || ''}`
        }
      });

      wx.hideLoading();

      if (res.data.code === 0) {
        this.setData({
          recommendScenery: res.data.data.scenery || [],
          recommendFood: res.data.data.food || []
        });
      }
    } catch (e) {
      wx.hideLoading();
      console.error('加载推荐失败', e);
    }
  },

  refreshRecommend() {
    this.loadRecommend();
  },

  goToScenic(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/scenic/scenic?id=${id}` });
  },

  goToFood(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/food/food?id=${id}` });
  }
});