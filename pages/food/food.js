// pages/food/food.js
const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    food: {},
    imageList: [],
    isFavorite: false,
    foodId: null
  },

  onLoad(options) {
    const id = options.id;
    if (id) {
      this.setData({ foodId: id });
      this.loadFood(id);
      this.checkFavorite(id);
      this.recordHistory(id, 'food');
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' });
    }
  },

  // ===== 加载美食数据 =====
  async loadFood(id) {
    try {
      wx.showLoading({ title: '加载中...' });
      const res = await db.collection('foods').doc(id).get();
      if (res.data) {
        const data = res.data;
        // 处理图片：调用云函数获取临时链接
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
          food: data,
          imageList: imageList.length > 0 ? imageList : []
        });
        wx.setNavigationBarTitle({ title: data.name || '美食详情' });
      } else {
        wx.showToast({ title: '未找到该美食', icon: 'none' });
      }
    } catch (err) {
      console.error('加载美食失败', err);
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
    } catch (err) {
      console.error('记录浏览历史失败', err);
    }
  },

  // ===== 定位至该地点 =====
  goToLocation() {
    const { food } = this.data;
    if (!food.longitude || !food.latitude) {
      wx.showToast({ title: '该地点暂无位置信息', icon: 'none' });
      return;
    }
    wx.openLocation({
      latitude: parseFloat(food.latitude),
      longitude: parseFloat(food.longitude),
      name: food.name,
      address: food.address || food.city || '',
      scale: 15
    });
  }
});