// pages/scenic/scenic.js
const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    scenic: {},
    imageList: [],
    isFavorite: false,
    scenicId: null
  },

  onLoad(options) {
    const id = options.id;
    if (id) {
      this.setData({ scenicId: id });
      this.loadScenic(id);
      this.checkFavorite(id);
      this.recordHistory(id, 'scenic');
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' });
    }
  },

  // ===== 加载景区数据 =====
  async loadScenic(id) {
    try {
      wx.showLoading({ title: '加载中...' });
      const res = await db.collection('sceneries').doc(id).get();
      if (res.data) {
        const data = res.data;
        let imageList = [];
        if (data.image_url) {
          const fileList = Array.isArray(data.image_url) ? data.image_url : [data.image_url];
          try {
            const cloudRes = await wx.cloud.callFunction({
              name: 'getImages',
              data: { fileList }
            });
            if (cloudRes.result && cloudRes.result.fileList) {
              imageList = cloudRes.result.fileList.map(item => item.tempFileURL || item.fileID);
            }
          } catch (err) {
            console.error('获取图片临时链接失败', err);
            imageList = fileList;
          }
        }
        this.setData({
          scenic: data,
          imageList: imageList.length > 0 ? imageList : []
        });
        wx.setNavigationBarTitle({ title: data.name || '景区详情' });
      } else {
        wx.showToast({ title: '未找到该景区', icon: 'none' });
      }
    } catch (err) {
      console.error('加载景区失败', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // ===== 检查收藏状态 =====
  async checkFavorite(id) {
    if (!app.globalData.isLoggedIn) return;
    try {
      const userId = app.globalData.userInfo._id;
      const res = await db.collection('favorites').where({
        userId: userId,
        type: 'scenic',
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
    const { scenicId, isFavorite } = this.data;
    const userId = app.globalData.userInfo._id;
    try {
      if (isFavorite) {
        const res = await db.collection('favorites').where({
          userId: userId,
          type: 'scenic',
          targetId: scenicId
        }).get();
        if (res.data.length > 0) {
          await db.collection('favorites').doc(res.data[0]._id).remove();
        }
      } else {
        await db.collection('favorites').add({
          data: {
            userId: userId,
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

  // ===== 记录浏览历史 =====
  async recordHistory(targetId, type) {
    if (!app.globalData.isLoggedIn) return;
    const userId = app.globalData.userInfo._id;
    try {
      await db.collection('histories').where({
        userId: userId,
        targetId: targetId,
        type: type
      }).remove();
      await db.collection('histories').add({
        data: {
          userId: userId,
          targetId: targetId,
          type: type,
          viewTime: new Date()
        }
      });
    } catch (e) {
      console.error(e);
    }
  },

  // ===== 跳转携程 =====
  goToCtrip() {
    wx.navigateTo({
      url: '/pages/webview/webview?url=' + encodeURIComponent('https://www.ctrip.com/')
    });
  }
});