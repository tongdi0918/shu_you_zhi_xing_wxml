Page({
  data:{
    url:""
  },
  onLoad(options) {    
    const url = options.url ? decodeURIComponent(options.url) : 'https://www.ctrip.com/';
    this.setData({ url });
  }
});
