// pages/recommend/recommend.js
const app = getApp();

// 四川省21个地级市标准全称 -> 数据库city字段可能出现的简称/别名
const CITY_ALIAS_MAP = {
  '成都市': ['成都市', '成都'],
  '自贡市': ['自贡市', '自贡'],
  '攀枝花市': ['攀枝花市', '攀枝花'],
  '泸州市': ['泸州市', '泸州'],
  '德阳市': ['德阳市', '德阳'],
  '绵阳市': ['绵阳市', '绵阳'],
  '广元市': ['广元市', '广元'],
  '遂宁市': ['遂宁市', '遂宁'],
  '内江市': ['内江市', '内江'],
  '乐山市': ['乐山市', '乐山'],
  '南充市': ['南充市', '南充'],
  '眉山市': ['眉山市', '眉山'],
  '宜宾市': ['宜宾市', '宜宾'],
  '广安市': ['广安市', '广安'],
  '达州市': ['达州市', '达州'],
  '雅安市': ['雅安市', '雅安'],
  '巴中市': ['巴中市', '巴中'],
  '资阳市': ['资阳市', '资阳'],
  '阿坝藏族羌族自治州': ['阿坝州', '阿坝藏族羌族自治州', '阿坝'],
  '甘孜藏族自治州': ['甘孜州', '甘孜藏族自治州', '甘孜'],
  '凉山彝族自治州': ['凉山州', '凉山彝族自治州', '凉山']
};

// 反向映射：简称 -> 标准全称（用于用户位置匹配）
const SHORT_TO_FULL = {};
Object.keys(CITY_ALIAS_MAP).forEach(full => {
  CITY_ALIAS_MAP[full].forEach(short => {
    SHORT_TO_FULL[short] = full;
  });
});

Page({
  data: {
    userLocation: { city: '未设置', latitude: 0, longitude: 0 },
    // 下拉选项：标准全称列表（仅包含有数据的城市）
    cityList: [],
    selectedCityIndex: 0,
    selectedCity: '',      // 选中的标准全称

    activeTab: 'scenic',

    allSceneries: [],
    allFoods: [],

    filteredSceneries: [],
    filteredFoods: [],
    displayList: [],

    selectedList: [],
    planData: [],

    loading: false
  },

  onShow() {
    this.getUserLocation();
    this.loadAllData();
  },

  // ===== 获取用户位置 =====
  getUserLocation() {
    const location = app.globalData.userLocation;
    if (location && location.city && location.city !== '未设置') {
      this.setData({ userLocation: location });
      // 城市列表加载后会自动匹配
    } else {
      this.fetchUserLocationFromDB();
    }
  },

  async fetchUserLocationFromDB() {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('users').where({ _openid: '{openid}' }).get();
      if (res.data.length > 0 && res.data[0].location) {
        const location = res.data[0].location;
        app.globalData.userLocation = location;
        this.setData({ userLocation: location });
      }
    } catch (err) {
      console.error('获取用户位置失败', err);
    }
  },

  // ===== 加载数据并构建城市列表 =====
  async loadAllData() {
    this.setData({ loading: true });
    try {
      const db = wx.cloud.database();
      const [scenicRes, foodRes] = await Promise.all([
        db.collection('sceneries').limit(200).get(),
        db.collection('foods').limit(200).get()
      ]);

      const allSceneries = scenicRes.data;
      const allFoods = foodRes.data;
      this.setData({ allSceneries, allFoods });

      // 从数据中提取所有出现的 city 字段，映射到标准全称，收集有数据的城市
      const citySet = new Set();
      [...allSceneries, ...allFoods].forEach(item => {
        if (item.city) {
          const full = SHORT_TO_FULL[item.city];
          if (full) {
            citySet.add(full);
          } else {
            // 如果 city 无法映射，但本身就是标准全称，也加入
            if (CITY_ALIAS_MAP[item.city]) {
              citySet.add(item.city);
            }
          }
        }
      });

      // 转为数组并排序
      const cityList = Array.from(citySet).sort();
      this.setData({ cityList });

      // 自动匹配用户位置
      let defaultCity = '';
      if (this.data.userLocation.city && this.data.userLocation.city !== '未设置') {
        const userFull = SHORT_TO_FULL[this.data.userLocation.city];
        if (userFull && cityList.includes(userFull)) {
          defaultCity = userFull;
        }
      }
      if (!defaultCity && cityList.length > 0) {
        defaultCity = cityList[0];
      }

      if (defaultCity) {
        const idx = cityList.indexOf(defaultCity);
        this.setData({
          selectedCityIndex: idx,
          selectedCity: defaultCity
        });
        this.filterData();
      } else {
        wx.showToast({ title: '未获取到任何城市数据', icon: 'none' });
      }
    } catch (err) {
      console.error('加载失败', err);
      wx.showToast({ title: '加载数据失败，请检查网络', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // ===== 筛选数据（使用标准全称映射到数据库city别名列表） =====
  filterData() {
    const { allSceneries, allFoods, selectedCity } = this.data;
    if (!selectedCity) return;

    // 获取该城市对应的所有可能city值（别名）
    const aliases = CITY_ALIAS_MAP[selectedCity] || [selectedCity];
    // 筛选时，检查 item.city 是否在别名列表中
    let filteredSceneries = allSceneries
      .filter(item => item.city && aliases.includes(item.city))
      .map(item => ({ ...item, type: 'scenic' }));

    let filteredFoods = allFoods
      .filter(item => item.city && aliases.includes(item.city))
      .map(item => ({ ...item, type: 'food' }));

    this.setData({ filteredSceneries, filteredFoods });
    this.updateDisplayList();
  },

  // ===== 更新展示列表（保留已选状态） =====
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

  // ===== 城市下拉选择 =====
  onCityChange(e) {
    const index = e.detail.value;
    const city = this.data.cityList[index];
    this.setData({
      selectedCityIndex: index,
      selectedCity: city
    });
    this.filterData();
  },

  // ===== Tab切换 =====
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
    this.updateDisplayList();
  },

  // ===== 卡片点击多选 =====
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
        price: card.type === 'scenic' ? card.ticket_price : card.avg_price,
        ...card
      });
    } else {
      newSelectedList = newSelectedList.filter(item => item._id !== id);
    }

    this.setData({
      displayList: newDisplayList,
      selectedList: newSelectedList
    });
  },

  // ===== 清空选择 =====
  clearAll() {
    this.setData({
      selectedList: [],
      planData: []
    });
    this.updateDisplayList();
    wx.showToast({ title: '已清空所有选择', icon: 'success' });
  },

  // ===== 生成行程方案（按城市归纳） =====
  generatePlan() {
    const { selectedList } = this.data;
    if (selectedList.length === 0) {
      wx.showToast({ title: '请至少选择一个景点或美食', icon: 'none' });
      return;
    }

    // 按数据库 city 字段分组（即简称）
    const cityMap = {};
    selectedList.forEach(item => {
      const city = item.city || '未知';
      if (!cityMap[city]) {
        cityMap[city] = [];
      }
      cityMap[city].push(item);
    });

    // 为了让分组标题显示标准全称，可将简称映射回全称
    const planData = Object.keys(cityMap).map(cityKey => {
      const fullName = SHORT_TO_FULL[cityKey] || cityKey;
      return {
        city: fullName,      // 显示全称
        items: cityMap[cityKey]
      };
    });

    this.setData({ planData });
    wx.showToast({
      title: `已生成 ${planData.length} 个城市的行程方案`,
      icon: 'success'
    });
  }
});