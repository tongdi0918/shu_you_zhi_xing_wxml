// pages/history/history.js
const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    historyList: [],
    loading: false,
  },

  onShow: function () {
    if (!app.globalData.isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    this.loadHistory();
  },

  // 加载浏览历史
  loadHistory: function () {
    const userId = app.globalData.userInfo._id;
    this.setData({ loading: true });

    db.collection('histories')
      .where({ userId: userId })
      .orderBy('viewTime', 'desc')
      .get()
      .then(res => {
        const histories = res.data;
        if (histories.length === 0) {
          this.setData({ historyList: [], loading: false });
          return;
        }

        // 分别获取景区和美食详情（修复：使用 sceneries 集合）
        const scenicIds = histories.filter(h => h.type === 'scenic').map(h => h.targetId);
        const foodIds = histories.filter(h => h.type === 'food').map(h => h.targetId);

        const promises = [];
        if (scenicIds.length > 0) {
          promises.push(
            db.collection('sceneries')
              .where({ _id: db.command.in(scenicIds) })
              .get()
              .then(res => res.data.map(item => ({ ...item, type: 'scenic' })))
          );
        } else {
          promises.push(Promise.resolve([]));
        }

        if (foodIds.length > 0) {
          promises.push(
            db.collection('foods')
              .where({ _id: db.command.in(foodIds) })
              .get()
              .then(res => res.data.map(item => ({ ...item, type: 'food' })))
          );
        } else {
          promises.push(Promise.resolve([]));
        }

        return Promise.all(promises);
      })
      .then(results => {
        const allItems = results.flat();
        // 按浏览时间排序
        const historyMap = {};
        const histories = this._historiesData || [];
        histories.forEach(h => {
          historyMap[h.targetId] = h.viewTime;
        });
        allItems.sort((a, b) => {
          return new Date(historyMap[b._id]) - new Date(historyMap[a._id]);
        });
        this.setData({ historyList: allItems, loading: false });
      })
      .catch(err => {
        console.error('加载历史失败', err);
        wx.showToast({ title: '加载失败，请重试', icon: 'none' });
        this.setData({ loading: false });
      });
  },

  // 查看详情
  viewDetail: function (e) {
    const { id, type } = e.currentTarget.dataset;
    const url = type === 'scenic' ? '/pages/scenic/scenic' : '/pages/food/food';
    wx.navigateTo({ url: url + '?id=' + id });
  },

  // 清空历史
  clearHistory: function () {
    const userId = app.globalData.userInfo._id;
    wx.showModal({
      title: '提示',
      content: '确定要清空所有浏览历史吗？',
      success: (res) => {
        if (res.confirm) {
          db.collection('histories')
            .where({ userId: userId })
            .remove()
            .then(() => {
              wx.showToast({ title: '已清空', icon: 'success' });
              this.setData({ historyList: [] });
            })
            .catch(err => {
              console.error('清空历史失败', err);
              wx.showToast({ title: '操作失败', icon: 'none' });
            });
        }
      },
    });
  },
});