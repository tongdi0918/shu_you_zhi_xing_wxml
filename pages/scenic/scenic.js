const app = getApp();

Page({
  data: {
    scenic: {},
    isFavorite: false,
    scenicId: null
  },

  onLoad(options) {
    const id = options.id;
    this.setData({ scenicId: id });
    this.loadScenic(id);
    this.checkFavorite(id);
  },

  async loadScenic(id) {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('sceneries').doc(id).get();
      if (res.data) {
        this.setData({ scenic: res.data });
        wx.setNavigationBarTitle({ title: res.data.name });
      } else {
        wx.showToast({ title: '未找到该景区', icon: 'none' });
      }
    } catch (err) {
      console.error(err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  async checkFavorite(id) {
    if (!app.globalData.token) return;
    try {
      const res = await wx.request({
        url: `${app.globalData.apiBase}/api/favorites/check?type=scenic&id=${id}`,
        method: 'GET',
        header: { 'Authorization': `Bearer ${app.globalData.token}` }
      });
      if (res.data.code === 0) {
        this.setData({ isFavorite: res.data.data });
      }
    } catch (e) {}
  },

  async toggleFavorite() {
    if (!app.globalData.token) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    const { scenicId, isFavorite } = this.data;
    const action = isFavorite ? 'remove' : 'add';
    try {
      const res = await wx.request({
        url: `${app.globalData.apiBase}/api/favorites/${action}`,
        method: 'POST',
        header: { 'Authorization': `Bearer ${app.globalData.token}` },
        data: { type: 'scenic', id: scenicId }
      });
      if (res.data.code === 0) {
        this.setData({ isFavorite: !isFavorite });
        wx.showToast({ title: isFavorite ? '已取消收藏' : '已收藏', icon: 'success' });
      }
    } catch (e) {
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  goToRoute() {
    wx.switchTab({ url: '/pages/route/route' });
  },

  goToCtrip() {
    wx.navigateTo({
      url: `/pages/webview/webview?url=https://m.ctrip.com`
    });
  }
});