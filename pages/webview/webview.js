Page({
  data: { url: '' },
  onLoad(options) {
    this.setData({ url: decodeURIComponent(options.url || 'https://m.ctrip.com') });
  }
});