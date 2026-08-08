// pages/register/register.js
const app = getApp();

Page({
  data: {
    username: '',
    password: '',
    confirmPassword: '',
    isLoading: false
  },

  onInputUsername(e) {
    this.setData({ username: e.detail.value });
  },
  onInputPassword(e) {
    this.setData({ password: e.detail.value });
  },
  onInputConfirmPassword(e) {
    this.setData({ confirmPassword: e.detail.value });
  },

  async doRegister() {
    const { username, password, confirmPassword } = this.data;
    if (!username || !password) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }
    if (password !== confirmPassword) {
      wx.showToast({ title: '两次密码不一致', icon: 'none' });
      return;
    }

    this.setData({ isLoading: true });
    wx.showLoading({ title: '注册中...' });

    try {
      const db = wx.cloud.database();

      // 先检查用户名是否已存在
      const checkRes = await db.collection('users')
        .where({ username: username })
        .get();
      if (checkRes.data && checkRes.data.length > 0) {
        wx.hideLoading();
        wx.showToast({ title: '用户名已被占用', icon: 'none' });
        this.setData({ isLoading: false });
        return;
      }

      // 插入新用户（默认角色为 'user'）
      const addRes = await db.collection('users').add({
        data: {
          username: username,
          password: password,   // 明文，后续可改进
          nickname: username,
          avatar: '',
          role: 'user',
          createTime: new Date()
        }
      });

      wx.hideLoading();
      wx.showToast({ title: '注册成功', icon: 'success' });
      // 注册成功后跳转登录页
      wx.navigateBack();
    } catch (err) {
      console.error('注册失败', err);
      wx.hideLoading();
      wx.showToast({ title: '注册失败，请重试', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  goToLogin() {
    wx.navigateBack();
  }
});