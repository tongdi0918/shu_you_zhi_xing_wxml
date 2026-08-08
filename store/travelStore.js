// 对应原项目的 travelStore.js[reference:5]
const app = getApp();

class TravelStore {
  constructor() {
    this.sceneries = [];
    this.foods = [];
    this.recommendScenery = [];
    this.recommendFood = [];
    this.loading = false;
  }

  async loadSceneries(params = {}) {
    this.loading = true;
    try {
      const res = await wx.request({
        url: `${app.globalData.apiBase}/api/sceneries`,
        method: 'GET',
        data: params
      });
      this.sceneries = res.data.data || [];
    } catch (e) {
      console.error('加载景区失败', e);
    }
    this.loading = false;
  }

  async loadFoods(params = {}) {
    this.loading = true;
    try {
      const res = await wx.request({
        url: `${app.globalData.apiBase}/api/foods`,
        method: 'GET',
        data: params
      });
      this.foods = res.data.data || [];
    } catch (e) {
      console.error('加载美食失败', e);
    }
    this.loading = false;
  }

  async loadRecommend() {
    this.loading = true;
    try {
      const res = await wx.request({
        url: `${app.globalData.apiBase}/api/recommend`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${wx.getStorageSync('token') || ''}`
        }
      });
      if (res.data.code === 0) {
        this.recommendScenery = res.data.data.scenery || [];
        this.recommendFood = res.data.data.food || [];
      }
    } catch (e) {
      console.error('加载推荐失败', e);
    }
    this.loading = false;
  }

  async refreshSceneries(params = {}) {
    await this.loadSceneries(params);
    return this.sceneries;
  }

  async refreshFoods(params = {}) {
    await this.loadFoods(params);
    return this.foods;
  }

  async refreshRecommend() {
    await this.loadRecommend();
    return { scenery: this.recommendScenery, food: this.recommendFood };
  }
}

const travelStore = new TravelStore();
export default travelStore;