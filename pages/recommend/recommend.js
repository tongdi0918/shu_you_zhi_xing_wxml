// pages/recommend/recommend.js
const app = getApp();

Page({
  data: {
    // 用户位置
    userLocation: { city: '未设置', latitude: 0, longitude: 0 },
    // 四川城市列表
    cityList: ['全部', '成都', '乐山', '阿坝', '绵阳', '宜宾', '自贡', '泸州', '德阳', '广元', '遂宁', '内江', '资阳', '眉山', '雅安', '巴中', '达州', '南充', '广安', '攀枝花', '凉山'],
    selectedCityIndex: 0,
    selectedCity: '全部',
    // Tab切换
    activeTab: 'scenic', // 'scenic' | 'food'
    // 数据源
    allSceneries: [],
    allFoods: [],
    filteredSceneries: [],
    filteredFoods: [],
    // 当前展示列表（带选中状态）
    displayList: [],
    // 已选列表
    selectedList: [],
    // 行程方案（按城市分组）
    planData: [],
    // 加载状态
    loading: false
  },

  onShow() {
    this.getUserLocation();
    this.loadAllData();
  },

  // ===== 获取用户位置（从个人中心） =====
  getUserLocation() {
    const location = app.globalData.userLocation;
    if (location && location.city && location.city !== '未设置') {
      this.setData({ userLocation: location });
      // 自动定位到用户所在城市
      const cityIndex = this.data.cityList.indexOf(location.city);
      if (cityIndex > -1) {
        this.setData({
          selectedCityIndex: cityIndex,
          selectedCity: location.city
        });
        if (this.data.allSceneries.length > 0 || this.data.allFoods.length > 0) {
          this.filterData();
        }
      }
    } else {
      // 从云数据库获取用户位置
      this.fetchUserLocationFromDB();
    }
  },

  // ===== 从云数据库获取用户位置 =====
  async fetchUserLocationFromDB() {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('users').where({
        _openid: '{openid}'
      }).get();
      if (res.data.length > 0 && res.data[0].location) {
        const location = res.data[0].location;
        app.globalData.userLocation = location;
        this.setData({ userLocation: location });
        const cityIndex = this.data.cityList.indexOf(location.city);
        if (cityIndex > -1) {
          this.setData({
            selectedCityIndex: cityIndex,
            selectedCity: location.city
          });
          if (this.data.allSceneries.length > 0 || this.data.allFoods.length > 0) {
            this.filterData();
          }
        }
      }
    } catch (err) {
      console.error('获取用户位置失败', err);
    }
  },

  // ===== 加载全部数据（仅云数据库） =====
  async loadAllData() {
    this.setData({ loading: true });
    try {
      const db = wx.cloud.database();
      const [scenicRes, foodRes] = await Promise.all([
        db.collection('sceneries').limit(200).get(),
        db.collection('foods').limit(200).get()
      ]);
      this.setData({
        allSceneries: scenicRes.data || [],
        allFoods: foodRes.data || []
      });
      this.filterData();
    } catch (err) {
      console.error('云数据库加载失败', err);
      wx.showToast({
        title: '加载数据失败，请检查网络',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // ===== 按城市筛选数据 =====
  filterData() {
    const { allSceneries, allFoods, selectedCity } = this.data;
    let filteredSceneries = [];
    let filteredFoods = [];

    if (selectedCity === '全部') {
      filteredSceneries = allSceneries.map(item => ({ ...item, type: 'scenic', checked: false }));
      filteredFoods = allFoods.map(item => ({ ...item, type: 'food', checked: false }));
    } else {
      filteredSceneries = allSceneries
        .filter(item => item.city && item.city.includes(selectedCity))
        .map(item => ({ ...item, type: 'scenic', checked: false }));
      filteredFoods = allFoods
        .filter(item => item.city && item.city.includes(selectedCity))
        .map(item => ({ ...item, type: 'food', checked: false }));
    }

    this.setData({ filteredSceneries, filteredFoods });
    this.updateDisplayList();
  },

  // ===== 更新展示列表（恢复选中状态） =====
  updateDisplayList() {
    const { activeTab, filteredSceneries, filteredFoods, selectedList } = this.data;
    const selectedIds = new Set(selectedList.map(item => item._id));
    let list = activeTab === 'scenic' ? filteredSceneries : filteredFoods;
    list = list.map(item => ({
      ...item,
      checked: selectedIds.has(item._id)
    }));
    this.setData({ displayList: list });
  },

  // ===== 城市下拉选择事件 =====
  onCityChange(e) {
    const index = e.detail.value;
    const city = this.data.cityList[index];
    this.setData({
      selectedCityIndex: index,
      selectedCity: city,
      selectedList: [],
      planData: []
    });
    this.filterData();
  },

  // ===== Tab切换 =====
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
    this.updateDisplayList();
  },

  // ===== 卡片点击（多选切换） =====
  toggleCard(e) {
    const id = e.currentTarget.dataset.id;
    const { displayList, selectedList } = this.data;
    const card = displayList.find(item => item._id === id);
    if (!card) return;

    const newChecked = !card.checked;
    const newDisplayList = displayList.map(item => {
      if (item._id === id) {
        return { ...item, checked: newChecked };
      }
      return item;
    });

    let newSelectedList = [...selectedList];
    if (newChecked) {
      newSelectedList.push({
        _id: card._id,
        name: card.name,
        city: card.city,
        type: card.type,
        level: card.level || '',
        category: card.category || '',
        price: card.type === 'scenic' ? card.ticket_price : card.avg_price
      });
    } else {
      newSelectedList = newSelectedList.filter(item => item._id !== id);
    }

    this.setData({
      displayList: newDisplayList,
      selectedList: newSelectedList
    });
  },

  // ===== 清空所有选择 =====
  clearAll() {
    this.setData({
      selectedList: [],
      planData: []
    });
    this.updateDisplayList();
    wx.showToast({
      title: '已清空所有选择',
      icon: 'success'
    });
  },

  // ===== 生成行程方案 =====
  generatePlan() {
    const { selectedList } = this.data;
    if (selectedList.length === 0) {
      wx.showToast({
        title: '请至少选择一个景点或美食',
        icon: 'none'
      });
      return;
    }
    // 按城市分组
    const cityMap = {};
    selectedList.forEach(item => {
      const city = item.city || '未知';
      if (!cityMap[city]) {
        cityMap[city] = [];
      }
      cityMap[city].push(item);
    });
    const planData = Object.keys(cityMap).map(city => ({
      city,
      items: cityMap[city]
    }));
    this.setData({ planData });
    wx.showToast({
      title: `已生成 ${planData.length} 个城市的行程方案`,
      icon: 'success'
    });
  }
});