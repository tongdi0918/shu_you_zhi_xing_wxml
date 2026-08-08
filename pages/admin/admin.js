const app = getApp();

Page({
  data: {
    history: []
  },

  onShow() {
    this.loadHistory();
  },

  loadHistory() {
    const raw = wx.getStorageSync('history') || [];
    this.setData({ history: raw });
  },

  clearHistory() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有浏览记录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('history');
          this.setData({ history: [] });
          wx.showToast({ title: '已清空', icon: 'success' });
        }
      }
    });
  },

  goToDetail(e) {
    const { type, id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/${type}/${type}?id=${id}` });
  }
});