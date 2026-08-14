// pages/recommend/recommend.js
const app = getApp();

// 引入高德地图 SDK（确保 amap-wx.js 放在 libs 目录下）
const AMap = require('../../libs/amap-wx.js');

Page({
  data: {
    currentCity: '定位中...',
    cityList: ['全部', '成都', '乐山', '阿坝', '绵阳', '宜宾', '自贡', '泸州', '德阳', '广元'],
    selectedCity: '全部',
    activeTab: 'scenic',
    allSceneries: [],
    allFoods: [],
    filteredSceneries: [],
    filteredFoods: [],
    itineraryData: [],
    loading: false
  },

  onShow() {
    this.getLocation();
    this.loadAllData();
  },

  // ===== 获取当前位置 =====
  getLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.reverseGeocode(res.latitude, res.longitude);
      },
      fail: () => {
        // 定位失败，使用默认城市
        this.setData({ currentCity: '成都市' });
        this.filterByCity('成都市');
        this.generateItinerary();
      }
    });
  },

  // ===== 高德逆地理编码 =====
  reverseGeocode(lat, lng) {
    const myAmap = new AMap({
      key: '68ff2afb0b6d70f0a6970b71737729a6'  // 请替换为真实Key
    });

    myAmap.getRegeo({
      location: `${lng},${lat}`,   // 注意顺序：经度,纬度
      success: (res) => {
        const data = res[0];
        if (data && data.regeocodeData) {
          const city = data.regeocodeData.addressComponent.city ||
                       data.regeocodeData.addressComponent.province ||
                       '成都市';
          this.setData({ currentCity: city.replace('市', '') });
          this.filterByCity(this.data.currentCity);
          this.generateItinerary();
        } else {
          this.setData({ currentCity: '成都市' });
          this.filterByCity('成都市');
          this.generateItinerary();
        }
      },
      fail: (err) => {
        console.error('高德逆地理编码失败', err);
        this.setData({ currentCity: '成都市' });
        this.filterByCity('成都市');
        this.generateItinerary();
      }
    });
  },

  // ===== 加载全部数据（云数据库或模拟） =====
  async loadAllData() {
    this.setData({ loading: true });
    try {
      const db = wx.cloud.database();
      const [scenicRes, foodRes] = await Promise.all([
        db.collection('sceneries').limit(100).get(),
        db.collection('foods').limit(100).get()
      ]);
      this.setData({
        allSceneries: scenicRes.data || [],
        allFoods: foodRes.data || []
      });
      this.filterByCity(this.data.currentCity || '成都市');
      this.generateItinerary();
    } catch (err) {
      console.error('云数据库加载失败，使用模拟数据', err);
      const mockSceneries = this.getMockSceneries();
      const mockFoods = this.getMockFoods();
      this.setData({
        allSceneries: mockSceneries,
        allFoods: mockFoods
      });
      this.filterByCity(this.data.currentCity || '成都市');
      this.generateItinerary();
    } finally {
      this.setData({ loading: false });
    }
  },

  // ===== 按城市筛选（个性化推荐） =====
  filterByCity(city) {
    const { allSceneries, allFoods, selectedCity } = this.data;
    const targetCity = selectedCity === '全部' ? city : selectedCity;

    let filteredSceneries = allSceneries.filter(item => {
      if (selectedCity === '全部') {
        return item.city && item.city.includes(city.replace('市', ''));
      }
      return item.city && item.city.includes(targetCity.replace('市', ''));
    });

    let filteredFoods = allFoods.filter(item => {
      if (selectedCity === '全部') {
        return item.city && item.city.includes(city.replace('市', ''));
      }
      return item.city && item.city.includes(targetCity.replace('市', ''));
    });

    // 按评分排序（个性化推荐）
    filteredSceneries.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    filteredFoods.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    // 限制显示数量
    filteredSceneries = filteredSceneries.slice(0, 8);
    filteredFoods = filteredFoods.slice(0, 8);

    this.setData({
      filteredSceneries,
      filteredFoods
    });
  },

  // ===== 生成专属行程规划（按城市分组） =====
  generateItinerary() {
    const { allSceneries, allFoods, currentCity } = this.data;
    const cityMap = {};

    const allItems = [
      ...allSceneries.map(s => ({ ...s, type: 'scenic' })),
      ...allFoods.map(f => ({ ...f, type: 'food' }))
    ];

    allItems.forEach(item => {
      const city = item.city || '四川';
      if (!cityMap[city]) {
        cityMap[city] = [];
      }
      cityMap[city].push(item);
    });

    const itineraryData = Object.keys(cityMap).map(city => {
      const items = cityMap[city]
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 4);
      return { city, items };
    });

    // 当前城市排在最前
    itineraryData.sort((a, b) => {
      if (a.city === currentCity) return -1;
      if (b.city === currentCity) return 1;
      return a.city.localeCompare(b.city);
    });

    this.setData({ itineraryData });
  },

  // ===== 选择城市 =====
  selectCity(e) {
    const city = e.currentTarget.dataset.city;
    this.setData({ selectedCity: city });
    this.filterByCity(this.data.currentCity || '成都市');
    this.generateItinerary();
  },

  // ===== 切换 Tab =====
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  // ===== 刷新推荐 =====
  refreshRecommend() {
    wx.showLoading({ title: '刷新推荐...' });
    this.loadAllData().then(() => {
      wx.hideLoading();
      wx.showToast({ title: '已刷新推荐', icon: 'success' });
    });
  },

  // ===== 跳转详情 =====
  goToScenic(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: `/pages/scenic/scenic?id=${id}` });
  },
  goToFood(e) {
    const id = e.currentTarget.dataset.id;
    if (id) wx.navigateTo({ url: `/pages/food/food?id=${id}` });
  }
});