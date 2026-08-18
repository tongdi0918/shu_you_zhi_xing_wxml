// pages/home/home.js
const app = getApp();
const DISPLAY_COUNT = 6; // 每批显示的卡片数量

Page({
  data: {
    isLogin: false,
    sceneries: [],
    foods: [],
    loadingSceneries: false,
    loadingFoods: false,
    // 新增：提示信息
    sceneryTip: '',
    foodTip: ''
  },

  onShow() {
    this.setData({ isLogin: !!app.globalData.token });
    this.loadSceneries();
    this.loadFoods();
  },

  // ===== 跳转景区详情 =====
  goToScenic(e) {
    const id = e.currentTarget.dataset.id;
    if (id) {
      wx.navigateTo({ url: `/pages/scenic/scenic?id=${id}` });
    }
  },

  // ===== 跳转美食详情 =====
  goToFood(e) {
    const id = e.currentTarget.dataset.id;
    if (id) {
      wx.navigateTo({ url: `/pages/food/food?id=${id}` });
    }
  },

  // ===== 从云数据库加载景区（含“已阅不重复”逻辑） =====
  async loadSceneries() {
    if (this.data.loadingSceneries) return;
    this.setData({ loadingSceneries: true, sceneryTip: '' });

    try {
      const db = wx.cloud.database();
      // 获取全部景区数据（仅使用云数据库，无模拟数据）
      const res = await db.collection('sceneries').limit(1000).get();
      const allData = res.data || [];

      if (allData.length === 0) {
        this.setData({ sceneries: [], sceneryTip: '暂无景区数据' });
        return;
      }

      // 获取已显示的景区ID列表
      const viewedIds = wx.getStorageSync('viewedSceneries') || [];
      // 过滤掉已显示的
      const available = allData.filter(item => !viewedIds.includes(item._id));

      let selected = [];
      if (available.length === 0) {
        // 所有景区都已浏览过，重置已显示列表，重新开始
        wx.setStorageSync('viewedSceneries', []);
        // 从全部数据中重新选取
        const shuffled = this.shuffleArray(allData);
        selected = shuffled.slice(0, DISPLAY_COUNT);
        this.setData({ sceneryTip: '已浏览完所有景区，重新开始' });
      } else {
        // 从剩余数据中随机选取
        const shuffled = this.shuffleArray(available);
        selected = shuffled.slice(0, Math.min(DISPLAY_COUNT, available.length));
        if (available.length < DISPLAY_COUNT) {
          this.setData({ sceneryTip: '剩余景区不足，即将开始新一轮' });
        }
      }

      // 更新已显示列表
      const newViewedIds = selected.map(item => item._id);
      const updatedViewedIds = [...wx.getStorageSync('viewedSceneries') || [], ...newViewedIds];
      wx.setStorageSync('viewedSceneries', updatedViewedIds);

      this.setData({ sceneries: selected });
    } catch (err) {
      console.error('加载景区失败', err);
      wx.showToast({ title: '加载景区失败，请重试', icon: 'none' });
    } finally {
      this.setData({ loadingSceneries: false });
    }
  },

  // ===== 从云数据库加载美食（含“已阅不重复”逻辑） =====
  async loadFoods() {
    if (this.data.loadingFoods) return;
    this.setData({ loadingFoods: true, foodTip: '' });

    try {
      const db = wx.cloud.database();
      // 获取全部美食数据（仅使用云数据库，无模拟数据）
      const res = await db.collection('foods').limit(1000).get();
      const allData = res.data || [];

      if (allData.length === 0) {
        this.setData({ foods: [], foodTip: '暂无美食数据' });
        return;
      }

      // 获取已显示的美食ID列表
      const viewedIds = wx.getStorageSync('viewedFoods') || [];
      // 过滤掉已显示的
      const available = allData.filter(item => !viewedIds.includes(item._id));

      let selected = [];
      if (available.length === 0) {
        // 所有美食都已浏览过，重置已显示列表，重新开始
        wx.setStorageSync('viewedFoods', []);
        const shuffled = this.shuffleArray(allData);
        selected = shuffled.slice(0, DISPLAY_COUNT);
        this.setData({ foodTip: '已浏览完所有美食，重新开始' });
      } else {
        const shuffled = this.shuffleArray(available);
        selected = shuffled.slice(0, Math.min(DISPLAY_COUNT, available.length));
        if (available.length < DISPLAY_COUNT) {
          this.setData({ foodTip: '剩余美食不足，即将开始新一轮' });
        }
      }

      // 更新已显示列表
      const newViewedIds = selected.map(item => item._id);
      const updatedViewedIds = [...wx.getStorageSync('viewedFoods') || [], ...newViewedIds];
      wx.setStorageSync('viewedFoods', updatedViewedIds);

      this.setData({ foods: selected });
    } catch (err) {
      console.error('加载美食失败', err);
      wx.showToast({ title: '加载美食失败，请重试', icon: 'none' });
    } finally {
      this.setData({ loadingFoods: false });
    }
  },

  // ===== 工具：随机打乱数组 =====
  shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  },

  // ===== 刷新景区（换一批） =====
  refreshSceneries() {
    wx.showLoading({ title: '刷新景区...' });
    this.loadSceneries().then(() => {
      wx.hideLoading();
      wx.showToast({
        title: `已刷新 ${this.data.sceneries.length} 个景区`,
        icon: 'success'
      });
    });
  },

  // ===== 刷新美食（换一批） =====
  refreshFoods() {
    wx.showLoading({ title: '刷新美食...' });
    this.loadFoods().then(() => {
      wx.hideLoading();
      wx.showToast({
        title: `已刷新 ${this.data.foods.length} 个美食`,
        icon: 'success'
      });
    });
  }
});