// pages/food/food.js
const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    food: {},
    isFavorite: false,
    foodId: null,
    defaultImages: [
      'https://picsum.photos/800/400?random=26',
      '/images/default.png'
    ]
  },

  onLoad(options) {
    const id = options.id;
    if (id) {
      this.setData({ foodId: id });
      this.loadFood(id);
      this.checkFavorite(id);
      // ✅ 记录浏览历史
      this.recordHistory(id, 'food');
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' });
    }
  },

  // ===== 加载美食数据 =====
  async loadFood(id) {
    try {
      const res = await db.collection('foods').doc(id).get();
      if (res.data) {
        const data = res.data;
        if (!data.images || data.images.length === 0) {
          data.images = this.data.defaultImages;
        }
        this.setData({ food: data });
        wx.setNavigationBarTitle({ title: data.name || '美食详情' });
      } else {
        wx.showToast({ title: '未找到该美食', icon: 'none' });
      }
    } catch (err) {
      console.error('加载美食失败', err);
    }
  },

  // ===== 检查收藏状态 =====
  async checkFavorite(id) {
    if (!app.globalData.isLoggedIn) return;
    try {
      const userId = app.globalData.userInfo._id;
      const res = await db.collection('favorites').where({
        userId: userId,
        type: 'food',
        targetId: id
      }).get();
      this.setData({ isFavorite: res.data.length > 0 });
    } catch (e) {
      console.error(e);
    }
  },

  // ===== 切换收藏 =====
  async toggleFavorite() {
    if (!app.globalData.isLoggedIn) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    const { foodId, isFavorite } = this.data;
    const userId = app.globalData.userInfo._id;
    try {
      if (isFavorite) {
        const res = await db.collection('favorites').where({
          userId: userId,
          type: 'food',
          targetId: foodId
        }).get();
        if (res.data.length > 0) {
          await db.collection('favorites').doc(res.data[0]._id).remove();
        }
      } else {
        await db.collection('favorites').add({
          data: {
            userId: userId,
            type: 'food',
            targetId: foodId,
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

  // ===== ✅ 记录浏览历史 =====
  async recordHistory(targetId, type) {
    if (!app.globalData.isLoggedIn) return;
    const userId = app.globalData.userInfo._id;
    try {
      // 先删除同一条目的旧记录
      await db.collection('histories').where({
        userId: userId,
        targetId: targetId,
        type: type
      }).remove();
      // 插入新记录
      await db.collection('histories').add({
        data: {
          userId: userId,
          targetId: targetId,
          type: type,
          viewTime: new Date()
        }
      });
    } catch (err) {
      console.error('记录浏览历史失败', err);
    }
  },

  // ===== 跳转路线规划 =====
  goToRoute() {
    wx.switchTab({ url: '/pages/route/route' });
  },

  // ===== 跳转携程订餐 =====
  goToCtrip() {
    wx.navigateTo({
      url: `/pages/webview/webview?url=https://m.ctrip.com`
    });
  }
});