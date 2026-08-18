// pages/register/register.js
const db = wx.cloud.database();

Page({
  data: {
    username: '',
    password: '',
    confirmPassword: '',
    nickName: '',
    loading: false,
  },

  onInputUsername: function (e) {
    this.setData({ username: e.detail.value });
  },

  onInputPassword: function (e) {
    this.setData({ password: e.detail.value });
  },

  onInputConfirmPassword: function (e) {
    this.setData({ confirmPassword: e.detail.value });
  },

  onInputNickName: function (e) {
    this.setData({ nickName: e.detail.value });
  },

  // 注册
  handleRegister: function () {
    const { username, password, confirmPassword, nickName } = this.data;

    if (!username || !password || !confirmPassword) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none',
      });
      return;
    }

    if (password !== confirmPassword) {
      wx.showToast({
        title: '两次密码不一致',
        icon: 'none',
      });
      return;
    }

    if (password.length < 6) {
      wx.showToast({
        title: '密码至少6位',
        icon: 'none',
      });
      return;
    }

    this.setData({ loading: true });

    // 检查用户名是否已存在
    db.collection('users').where({
      username: username,
    }).get().then(res => {
      if (res.data.length > 0) {
        wx.showToast({
          title: '用户名已存在',
          icon: 'none',
        });
        this.setData({ loading: false });
        return;
      }

      // 创建用户
      return db.collection('users').add({
        data: {
          username: username,
          password: password,
          nickName: nickName || username,
          avatarUrl: '',
          city: '',
          role: 'user',
          createTime: new Date(),
          updateTime: new Date(),
        }
      });
    }).then(() => {
      wx.showToast({
        title: '注册成功',
        icon: 'success',
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1000);
    }).catch(err => {
      wx.showToast({
        title: '注册失败，请重试',
        icon: 'none',
      });
      console.log('注册失败', err);
    }).finally(() => {
      this.setData({ loading: false });
    });
  },

  // 跳转到登录
  goToLogin: function () {
    wx.navigateBack();
  },
});