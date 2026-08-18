// pages/login/login.js
const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    username: '',
    password: '',
    loading: false,
  },

  onInputUsername: function (e) {
    this.setData({
      username: e.detail.value,
    });
  },

  onInputPassword: function (e) {
    this.setData({
      password: e.detail.value,
    });
  },

  // 登录
  handleLogin: function () {
    const { username, password } = this.data;

    if (!username || !password) {
      wx.showToast({
        title: '请输入用户名和密码',
        icon: 'none',
      });
      return;
    }

    this.setData({ loading: true });

    db.collection('users').where({
      username: username,
    }).get().then(res => {
      if (res.data.length === 0) {
        wx.showToast({
          title: '用户不存在',
          icon: 'none',
        });
        this.setData({ loading: false });
        return;
      }

      const user = res.data[0];
      if (user.password !== password) {
        wx.showToast({
          title: '密码错误',
          icon: 'none',
        });
        this.setData({ loading: false });
        return;
      }

      // 登录成功
      app.setUserInfo(user);
      wx.showToast({
        title: '登录成功',
        icon: 'success',
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 1000);
    }).catch(err => {
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none',
      });
      console.log('登录失败', err);
    }).finally(() => {
      this.setData({ loading: false });
    });
  },

  // 跳转到注册
  goToRegister: function () {
    wx.navigateTo({
      url: '/pages/register/register',
    });
  },
});