// pages/home/home.js
const app = getApp();

// 每次刷新展示的卡片数量
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

  // ===== 从云数据库加载所有景区，然后随机取一部分 =====
  async loadSceneries() {
    if (this.data.loadingSceneries) return;
    this.setData({ loadingSceneries: true });
    try {
      const db = wx.cloud.database();
      // 获取尽可能多的数据（如果数据量很大，可分批获取，这里取前50条）
      const res = await db.collection('sceneries')
        .limit(60).get();
      
      let list = res.data || [];
      if (list.length === 0) {
        // 若数据库无数据，使用模拟数据
        list = this.getMockSceneries();
      }
      
      // 随机打乱数组
      const shuffled = this.shuffleArray(list);
      // 截取前 DISPLAY_COUNT 条
      const selected = shuffled.slice(0, DISPLAY_COUNT);
      this.setData({ sceneries: selected });
      
      console.log(`景区加载成功，共 ${list.length} 条，随机展示 ${selected.length} 条`);
    } catch (err) {
      console.error('加载景区失败', err);
      wx.showToast({ title: '加载景区失败', icon: 'none' });
      // 保底模拟数据
      const mock = this.getMockSceneries();
      const shuffled = this.shuffleArray(mock);
      this.setData({ sceneries: shuffled.slice(0, DISPLAY_COUNT) });
    } finally {
      this.setData({ loadingSceneries: false });
    }
  },

  // ===== 从云数据库加载所有美食，随机取一部分 =====
  async loadFoods() {
    if (this.data.loadingFoods) return;
    this.setData({ loadingFoods: true });
    try {
      const db = wx.cloud.database();
      const res = await db.collection('foods')
        .limit(50).get();
      
      let list = res.data || [];
      if (list.length === 0) {
        list = this.getMockFoods();
      }
      
      const shuffled = this.shuffleArray(list);
      const selected = shuffled.slice(0, DISPLAY_COUNT);
      this.setData({ foods: selected });
      
      console.log(`美食加载成功，共 ${list.length} 条，随机展示 ${selected.length} 条`);
    } catch (err) {
      console.error('加载美食失败', err);
      wx.showToast({ title: '加载美食失败', icon: 'none' });
      const mock = this.getMockFoods();
      const shuffled = this.shuffleArray(mock);
      this.setData({ foods: shuffled.slice(0, DISPLAY_COUNT) });
    } finally {
      this.setData({ loadingFoods: false });
    }
  },

  // ===== 工具函数：随机打乱数组（Fisher–Yates） =====
  shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  },

  // ===== 刷新按钮（带加载提示，并显示更新条数） =====
  refreshSceneries() {
    wx.showLoading({ title: '刷新景区...' });
    this.loadSceneries().then(() => {
      wx.hideLoading();
      const count = this.data.sceneries.length;
      wx.showToast({ title: `已刷新 ${count} 个景区`, icon: 'success' });
    });
  },

  refreshFoods() {
    wx.showLoading({ title: '刷新美食...' });
    this.loadFoods().then(() => {
      wx.hideLoading();
      const count = this.data.foods.length;
      wx.showToast({ title: `已刷新 ${count} 个美食`, icon: 'success' });
    });
  },

  // // ===== 模拟数据（保底） =====
  // getMockSceneries() {
  //   return [
  //     { id: 1, name: '九寨沟', level: '5A', city: '阿坝', description: '人间仙境，童话世界', image: 'https://picsum.photos/400/300?random=1', ticket_price: 169, rating: 4.9 },
  //     { id: 2, name: '峨眉山', level: '5A', city: '乐山', description: '佛教圣地，云海金顶', image: 'https://picsum.photos/400/300?random=2', ticket_price: 160, rating: 4.8 },
  //     { id: 3, name: '都江堰', level: '5A', city: '成都', description: '千年水利工程', image: 'https://picsum.photos/400/300?random=3', ticket_price: 80, rating: 4.7 },
  //     { id: 4, name: '青城山', level: '4A', city: '成都', description: '道教名山，幽甲天下', image: 'https://picsum.photos/400/300?random=4', ticket_price: 90, rating: 4.6 },
  //     { id: 5, name: '乐山大佛', level: '5A', city: '乐山', description: '世界最大石刻佛像', image: 'https://picsum.photos/400/300?random=5', ticket_price: 80, rating: 4.8 },
  //     { id: 6, name: '稻城亚丁', level: '4A', city: '甘孜', description: '蓝色星球最后一片净土', image: 'https://picsum.photos/400/300?random=6', ticket_price: 146, rating: 4.9 },
  //   ];
  // },

  // getMockFoods() {
  //   return [
  //     { id: 1, name: '成都火锅', category: '火锅', city: '成都', description: '麻辣鲜香，回味无穷', image: 'https://picsum.photos/400/300?random=10', avg_price: 80, rating: 4.9 },
  //     { id: 2, name: '担担面', category: '小吃', city: '成都', description: '川味经典，百吃不厌', image: 'https://picsum.photos/400/300?random=11', avg_price: 15, rating: 4.6 },
  //     { id: 3, name: '钵钵鸡', category: '小吃', city: '乐山', description: '冷吃串串，麻辣鲜香', image: 'https://picsum.photos/400/300?random=12', avg_price: 40, rating: 4.7 },
  //     { id: 4, name: '三大炮', category: '小吃', city: '成都', description: '传统名小吃，香甜软糯', image: 'https://picsum.photos/400/300?random=13', avg_price: 20, rating: 4.5 },
  //   ];
  // },

  // ===== 跳转事件 =====
  goToScenic(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/scenic/scenic?id=${id}` });
  },

  goToFood(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/food/food?id=${id}` });
  },

  goToRecommend() {
    wx.switchTab({ url: '/pages/recommend/recommend' });
  },

  goToFavorites() {
    if (!app.globalData.token) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    wx.navigateTo({ url: '/pages/favorites/favorites' });
  },

  goToHistory() {
    if (!app.globalData.token) {
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    wx.navigateTo({ url: '/pages/history/history' });
  }
});