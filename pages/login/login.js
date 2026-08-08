// pages/login/login.js
const app = getApp();

Page({
  data: {
    username: '',
    password: '',
    isLoading: false
  },

  onInputUsername(e) {
    this.setData({ username: e.detail.value });
  },

  onInputPassword(e) {
    this.setData({ password: e.detail.value });
  },

  async doLogin() {
    const { username, password } = this.data;
    if (!username || !password) {
      wx.showToast({ title: '请填写用户名和密码', icon: 'none' });
      return;
    }

    this.setData({ isLoading: true });
    wx.showLoading({ title: '登录中...' });

    try {
      const db = wx.cloud.database();
      const res = await db.collection('users')
        .where({
          username: username,
          password: password   // 明文，后续可加密
        })
        .get();

      if (res.data && res.data.length > 0) {
        const user = res.data[0];
        app.globalData.token = user._id;
        app.globalData.user = {
          _id: user._id,
          username: user.username,
          nickname: user.nickname || user.username,
          avatar: user.avatar || '',
          role: user.role || 'user'
        };
        wx.setStorageSync('token', app.globalData.token);
        wx.setStorageSync('user', app.globalData.user);

        wx.hideLoading();
        wx.showToast({ title: '登录成功', icon: 'success' });
        wx.switchTab({ url: '/pages/home/home' });
      } else {
        wx.hideLoading();
        wx.showToast({ title: '用户名或密码错误', icon: 'none' });
      }
    } catch (err) {
      console.error('登录查询失败', err);
      wx.hideLoading();
      wx.showToast({ title: '登录失败，请重试', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  goToRegister() {
    wx.navigateTo({ url: '/pages/register/register' });
  }
});