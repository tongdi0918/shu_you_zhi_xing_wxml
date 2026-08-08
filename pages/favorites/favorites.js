const app = getApp();

Page({
  data: {
    tab: 'scenic',
    list: []
  },

  onLoad() {
    this.loadData();
  },

  onPullDownRefresh() {
    this.loadData();
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ tab });
    this.loadData();
  },

  async loadData() {
    const { tab } = this.data;
    if (!app.globalData.token) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await wx.request({
        url: `${app.globalData.apiBase}/api/favorites?type=${tab}`,
        method: 'GET',
        header: { 'Authorization': `Bearer ${app.globalData.token}` }
      });
      wx.hideLoading();
      wx.stopPullDownRefresh();
      if (res.data.code === 0) {
        this.setData({ list: res.data.data || [] });
      }
    } catch (e) {
      wx.hideLoading();
      wx.stopPullDownRefresh();
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  goToDetail(e) {
    const { type, id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/${type}/${type}?id=${id}` });
  }
});