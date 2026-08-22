// pages/home/home.js
const app = getApp();
const DISPLAY_COUNT = 6;

Page({
  data: {
    isLogin: false,
    sceneries: [],
    foods: [],
    loadingSceneries: false,
    loadingFoods: false,
    sceneryTip: '',
    foodTip: ''
  },

  onShow() {
    this.setData({ isLogin: !!app.globalData.token });
    this.loadSceneries();
    this.loadFoods();
  },

  goToScenic(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: `/pages/scenic/scenic?id=${id}` });
  },

  goToFood(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: `/pages/food/food?id=${id}` });
  },

  async loadSceneries() {
    if (this.data.loadingSceneries) return;
    this.setData({ loadingSceneries: true, sceneryTip: '' });
    try {
      const db = wx.cloud.database();
      const res = await db.collection('sceneries').limit(1000).get();
      const allData = res.data || [];
      if (allData.length === 0) {
        this.setData({ sceneries: [], sceneryTip: '暂无景区数据' });
        return;
      }
      const viewedIds = wx.getStorageSync('viewedSceneries') || [];
      const available = allData.filter(item => !viewedIds.includes(item._id));
      let selected = [];
      if (available.length === 0) {
        wx.setStorageSync('viewedSceneries', []);
        const shuffled = this.shuffleArray(allData);
        selected = shuffled.slice(0, DISPLAY_COUNT);
        this.setData({ sceneryTip: '已浏览完所有景区，重新开始' });
      } else {
        const shuffled = this.shuffleArray(available);
        selected = shuffled.slice(0, Math.min(DISPLAY_COUNT, available.length));
        if (available.length < DISPLAY_COUNT) {
          this.setData({ sceneryTip: '剩余景区不足，即将开始新一轮' });
        }
      }
      const newViewedIds = selected.map(item => item._id);
      const updatedViewedIds = [...wx.getStorageSync('viewedSceneries') || [], ...newViewedIds];
      wx.setStorageSync('viewedSceneries', updatedViewedIds);
      const itemsWithImages = await this.fetchImages(selected, 'image_url');
      this.setData({ sceneries: itemsWithImages });
    } catch (err) {
      console.error('加载景区失败', err);
      wx.showToast({ title: '加载景区失败，请重试', icon: 'none' });
    } finally {
      this.setData({ loadingSceneries: false });
    }
  },

  async loadFoods() {
    if (this.data.loadingFoods) return;
    this.setData({ loadingFoods: true, foodTip: '' });
    try {
      const db = wx.cloud.database();
      const res = await db.collection('foods').limit(1000).get();
      const allData = res.data || [];
      if (allData.length === 0) {
        this.setData({ foods: [], foodTip: '暂无美食数据' });
        return;
      }
      const viewedIds = wx.getStorageSync('viewedFoods') || [];
      const available = allData.filter(item => !viewedIds.includes(item._id));
      let selected = [];
      if (available.length === 0) {
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
      const newViewedIds = selected.map(item => item._id);
      const updatedViewedIds = [...wx.getStorageSync('viewedFoods') || [], ...newViewedIds];
      wx.setStorageSync('viewedFoods', updatedViewedIds);
      const itemsWithImages = await this.fetchImages(selected, 'image_url');
      this.setData({ foods: itemsWithImages });
    } catch (err) {
      console.error('加载美食失败', err);
      wx.showToast({ title: '加载美食失败，请重试', icon: 'none' });
    } finally {
      this.setData({ loadingFoods: false });
    }
  },

  async fetchImages(items, imageField) {
    if (!items || items.length === 0) return items;
    const fileList = items
      .map(item => item[imageField])
      .filter(url => url && typeof url === 'string' && url.startsWith('cloud://'));
    if (fileList.length === 0) return items;
    try {
      const res = await wx.cloud.callFunction({
        name: 'getImages',
        data: { fileList }
      });
      const tempFileList = res.result?.fileList || [];
      const urlMap = {};
      tempFileList.forEach(item => {
        if (item.fileID) urlMap[item.fileID] = item.tempFileURL || item.fileID;
      });
      return items.map(item => {
        const originalUrl = item[imageField];
        if (originalUrl && urlMap[originalUrl]) {
          return { ...item, [imageField]: urlMap[originalUrl] };
        }
        return item;
      });
    } catch (err) {
      console.error('获取图片临时URL失败', err);
      return items;
    }
  },

  shuffleArray(arr) {
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