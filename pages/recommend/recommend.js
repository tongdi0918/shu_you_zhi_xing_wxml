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
      const res = await db.collection('users').where({
        _openid: '{openid}'
      }).get();
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
      // 提高limit到1000，确保获取全部记录
      const [scenicRes, foodRes] = await Promise.all([
        db.collection('sceneries').limit(1000).get(),
        db.collection('foods').limit(1000).get()
      ]);

      let allSceneries = scenicRes.data;
      let allFoods = foodRes.data;

      console.log(`📊 从数据库获取：景区 ${allSceneries.length} 条，美食 ${allFoods.length} 条`);

      // ----- 关键修改：分批换取图片临时链接 -----
      // 1. 收集所有有效的 image_url（仅 cloud:// 开头）
      const fileIds = [];
      const allItems = [...allSceneries, ...allFoods];
      allItems.forEach(item => {
        if (item.image_url && typeof item.image_url === 'string' && item.image_url.startsWith('cloud://')) {
          fileIds.push(item.image_url);
        }
      });

      // 去重（避免重复调用）
      const uniqueFileIds = [...new Set(fileIds)];
      console.log(`🖼️ 共发现 ${uniqueFileIds.length} 个唯一图片 fileID`);

      if (uniqueFileIds.length > 0) {
        // 2. 分批调用云函数（每批最多50个）
        const BATCH_SIZE = 50;
        const batches = [];
        for (let i = 0; i < uniqueFileIds.length; i += BATCH_SIZE) {
          batches.push(uniqueFileIds.slice(i, i + BATCH_SIZE));
        }

        console.log(`📦 分为 ${batches.length} 批获取临时链接`);

        // 存储所有批次结果的映射
        const urlMap = {};

        // 逐批调用，使用 Promise.all 并行（但注意云函数并发限制，建议串行或限制并发）
        // 这里采用串行，避免触发云函数并发限制
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
          const batch = batches[batchIndex];
          try {
            const res = await wx.cloud.callFunction({
              name: 'getImages',
              data: { fileList: batch }
            });

            if (res.result && res.result.fileList) {
              res.result.fileList.forEach(item => {
                if (item.fileID && item.tempFileURL) {
                  urlMap[item.fileID] = item.tempFileURL;
                }
              });
              console.log(`✅ 第 ${batchIndex + 1}/${batches.length} 批获取成功，共 ${batch.length} 个`);
            } else {
              console.warn(`⚠️ 第 ${batchIndex + 1} 批返回异常：`, res);
            }
          } catch (err) {
            console.error(`❌ 第 ${batchIndex + 1} 批调用云函数失败：`, err);
          }
        }

        console.log(`✅ 总共获取到 ${Object.keys(urlMap).length} 个临时链接`);

        // 3. 替换 allSceneries 中的 image_url
        allSceneries = allSceneries.map(item => {
          if (item.image_url && urlMap[item.image_url]) {
            return { ...item, image_url: urlMap[item.image_url] };
          }
          return item;
        });

        // 替换 allFoods 中的 image_url
        allFoods = allFoods.map(item => {
          if (item.image_url && urlMap[item.image_url]) {
            return { ...item, image_url: urlMap[item.image_url] };
          }
          return item;
        });

        console.log('✅ 所有图片临时链接替换完成');
      } else {
        console.log('⚠️ 没有找到任何有效的 image_url 字段');
      }
      // ----- 修改结束 -----

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
        this.setData({
          selectedCityIndex: idx,
          selectedCity: defaultCity
        });
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
      title: `📍 ${plan.city}`,
      content: plan.items.map(item => `• ${item.name}`).join('\\n'),
      showCancel: false,
      confirmText: '知道了'
    });
  }
});