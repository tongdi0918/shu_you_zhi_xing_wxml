// pages/profile/profile.js
const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    // 用户信息
    isLoggedIn: false,
    userInfo: null,
    userCity: '未设置',
    isAdmin: false,
    // 打卡数据
    currentTab: 0, // 0: 景点打卡, 1: 美食打卡
    scenicList: [],
    foodList: [],
    scenicCheckedCount: 0,
    foodCheckedCount: 0,
    totalCheckedCount: 0,
    loading: false
  },

  onShow() {
    this.loadUserData();
  },

  // ===== 加载用户数据 =====
  loadUserData() {
    const isLoggedIn = app.globalData.isLoggedIn || false;
    const userInfo = app.globalData.userInfo || null;
    const userCity = app.globalData.userCity || '未设置';
    const isAdmin = app.globalData.isAdmin || false;
    this.setData({ isLoggedIn, userInfo, userCity, isAdmin });
    if (isLoggedIn) {
      this.loadCheckinData();
    } else {
      // 未登录时清空打卡数据
      this.setData({
        scenicList: [],
        foodList: [],
        scenicCheckedCount: 0,
        foodCheckedCount: 0,
        totalCheckedCount: 0
      });
    }
  },

  // ===== 加载打卡数据（从云数据库） =====
  async loadCheckinData() {
    if (!this.data.isLoggedIn || !app.globalData.userInfo) {
      return;
    }
    this.setData({ loading: true });
    const userId = app.globalData.userInfo._id;

    try {
      // 并行获取所有景点、美食和打卡记录
      const [scenicRes, foodRes, checkinRes] = await Promise.all([
        db.collection('sceneries').get(),
        db.collection('foods').get(),
        db.collection('checkins').where({ userId }).get()
      ]);

      // 构建打卡映射表 { 'scenic_xxx': true, 'food_xxx': true }
      const checkinMap = {};
      checkinRes.data.forEach(item => {
        const key = item.type + '_' + item.targetId;
        checkinMap[key] = true;
      });

      // 处理景点列表：标记是否已打卡
      const scenicList = scenicRes.data.map(item => ({
        ...item,
        checked: !!checkinMap['scenic_' + item._id]
      }));

      // 处理美食列表：标记是否已打卡
      const foodList = foodRes.data.map(item => ({
        ...item,
        checked: !!checkinMap['food_' + item._id]
      }));

      // 统计打卡个数
      const scenicCheckedCount = scenicList.filter(item => item.checked).length;
      const foodCheckedCount = foodList.filter(item => item.checked).length;
      const totalCheckedCount = scenicCheckedCount + foodCheckedCount;

      this.setData({
        scenicList,
        foodList,
        scenicCheckedCount,
        foodCheckedCount,
        totalCheckedCount,
        loading: false
      });
    } catch (err) {
      console.error('加载打卡数据失败', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载数据失败………', icon: 'none' });
    }
  },

  // ===== 切换标签页 =====
  switchTab(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.setData({ currentTab: index });
  },

  // ===== 切换打卡状态（点击卡片） =====
  async toggleCheckin(e) {
    if (!this.data.isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    const { id, type } = e.currentTarget.dataset;
    const userId = app.globalData.userInfo._id;
    const listKey = type === 'scenic' ? 'scenicList' : 'foodList';
    const list = this.data[listKey];
    const item = list.find(i => i._id === id);
    if (!item) return;

    const isChecked = item.checked;

    try {
      if (isChecked) {
        // 取消打卡：查询并删除打卡记录
        const res = await db.collection('checkins').where({
          userId,
          targetId: id,
          type
        }).get();
        if (res.data.length > 0) {
          await db.collection('checkins').doc(res.data[0]._id).remove();
        }
        wx.showToast({ title: '已取消打卡', icon: 'none' });
      } else {
        // 打卡：添加打卡记录
        await db.collection('checkins').add({
          data: {
            userId,
            targetId: id,
            type,
            createTime: new Date()
          }
        });
        wx.showToast({ title: '打卡成功！', icon: 'success' });
      }

      // 更新本地数据
      item.checked = !isChecked;
      this.setData({ [listKey]: list });
      this.updateCounts();
    } catch (err) {
      console.error('切换打卡状态失败', err);
      wx.showToast({ title: '操作失败，请重试', icon: 'none' });
    }
  },

  // ===== 更新打卡统计 =====
  updateCounts() {
    const scenicCheckedCount = this.data.scenicList.filter(item => item.checked).length;
    const foodCheckedCount = this.data.foodList.filter(item => item.checked).length;
    this.setData({
      scenicCheckedCount,
      foodCheckedCount,
      totalCheckedCount: scenicCheckedCount + foodCheckedCount
    });
  },

  // ===== 跳转登录 =====
  goToLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  // ===== 跳转注册 =====
  goToRegister() {
    wx.navigateTo({ url: '/pages/register/register' });
  },

  // ===== 设置城市 =====
  setCity() {
    if (!this.data.isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '设置城市',
      editable: true,
      placeholderText: '请输入您所在的城市',
      success: (res) => {
        if (res.confirm && res.content) {
          const city = res.content.trim();
          if (city) {
            app.globalData.userCity = city;
            this.setData({ userCity: city });
            wx.showToast({ title: '设置成功', icon: 'success' });
          }
        }
      }
    });
  },

  // ===== 跳转收藏 =====
  goToFavorites() {
    if (!this.data.isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/favorites/favorites' });
  },

  // ===== 跳转浏览历史 =====
  goToHistory() {
    if (!this.data.isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/history/history' });
  },

  // ===== 跳转管理后台 =====
  goToAdmin() {
    if (!this.data.isAdmin) {
      wx.showToast({ title: '无权限', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/dashboard/dashboard' });
  },

  // ===== 关于我们 =====
  showAbout() {
    wx.showModal({
      title: '关于蜀游智行',
      content: '蜀游智行 —-— 记录你的每一次旅行足迹',
      showCancel: false
    });
  },

  // ===== 退出登录 =====
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          app.globalData.isLoggedIn = false;
          app.globalData.userInfo = null;
          this.setData({
            isLoggedIn: false,
            userInfo: null,
            scenicList: [],
            foodList: [],
            scenicCheckedCount: 0,
            foodCheckedCount: 0,
            totalCheckedCount: 0
          });
          wx.showToast({ title: '已退出', icon: 'success' });
        }
      }
    });
  }
});