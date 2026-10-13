// 全局入口：App 管理小程序生命周期，Page 管理各页面的生命周期。
App({
  onLaunch() {
    // 模板保留的启动日志，存在设备本地，供 logs 示例页读取，不是录音记录。
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 模板保留的微信登录调用，当前录音上传没有使用登录结果。
    wx.login({
      success: res => {
        // res.code 是临时登录凭证。目前没有发给后端，也没有建立业务登录会话。
      }
    })
  },
  // 全局共享数据，当前首页没有用到此模板字段。
  globalData: {
    userInfo: null
  }
})
