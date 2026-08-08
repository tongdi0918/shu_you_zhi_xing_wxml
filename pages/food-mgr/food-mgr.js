const app = getApp();

Page({
  data: {
    list: []
  },

  onShow() {
    this.loadList();
  },

  async loadList() {
    try {
      const res = await wx.request({
        url: `${app.globalData.apiBase}/api/admin/foods`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${wx.getStorageSync('token') || ''}`
        }
      });
      if (res.data.code === 0) {
        this.setData({ list: res.data.data || [] });
      }
    } catch (e) {
      console.error('加载美食失败', e);
    }
  },

  showAddDialog() {
    wx.showToast({ title: '添加功能开发中', icon: 'none' });
  },

  showEditDialog(e) {
    const id = e.currentTarget.dataset.id;
    wx.showToast({ title: `编辑 ${id}`, icon: 'none' });
  },

  async deleteItem(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除该美食吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await wx.request({
              url: `${app.globalData.apiBase}/api/admin/foods/${id}`,
              method: 'DELETE',
              header: {
                'Authorization': `Bearer ${wx.getStorageSync('token') || ''}`
              }
            });
            wx.showToast({ title: '删除成功', icon: 'success' });
            this.loadList();
          } catch (e) {
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      }
    });
  }
});