// pages/admin/admin.js
const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    activeTab: 'scenic',
    // 景区数据
    scenicList: [],
    // 美食数据
    foodList: [],
    // 用户数据
    userList: [],
    // 统计数据
    stats: {
      scenicCount: 0,
      foodCount: 0,
      userCount: 0,
      favoriteCount: 0,
    },
    loading: false,
    showDialog: false,
    dialogType: '', // 'add' | 'edit'
    dialogData: {},
    formData: {
      name: '',
      location: '',
      description: '',
      image: '',
      shop: '',
      price: '',
    },
  },

  onShow: function () {
    if (!app.globalData.isLoggedIn || !app.globalData.isAdmin) {
      wx.showToast({
        title: '无权访问',
        icon: 'none',
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1000);
      return;
    }
    this.loadData();
    this.loadStats();
  },

  // 切换Tab
  switchTab: function (e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
    if (tab === 'scenic') this.loadScenics();
    else if (tab === 'food') this.loadFoods();
    else if (tab === 'user') this.loadUsers();
  },

  // 加载所有数据
  loadData: function () {
    this.loadScenics();
    this.loadFoods();
    this.loadUsers();
  },

  // 加载景区
  loadScenics: function () {
    db.collection('scenics').get().then(res => {
      this.setData({ scenicList: res.data });
    }).catch(err => console.log('加载景区失败', err));
  },

  // 加载美食
  loadFoods: function () {
    db.collection('foods').get().then(res => {
      this.setData({ foodList: res.data });
    }).catch(err => console.log('加载美食失败', err));
  },

  // 加载用户
  loadUsers: function () {
    db.collection('users').get().then(res => {
      this.setData({ userList: res.data });
    }).catch(err => console.log('加载用户失败', err));
  },

  // 加载统计
  loadStats: function () {
    const that = this;
    Promise.all([
      db.collection('scenics').count(),
      db.collection('foods').count(),
      db.collection('users').count(),
      db.collection('favorites').count(),
    ]).then(([scenic, food, user, favorite]) => {
      that.setData({
        stats: {
          scenicCount: scenic.total,
          foodCount: food.total,
          userCount: user.total,
          favoriteCount: favorite.total,
        }
      });
    }).catch(err => console.log('加载统计失败', err));
  },

  // 显示添加对话框
  showAddDialog: function () {
    this.setData({
      showDialog: true,
      dialogType: 'add',
      dialogData: {},
      formData: {
        name: '',
        location: '',
        description: '',
        image: '',
        shop: '',
        price: '',
      },
    });
  },

  // 显示编辑对话框
  showEditDialog: function (e) {
    const id = e.currentTarget.dataset.id;
    const list = this.data.activeTab === 'scenic' ? this.data.scenicList : this.data.foodList;
    const item = list.find(i => i._id === id);
    if (item) {
      this.setData({
        showDialog: true,
        dialogType: 'edit',
        dialogData: item,
        formData: { ...item },
      });
    }
  },

  // 关闭对话框
  closeDialog: function () {
    this.setData({ showDialog: false });
  },

  // 表单输入
  onFormInput: function (e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`formData.${field}`]: e.detail.value,
    });
  },

  // 保存（添加或更新）
  saveItem: function () {
    const { activeTab, dialogType, formData, dialogData } = this.data;
    const collection = activeTab === 'scenic' ? 'scenics' : 'foods';

    // 简单验证
    if (!formData.name) {
      wx.showToast({ title: '请输入名称', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    if (dialogType === 'add') {
      const data = {
        ...formData,
        createTime: new Date(),
        updateTime: new Date(),
      };
      db.collection(collection).add({ data }).then(() => {
        wx.showToast({ title: '添加成功', icon: 'success' });
        this.closeDialog();
        this.loadData();
        this.loadStats();
      }).catch(err => {
        wx.showToast({ title: '添加失败', icon: 'none' });
        console.log(err);
      }).finally(() => {
        this.setData({ loading: false });
      });
    } else {
      const data = {
        ...formData,
        updateTime: new Date(),
      };
      db.collection(collection).doc(dialogData._id).update({ data }).then(() => {
        wx.showToast({ title: '更新成功', icon: 'success' });
        this.closeDialog();
        this.loadData();
        this.loadStats();
      }).catch(err => {
        wx.showToast({ title: '更新失败', icon: 'none' });
        console.log(err);
      }).finally(() => {
        this.setData({ loading: false });
      });
    }
  },

  // 删除
  deleteItem: function (e) {
    const id = e.currentTarget.dataset.id;
    const collection = this.data.activeTab === 'scenic' ? 'scenics' : 'foods';

    wx.showModal({
      title: '提示',
      content: '确定要删除吗？',
      success: (res) => {
        if (res.confirm) {
          db.collection(collection).doc(id).remove().then(() => {
            wx.showToast({ title: '删除成功', icon: 'success' });
            this.loadData();
            this.loadStats();
          }).catch(err => {
            wx.showToast({ title: '删除失败', icon: 'none' });
            console.log(err);
          });
        }
      },
    });
  },

  // 删除用户
  deleteUser: function (e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '提示',
      content: '确定要删除该用户吗？',
      success: (res) => {
        if (res.confirm) {
          db.collection('users').doc(id).remove().then(() => {
            wx.showToast({ title: '删除成功', icon: 'success' });
            this.loadUsers();
            this.loadStats();
          }).catch(err => {
            wx.showToast({ title: '删除失败', icon: 'none' });
            console.log(err);
          });
        }
      },
    });
  },
});