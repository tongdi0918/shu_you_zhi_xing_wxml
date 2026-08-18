// pages/food-mgr/food-mgr.js
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
      const res = await db.collection('foods').get();
      this.setData({ list: res.data || [] });
    } catch (err) {
      console.error('加载美食列表失败', err);
    }
  },

  addFood() {
    wx.showModal({
      title: '添加美食',
      editable: true,
      placeholderText: '请输入美食名称',
      success: (res) => {
        if (res.confirm && res.content) {
          this.saveFood({ name: res.content });
        }
      }
    });
  },

  async saveFood(data) {
    try {
      await db.collection('foods').add({
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

  editFood(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '编辑美食',
      editable: true,
      placeholderText: '请输入新名称',
      success: (res) => {
        if (res.confirm && res.content) {
          this.updateFood(id, { name: res.content });
        }
      }
    });
  },

  async updateFood(id, data) {
    try {
      await db.collection('foods').doc(id).update({ data });
      this.loadList();
      wx.showToast({ title: '✅ 更新成功', icon: 'success' });
    } catch (err) {
      console.error('更新失败', err);
      wx.showToast({ title: '更新失败', icon: 'none' });
    }
  },

  deleteFood(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除该美食吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await db.collection('foods').doc(id).remove();
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