const app = getApp();

Page({
  data: { favorites: [], loading: false },
  onShow() { this.loadFavorites(); },
  async loadFavorites() {
    if (!app.globalData.token) { wx.navigateTo({ url: '/pages/login/login' }); return; }
    this.setData({ loading: true });
    try {
      const db = wx.cloud.database();
      const res = await db.collection('favorites').where({ userId: app.globalData.token }).limit(1000).get();
      const ids = res.data || [];
      const sceneries = [], foods = [];
      for (const item of ids) {
        if (item.type === 'scenic') {
          const s = await db.collection('sceneries').doc(item.targetId).limit(1000).get();
          if (s.data) sceneries.push({ ...s.data, favId: item._id });
        } else if (item.type === 'food') {
          const f = await db.collection('foods').doc(item.targetId).get();
          if (f.data) foods.push({ ...f.data, favId: item._id });
        }
      }
      this.setData({ favorites: [...sceneries, ...foods] });
    } catch (err) {
      console.error('加载收藏失败', err);
    } finally {
      this.setData({ loading: false });
    }
  },
  goToDetail(e) {
    const item = e.currentTarget.dataset.item;
    const url = item.level ? `/pages/scenic/scenic?id=${item._id}` : `/pages/food/food?id=${item._id}`;
    wx.navigateTo({ url });
  }
});