// pages/scenic/scenic.js
const app = getApp();

Page({
  data: {
    scenic: {},
    isFavorite: false,
    scenicId: null
  },

  onLoad(options) {
    const id = options.id;
    if (id) {
      this.setData({ scenicId: id });
      this.loadScenic(id);
      this.checkFavorite(id);
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' });
    }
  },

  async loadScenic(id) {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('sceneries').doc(id).get();
      if (res.data) {
        this.setData({ scenic: res.data });
        wx.setNavigationBarTitle({ title: res.data.name || '景区详情' });
      } else {
        wx.showToast({ title: '未找到该景区', icon: 'none' });
      }
    } catch (err) {
      console.error(err);
      // 保底模拟数据
      this.setData({ scenic: this.getMockScenic(id) });
    }
  },

  async checkFavorite(id) {
    if (!app.globalData.token) return;
    try {
      const db = wx.cloud.database();
      const res = await db.collection('favorites').where({
        userId: app.globalData.token,
        type: 'scenic',
        targetId: id
      }).get();
      this.setData({ isFavorite: res.data.length > 0 });
    } catch (e) {
      console.error(e);
    }
  },

  async toggleFavorite() {
    if (!app.globalData.token) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    const { scenicId, isFavorite } = this.data;
    try {
      const db = wx.cloud.database();
      if (isFavorite) {
        const res = await db.collection('favorites').where({
          userId: app.globalData.token,
          type: 'scenic',
          targetId: scenicId
        }).get();
        if (res.data.length > 0) {
          await db.collection('favorites').doc(res.data[0]._id).remove();
        }
      } else {
        await db.collection('favorites').add({
          data: {
            userId: app.globalData.token,
            type: 'scenic',
            targetId: scenicId,
            createTime: new Date()
          }
        });
      }
      this.setData({ isFavorite: !isFavorite });
      wx.showToast({
        title: isFavorite ? '已取消收藏' : '已收藏',
        icon: 'success'
      });
    } catch (e) {
      console.error(e);
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