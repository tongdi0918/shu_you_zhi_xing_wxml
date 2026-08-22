Page({
  onLoad(options) {
    // 接收传入的网页链接（已编码）
    const url = options.url ? decodeURIComponent(options.url) : 'https://www.ctrip.com/';
    this.setData({ url });
  }
});