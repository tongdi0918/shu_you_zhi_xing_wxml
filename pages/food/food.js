const app = getApp();

Page({
  data: {
    food: {},
    isFavorite: false,
    foodId: null
  },

  onLoad(options) {
    const id = options.id;
    this.setData({ foodId: id });
    this.loadFood(id);
    this.checkFavorite(id);
  },

  async loadFood(id) {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('foods').doc(id).get();
      if (res.data) {
        this.setData({ food: res.data });
        wx.setNavigationBarTitle({ title: res.data.name });
      } else {
        wx.showToast({ title: '未找到该美食', icon: 'none' });
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
        url: `${app.globalData.apiBase}/api/favorites/check?type=food&id=${id}`,
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
    const { foodId, isFavorite } = this.data;
    const action = isFavorite ? 'remove' : 'add';
    try {
      const res = await wx.request({
        url: `${app.globalData.apiBase}/api/favorites/${action}`,
        method: 'POST',
        header: { 'Authorization': `Bearer ${app.globalData.token}` },
        data: { type: 'food', id: foodId }
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
  }
});