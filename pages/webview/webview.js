// pages/webview/webview.js
Page({
  data: {
    url: ''
  },
  onLoad(options) {
    const url = decodeURIComponent(options.url || '');
    const title = options.title || '详情';
    wx.setNavigationBarTitle({ title });
    this.setData({ url });
  }
});