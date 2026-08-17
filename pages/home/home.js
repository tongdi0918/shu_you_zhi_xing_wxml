// pages/home/home.js
const app = getApp();
const DISPLAY_COUNT = 6;

Page({
  data: {
    isLogin: false,
    sceneries: [],
    foods: [],
    loadingSceneries: false,
    loadingFoods: false
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

  // ===== 从云数据库加载景区 =====
  async loadSceneries() {
    if (this.data.loadingSceneries) return;
    this.setData({ loadingSceneries: true });
    try {
      const db = wx.cloud.database();
      const res = await db.collection('sceneries').limit(1000).get();
      let list = res.data || [];
      const shuffled = this.shuffleArray(list);
      const selected = shuffled.slice(0, DISPLAY_COUNT);
      this.setData({ sceneries: selected });
    } catch (err) {
      console.error('加载景区失败', err);
      const mock = this.getMockSceneries();
      const shuffled = this.shuffleArray(mock);
      this.setData({ sceneries: shuffled.slice(0, DISPLAY_COUNT) });
    } finally {
      this.setData({ loadingSceneries: false });
    }
  },

  // ===== 从云数据库加载美食 =====
  async loadFoods() {
    if (this.data.loadingFoods) return;
    this.setData({ loadingFoods: true });
    try {
      const db = wx.cloud.database();
      const res = await db.collection('foods').limit(1000).get();
      let list = res.data || [];
      const shuffled = this.shuffleArray(list);
      const selected = shuffled.slice(0, DISPLAY_COUNT);
      this.setData({ foods: selected });
    } catch (err) {
      console.error('加载美食失败', err);
      const mock = this.getMockFoods();
      const shuffled = this.shuffleArray(mock);
      this.setData({ foods: shuffled.slice(0, DISPLAY_COUNT) });
    } finally {
      this.setData({ loadingFoods: false });
    }
  },

  shuffleArray(arr) {       //随机打乱顺序
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  },

  refreshSceneries() {
    wx.showLoading({ title: '刷新景区...' });
    this.loadSceneries().then(() => {
      wx.hideLoading();
      wx.showToast({ title: `已刷新 ${this.data.sceneries.length} 个景区`, icon: 'success' });
    });
  },

  refreshFoods() {
    wx.showLoading({ title: '刷新美食...' });
    this.loadFoods().then(() => {
      wx.hideLoading();
      wx.showToast({ title: `已刷新 ${this.data.foods.length} 个美食`, icon: 'success' });
    });
  }
});