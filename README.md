# 云开发平台的环境ID

cloud1-d2gphu7bt75dc5910

# 高德API

68ff2afb0b6d70f0a6970b71737729a6

cd Y:\\微信开发者工具\\数据存储\\蜀游智行2
npm init -y
npm install express mysql2 cors

# 目录结构

蜀游智行/                           # 项目根目录
│
├── app.js                          # 全局逻辑（配置 apiBase、globalData）
├── app.json                        # 全局配置（注册所有页面、TabBar）
├── app.wxss                        # 全局样式
├── project.config.json             # 项目配置文件（
├── sitemap.json                    # 站点地图（默认配置即可）
│
├── pages/                          # 所有页面文件夹
│   ├── home/                       # 首页（景区+美食列表）
│   │   ├── home.js
│   │   ├── home.json
│   │   ├── home.wxml
│   │   └── home.wxss
│   │
│   ├── login/                      # 登录页
│   │   ├── login.js
│   │   ├── login.json
│   │   ├── login.wxml
│   │   └── login.wxss
│   │
│   ├── register/                   # 注册页
│   │   ├── register.js
│   │   ├── register.json
│   │   ├── register.wxml
│   │   └── register.wxss
│   │
│   ├── scenic/                     # 景区详情页
│   │   ├── scenic.js
│   │   ├── scenic.json
│   │   ├── scenic.wxml
│   │   └── scenic.wxss
│   │
│   ├── food/                       # 美食详情页
│   │   ├── food.js
│   │   ├── food.json
│   │   ├── food.wxml
│   │   └── food.wxss
│   │
│   ├── recommend/                  # 个性化推荐页（TabBar页面）
│   │   ├── recommend.js
│   │   ├── recommend.json
│   │   ├── recommend.wxml
│   │   └── recommend.wxss
│   │
│   ├── route/                      # 路线规划页（TabBar页面，含地图）
│   │   ├── route.js
│   │   ├── route.json
│   │   ├── route.wxml
│   │   └── route.wxss
│   │
│   ├── profile/                    # 个人中心页（TabBar页面）
│   │   ├── profile.js
│   │   ├── profile.json
│   │   ├── profile.wxml
│   │   └── profile.wxss
│   │
│   ├── favorites/                  # 我的收藏页
│   │   ├── favorites.js
│   │   ├── favorites.json
│   │   ├── favorites.wxml
│   │   └── favorites.wxss
│   │
│   ├── history/                    # 浏览历史页
│   │   ├── history.js
│   │   ├── history.json
│   │   ├── history.wxml
│   │   └── history.wxss
│   │
│   ├── admin/                      # 管理端登录页
│   │   ├── admin.js
│   │   ├── admin.json
│   │   ├── admin.wxml
│   │   └── admin.wxss
│   │
│   ├── dashboard/                  # 管理后台首页
│   │   ├── dashboard.js
│   │   ├── dashboard.json
│   │   ├── dashboard.wxml
│   │   └── dashboard.wxss
│   │
│   ├── scenic-mgr/                 # 景点管理页
│   │   ├── scenic-mgr.js
│   │   ├── scenic-mgr.json
│   │   ├── scenic-mgr.wxml
│   │   └── scenic-mgr.wxss
│   │
│   ├── food-mgr/                   # 美食管理页
│   │   ├── food-mgr.js
│   │   ├── food-mgr.json
│   │   ├── food-mgr.wxml
│   │   └── food-mgr.wxss
│   │
│   └── webview/                    # 携程等外部网页嵌入页
│       ├── webview.js
│       ├── webview.json
│       ├── webview.wxml
│       └── webview.wxss
│
├── libs/                           # 第三方库
│   └── amap-wx.js                  # 高德地图微信小程序SDK（需从官网下载）
│
├── images/                         # 图片资源
│   ├── tabbar/                     # 底部导航图标
│   │   ├── home.png
│   │   ├── home\_active.png
│   │   ├── recommend.png
│   │   ├── recommend\_active.png
│   │   ├── route.png
│   │   ├── route\_active.png
│   │   ├── profile.png
│   │   └── profile\_active.png
│   └── default.png                 # 默认头像占位图
│
├── server/                         # 【后端代码】独立于前端，放在根目录下方便管理
│   ├── app.js                      # 后端入口文件
│   ├── package.json                # 后端依赖
│   ├── config/
│   │   └── db.js                   # 数据库连接配置
│   ├── routes/                     # 路由文件
│   │   ├── auth.js                 # 登录/注册
│   │   ├── sceneries.js            # 景点接口
│   │   ├── foods.js                # 美食接口
│   │   ├── favorites.js            # 收藏接口
│   │   ├── route.js                # 路线规划接口（调用高德）
│   │   └── admin.js                # 管理后台接口
│   ├── models/                     # 数据库模型（可选）
│   └── public/                     # 静态资源
│       └── images/                 # 存放景点/美食图片（需配置静态托管）
│
└── database/                       # 数据库SQL文件
├── schema.sql                  # 建表语句
└── data.sql                    # 初始数据（景区、美食等）

