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
    currentTab: 0,          // 0: 景点打卡, 1: 美食打卡
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
      this.refreshUserCity();
      this.loadCheckinData();
    } else {
      this.setData({
        scenicList: [],
        foodList: [],
        scenicCheckedCount: 0,
        foodCheckedCount: 0,
        totalCheckedCount: 0
      });
    }
  },

  // ===== 从云数据库刷新用户城市 =====
  async refreshUserCity() {
    if (!this.data.isLoggedIn || !app.globalData.userInfo) return;
    const userId = app.globalData.userInfo._id;
    try {
      const res = await db.collection('users').doc(userId).get();
      if (res.data) {
        const city = res.data.city || '未设置';
        app.globalData.userCity = city;
        if (app.globalData.userInfo) {
          app.globalData.userInfo.city = city;
        }
        this.setData({ userCity: city });
      }
    } catch (err) {
      console.error('获取用户城市失败', err);
    }
  },

  // ===== 加载打卡数据（从云数据库 + 云函数获取图片临时链接） =====
  async loadCheckinData() {
    if (!this.data.isLoggedIn || !app.globalData.userInfo) {
      return;
    }
    this.setData({ loading: true });
    const userId = app.globalData.userInfo._id;

    try {
      // 1. 并行获取所有景点、美食和打卡记录
      const [scenicRes, foodRes, checkinRes] = await Promise.all([
        db.collection('sceneries').get(),
        db.collection('foods').get(),
        db.collection('checkins').where({ userId }).get()
      ]);

      // 2. 构建打卡映射表
      const checkinMap = {};
      checkinRes.data.forEach(item => {
        const key = item.type + '_' + item.targetId;
        checkinMap[key] = true;
      });

      // 3. 处理景点列表：标记是否已打卡
      const scenicItems = scenicRes.data.map(item => ({ 
        ...item, 
        checked: !!checkinMap['scenic_' + item._id] 
      }));
      const foodItems = foodRes.data.map(item => ({ 
        ...item, 
        checked: !!checkinMap['food_' + item._id] 
      }));

      // 4. 收集需要换取临时链接的 fileID（注意字段名为 image_url）
      const allFileIds = [];
      scenicItems.forEach(item => {
        if (item.image_url) allFileIds.push(item.image_url);
      });
      foodItems.forEach(item => {
        if (item.image_url) allFileIds.push(item.image_url);
      });

      let tempUrlMap = {};
      if (allFileIds.length > 0) {
        try {
          // 调用云函数 getImages 批量换取临时链接
          const res = await wx.cloud.callFunction({
            name: 'getImages',
            data: { fileList: allFileIds }
          });
          if (res.result && res.result.fileList) {
            res.result.fileList.forEach(item => {
              tempUrlMap[item.fileID] = item.tempFileURL;
            });
          }
        } catch (err) {
          console.error('调用 getImages 云函数失败', err);
        }
      }

      // 5. 将临时链接注入到数据中，使用 imageUrl 字段供页面使用
      const scenicList = scenicItems.map(item => ({
        ...item,
        imageUrl: tempUrlMap[item.image_url] || ''   // 若换取失败则留空，页面会显示默认图
      }));
      const foodList = foodItems.map(item => ({
        ...item,
        imageUrl: tempUrlMap[item.image_url] || ''
      }));

      // 6. 统计打卡个数
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
      wx.showToast({ title: '加载数据失败…', icon: 'none' });
    }
  },

  // ===== 切换标签页 =====
  switchTab(e) {
    const tab = parseInt(e.currentTarget.dataset.tab);
    this.setData({ currentTab: tab });
  },

  // ===== 切换打卡状态 =====
  async toggleCheckin(e) {
    if (!this.data.isLoggedIn) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    const { type, id } = e.currentTarget.dataset;
    const userId = app.globalData.userInfo._id;
    const key = type + '_' + id;
    const listKey = type === 'scenic' ? 'scenicList' : 'foodList';
    const currentList = this.data[listKey];
    const item = currentList.find(i => i._id === id);
    if (!item) return;

    const newChecked = !item.checked;
    try {
      if (newChecked) {
        // 添加打卡记录
        await db.collection('checkins').add({
          data: {
            userId,
            type,
            targetId: id,
            createTime: new Date()
          }
        });
      } else {
        // 删除打卡记录
        const res = await db.collection('checkins').where({
          userId,
          type,
          targetId: id
        }).get();
        if (res.data.length > 0) {
          await db.collection('checkins').doc(res.data[0]._id).remove();
        }
      }
      // 更新本地数据
      const updatedList = currentList.map(i => {
        if (i._id === id) {
          return { ...i, checked: newChecked };
        }
        return i;
      });
      const scenicCheckedCount = (listKey === 'scenicList' ? updatedList : this.data.scenicList).filter(i => i.checked).length;
      const foodCheckedCount = (listKey === 'foodList' ? updatedList : this.data.foodList).filter(i => i.checked).length;
      this.setData({
        [listKey]: updatedList,
        scenicCheckedCount: listKey === 'scenicList' ? scenicCheckedCount : this.data.scenicCheckedCount,
        foodCheckedCount: listKey === 'foodList' ? foodCheckedCount : this.data.foodCheckedCount,
        totalCheckedCount: scenicCheckedCount + foodCheckedCount
      });
    } catch (err) {
      console.error('切换打卡状态失败', err);
      wx.showToast({ title: '操作失败', icon: 'none' });
    }
  },

  // ===== 跳转页面 =====
  goToLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },
  goToRegister() {
    wx.navigateTo({ url: '/pages/register/register' });
  },
  goToFavorites() {
    wx.navigateTo({ url: '/pages/favorites/favorites' });
  },
  goToHistory() {
    wx.navigateTo({ url: '/pages/history/history' });
  },
  goToDashboard() {
    wx.navigateTo({ url: '/pages/dashboard/dashboard' });
  },
  showAbout() {
    wx.showModal({
      title: '产品介绍',
      content: ' @览迹 —— 你的专属川蜀旅行记录者    in 202608 李字雄 for 2.3.0 ',
      showCancel: false
    });
  },
  editCity() {
    wx.showModal({
      title: '设置城市',
      editable: true,
      placeholderText: '请输入城市名称',
      success: async (res) => {
        if (res.confirm && res.content) {
          const city = res.content.trim();
          if (!city) return;
          try {
            const userId = app.globalData.userInfo._id;
            await db.collection('users').doc(userId).update({
              data: { city }
            });
            app.globalData.userCity = city;
            if (app.globalData.userInfo) {
              app.globalData.userInfo.city = city;
            }
            this.setData({ userCity: city });
            wx.showToast({ title: '设置成功', icon: 'success' });
          } catch (err) {
            console.error('更新城市失败', err);
            wx.showToast({ title: '设置失败', icon: 'none' });
          }
        }
      }
    });
  },
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          app.globalData.isLoggedIn = false;
          app.globalData.userInfo = null;
          app.globalData.userCity = '未设置';
          app.globalData.isAdmin = false;
          this.setData({
            isLoggedIn: false,
            userInfo: null,
            userCity: '未设置',
            isAdmin: false,
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