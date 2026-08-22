// pages/recommend/recommend.js
const app = getApp();

// 四川省21个地级市标准全称（用于筛选时的别名匹配）
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

// 反向映射：简称 -> 标准全称
const SHORT_TO_FULL = {};
Object.keys(CITY_ALIAS_MAP).forEach(full => {
  CITY_ALIAS_MAP[full].forEach(short => {
    SHORT_TO_FULL[short] = full;
  });
});

Page({
  data: {
    userLocation: { city: '未设置', latitude: 0, longitude: 0 },
    cityList: [],
    selectedCityIndex: 0,
    selectedCity: '',
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
        db.collection('sceneries').limit(500).get(),
        db.collection('foods').limit(500).get()
      ]);

      let allSceneries = scenicRes.data;
      let allFoods = foodRes.data;

      // ----- 新增：提取所有图片 fileID，调用云函数换取临时链接 -----
      // 收集所有包含 image 字段的 fileID（过滤掉空值和非 cloud:// 开头的）
      const fileIds = [];
      [...allSceneries, ...allFoods].forEach(item => {
        if (item.image && typeof item.image === 'string' && item.image.startsWith('cloud://')) {
          fileIds.push(item.image);
        }
      });

      if (fileIds.length > 0) {
        try {
          // 调用云函数 getImages
          const res = await wx.cloud.callFunction({
            name: 'getImages',
            data: { fileList: fileIds }
          });

          if (res.result && res.result.fileList) {
            // 构建 fileID -> tempFileURL 的映射
            const urlMap = {};
            res.result.fileList.forEach(item => {
              urlMap[item.fileID] = item.tempFileURL;
            });

            // 替换 allSceneries 中的 image 为临时链接
            allSceneries = allSceneries.map(item => {
              if (item.image && urlMap[item.image]) {
                return { ...item, image: urlMap[item.image] };
              }
              return item;
            });

            // 替换 allFoods 中的 image 为临时链接
            allFoods = allFoods.map(item => {
              if (item.image && urlMap[item.image]) {
                return { ...item, image: urlMap[item.image] };
              }
              return item;
            });

            console.log('✅ 图片临时链接换取成功，共处理', fileIds.length, '个');
          }
        } catch (err) {
          console.error('❌ 调用云函数 getImages 失败：', err);
          // 失败时保留原始 fileID，页面可能会显示占位图或空白
        }
      }
      // ----- 新增部分结束 -----

      this.setData({ allSceneries, allFoods });

      // 直接从数据中提取所有不重复的 city 字段
      const citySet = new Set();
      [...allSceneries, ...allFoods].forEach(item => {
        if (item.city && typeof item.city === 'string') {
          const city = item.city.trim();
          const full = SHORT_TO_FULL[city];
          if (full) {
            citySet.add(full);
          } else if (CITY_ALIAS_MAP[city]) {
            citySet.add(city);
          } else {
            citySet.add(city);
          }
        }
      });

      const cityList = Array.from(citySet).sort();
      console.log('✅ 提取到的城市列表:', cityList);

      if (cityList.length === 0) {
        wx.showToast({ title: '未获取到任何城市数据，请检查数据库', icon: 'none' });
        this.setData({ loading: false });
        return;
      }

      this.setData({ cityList });

      // 自动匹配用户位置
      let defaultCity = '';
      if (this.data.userLocation.city && this.data.userLocation.city !== '未设置') {
        const userFull = SHORT_TO_FULL[this.data.userLocation.city];
        if (userFull && cityList.includes(userFull)) {
          defaultCity = userFull;
        } else if (cityList.includes(this.data.userLocation.city)) {
          defaultCity = this.data.userLocation.city;
        }
      }
      if (!defaultCity && cityList.length > 0) {
        defaultCity = cityList[0];
      }

      if (defaultCity) {
        const idx = cityList.indexOf(defaultCity);
        this.setData({ selectedCityIndex: idx, selectedCity: defaultCity });
        this.filterData();
      } else {
        wx.showToast({ title: '未匹配到有效城市', icon: 'none' });
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
    const aliases = CITY_ALIAS_MAP[selectedCity] || [selectedCity];

    let filteredSceneries = allSceneries
      .filter(item => item.city && aliases.includes(item.city.trim()))
      .map(item => ({ ...item, type: 'scenic' }));

    let filteredFoods = allFoods
      .filter(item => item.city && aliases.includes(item.city.trim()))
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
    const index = parseInt(e.detail.value);
    const city = this.data.cityList[index];
    if (!city) return;
    this.setData({ selectedCityIndex: index, selectedCity: city });
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
      const exists = newSelectedList.some(item => item._id === id);
      if (!exists) {
        newSelectedList.push({ ...card, checked: true });
      }
    } else {
      newSelectedList = newSelectedList.filter(item => item._id !== id);
    }

    this.setData({
      displayList: newDisplayList,
      selectedList: newSelectedList
    });
  },

  // ===== 清空所有已选 =====
  clearAll() {
    if (this.data.selectedList.length === 0) {
      wx.showToast({ title: '暂无已选项目', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '提示',
      content: '确定要清空所有已选项目吗？',
      success: (res) => {
        if (res.confirm) {
          const { displayList } = this.data;
          const newDisplayList = displayList.map(item => ({ ...item, checked: false }));
          this.setData({
            displayList: newDisplayList,
            selectedList: []
          });
          wx.showToast({ title: '已清空', icon: 'success' });
        }
      }
    });
  },

  // ===== 生成行程方案 =====
  generatePlan() {
    const { selectedList } = this.data;
    if (selectedList.length === 0) {
      wx.showToast({ title: '请至少选择一个项目', icon: 'none' });
      return;
    }
    const grouped = {};
    let globalIndex = 1;
    selectedList.forEach(item => {
      const city = item.city || '未知城市';
      if (!grouped[city]) grouped[city] = [];
      grouped[city].push({ ...item, planIndex: globalIndex++ });
    });
    const planData = Object.keys(grouped).map(city => ({
      city,
      items: grouped[city]
    }));
    this.setData({ planData });
    wx.showToast({ title: `已生成 ${planData.length} 个城市的行程`, icon: 'success' });
  },

  // ===== 查看行程方案详情 =====
  viewPlanDetail(e) {
    const index = e.currentTarget.dataset.index;
    const plan = this.data.planData[index];
    if (!plan) return;
    wx.showModal({
      title: ` ${plan.city}`,
      content: plan.items.map(item => `• ${item.name}`).join('\\n'),
      showCancel: false,
      confirmText: '知道了'
    });
  }
});