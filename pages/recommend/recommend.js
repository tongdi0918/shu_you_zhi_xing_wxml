const app = getApp();

Page({
  data: { recommendedSceneries: [], recommendedFoods: [], loading: false },
  onShow() { this.loadRecommendations(); },
  async loadRecommendations() {
    this.setData({ loading: true });
    try {
      const db = wx.cloud.database();
      const [scenicRes, foodRes] = await Promise.all([
        db.collection('sceneries').limit(6).get(),
        db.collection('foods').limit(6).get()
      ]);
      this.setData({
        recommendedSceneries: scenicRes.data || [],
        recommendedFoods: foodRes.data || []
      });
    } catch (err) {
      console.error('加载推荐失败', err);
    } finally {
      this.setData({ loading: false });
    }
  },
  refreshRecommend() { this.loadRecommendations(); },
  goToScenic(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/scenic/scenic?id=${id}` });
  },
  goToFood(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/food/food?id=${id}` });
  }
});