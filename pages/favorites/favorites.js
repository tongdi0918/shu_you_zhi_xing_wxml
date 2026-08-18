// pages/favorites/favorites.js
const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    activeTab: 'scenic',
    scenicList: [],
    foodList: [],
    loading: false,
  },

  onShow: function () {
    if (!app.globalData.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
      });
      return;
    }
    this.loadFavorites();
  },

  // 切换Tab
  switchTab: function (e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  // 加载收藏
  loadFavorites: function () {
    const userId = app.globalData.userInfo._id;
    this.setData({ loading: true });

    // 获取景区收藏
    db.collection('favorites').where({
      userId: userId,
      type: 'scenic'
    }).get().then(res => {
      const scenicIds = res.data.map(item => item.targetId);
      if (scenicIds.length > 0) {
        return db.collection('scenics').where({
          _id: db.command.in(scenicIds)
        }).get();
      }
      return { data: [] };
    }).then(res => {
      this.setData({ scenicList: res.data });
      // 获取美食收藏
      return db.collection('favorites').where({
        userId: userId,
        type: 'food'
      }).get();
    }).then(res => {
      const foodIds = res.data.map(item => item.targetId);
      if (foodIds.length > 0) {
        return db.collection('foods').where({
          _id: db.command.in(foodIds)
        }).get();
      }
      return { data: [] };
    }).then(res => {
      this.setData({
        foodList: res.data,
        loading: false,
      });
    }).catch(err => {
      console.log('加载收藏失败', err);
      wx.showToast({
        title: '加载失败',
        icon: 'none',
      });
      this.setData({ loading: false });
    });
  },

  // 查看详情
  viewDetail: function (e) {
    const { id, type } = e.currentTarget.dataset;
    const url = type === 'scenic' ? '/pages/scenic/scenic' : '/pages/food/food';
    wx.navigateTo({
      url: url + '?id=' + id,
    });
  },

  // 取消收藏
  removeFavorite: function (e) {
    const { id, type } = e.currentTarget.dataset;
    const userId = app.globalData.userInfo._id;

    wx.showModal({
      title: '提示',
      content: '确定要取消收藏吗？',
      success: (res) => {
        if (res.confirm) {
          db.collection('favorites').where({
            userId: userId,
            targetId: id,
            type: type,
          }).remove().then(() => {
            wx.showToast({
              title: '已取消收藏',
              icon: 'success',
            });
            this.loadFavorites();
          }).catch(err => {
            console.log('取消收藏失败', err);
            wx.showToast({
              title: '操作失败',
              icon: 'none',
            });
          });
        }
      },
    });
  },
});