// pages/scenic-mgr/scenic-mgr.js
const db = wx.cloud.database();

Page({
  data: {
    list: []
  },

  onShow() {
    this.loadList();
  },

  async loadList() {
    try {
      const res = await db.collection('sceneries').get();
      this.setData({ list: res.data || [] });
    } catch (err) {
      console.error('加载景区列表失败', err);
    }
  },

  addScenic() {
    wx.showModal({
      title: '添加景区',
      editable: true,
      placeholderText: '请输入景区名称',
      success: (res) => {
        if (res.confirm && res.content) {
          this.saveScenic({ name: res.content });
        }
      }
    });
  },

  async saveScenic(data) {
    try {
      await db.collection('sceneries').add({
        data: {
          ...data,
          createTime: new Date()
        }
      });
      this.loadList();
      wx.showToast({ title: '✅ 添加成功', icon: 'success' });
    } catch (err) {
      console.error('添加失败', err);
      wx.showToast({ title: '添加失败', icon: 'none' });
    }
  },

  editScenic(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '编辑景区',
      editable: true,
      placeholderText: '请输入新名称',
      success: (res) => {
        if (res.confirm && res.content) {
          this.updateScenic(id, { name: res.content });
        }
      }
    });
  },

  async updateScenic(id, data) {
    try {
      await db.collection('sceneries').doc(id).update({ data });
      this.loadList();
      wx.showToast({ title: '✅ 更新成功', icon: 'success' });
    } catch (err) {
      console.error('更新失败', err);
      wx.showToast({ title: '更新失败', icon: 'none' });
    }
  },

  deleteScenic(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除该景区吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await db.collection('sceneries').doc(id).remove();
            this.loadList();
            wx.showToast({ title: '✅ 已删除', icon: 'success' });
          } catch (err) {
            console.error('删除失败', err);
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      }
    });
  }
});