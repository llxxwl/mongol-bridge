// 从公共配置取出后端地址；../../ 表示向上两级目录。
const { baseUrl } = require('../../utils/config')

// Page 注册页面；WXML 的 bindtap 根据方法名调用这里的函数。
Page({
  // data 通过 {{变量名}} 显示在界面上，必须用 setData 更新才能同步到页面。
  // 普通的 this.xxx 属性只用于内部控制，不会自动刷新界面。
  data: {
    // idle: 空闲；starting: 启动；recording: 录音；stopping: 收尾；uploading: 上传。
    status: 'idle',
    statusText: '准备就绪',
    timeText: '00:00',
    audioPath: '', // 微信生成的本地临时文件路径，不是后端 URL 或音频内容。
    playing: false,
    uploadState: 'idle', // 上传结果独立记录：idle / uploading / success / error。
    uploadMessage: ''
  },

  // 页面创建时执行一次：获取录音、播放对象，并注册事件回调。
  onLoad() {
    this.recorder = wx.getRecorderManager()
    this.player = wx.createInnerAudioContext()
    // 开始录音是异步的；回调到来时页面可能已隐藏或销毁，需要及时停止。
    this.handleStart = () => {
      if (this.hidden || this.disposed) {
        this.recorder.stop()
        return
      }
      this.startedAt = Date.now()
      this.setData({ status: 'recording', statusText: '正在录音', timeText: '00:00', audioPath: '', uploadState: 'idle', uploadMessage: '' })
      this.clearTimer()
      // 每 250 毫秒刷新，用实际经过的时间计算，避免定时器延迟累积。
      this.timer = setInterval(() => {
        this.setData({ timeText: this.formatTime(Date.now() - this.startedAt) })
      }, 250)
    }
    // stop() 只发出停止指令，此回调才能拿到文件和时长。
    this.handleStop = (result) => {
      this.clearTimer()
      if (this.disposed) return
      // duration 单位是毫秒，不足半秒的录音不开放试听和上传。
      const valid = Boolean(result.tempFilePath) && result.duration >= 500
      this.setData({
        status: 'idle',
        statusText: valid ? '录音完成' : '录音太短，请重试',
        audioPath: valid ? result.tempFilePath : '',
        timeText: valid ? this.formatTime(result.duration) : '00:00'
      })
    }
    this.handleError = () => {
      this.clearTimer()
      if (this.disposed) return
      this.setData({ status: 'idle', statusText: '录音失败，请检查麦克风权限后重试' })
    }
    // 保存回调引用，卸载时才能用 offStart 等方法精确取消监听。
    this.recorder.onStart(this.handleStart)
    this.recorder.onStop(this.handleStop)
    this.recorder.onError(this.handleError)
    // 来电等中断可能暂停录音，本版直接结束本段，不自动恢复。
    this.recorder.onPause(this.handlePause = () => this.stopRecording())
    this.player.onEnded(() => this.resetPlayback())
    this.player.onStop(() => this.resetPlayback())
    this.player.onError(() => {
      this.resetPlayback()
      if (!this.disposed) wx.showToast({ title: '试听失败，请重新录音', icon: 'none' })
    })
  },

  // onShow/onHide 可反复触发；隐藏页面不等于销毁页面。
  onShow() { this.hidden = false },

  onHide() {
    this.hidden = true
    if (this.data.status === 'recording') this.stopRecording()
    this.player.stop()
  },

  // 销毁时取消上传、清理定时器和监听，防止回调继续操作已关闭的页面。
  onUnload() {
    this.disposed = true
    if (this.uploadTask) this.uploadTask.abort()
    this.clearTimer()
    this.recorder.stop()
    this.recorder.offStart(this.handleStart)
    this.recorder.offStop(this.handleStop)
    this.recorder.offError(this.handleError)
    this.recorder.offPause(this.handlePause)
    this.player.destroy()
  },

  // 毫秒转为 mm:ss；padStart(2, '0') 将个位数补齐，例如 3 -> 03。
  formatTime(milliseconds) {
    const seconds = Math.min(60, Math.floor(milliseconds / 1000))
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  },

  clearTimer() { clearInterval(this.timer) },

  resetPlayback() {
    if (!this.disposed) this.setData({ playing: false })
  },

  // 一个按钮切换开始/结束；非空闲状态拒绝再次开始，避免重复操作。
  toggleRecording() {
    if (this.data.status === 'recording') return this.stopRecording()
    if (this.data.status !== 'idle') return
    this.player.stop()
    this.setData({ status: 'starting', statusText: '正在获取麦克风权限' })
    // 获得 scope.record 权限后启动麦克风，拒绝时提供设置入口。
    wx.authorize({
      scope: 'scope.record',
      success: () => {
        if (this.disposed) return
        if (this.hidden) {
          this.setData({ status: 'idle', statusText: '准备就绪' })
          return
        }
        this.setData({ statusText: '正在启动录音' })
        // 最长 60 秒、16 kHz 采样、单声道、48 kbps MP3；后续需匹配识别服务的格式要求。
        this.recorder.start({ duration: 60000, sampleRate: 16000, numberOfChannels: 1, encodeBitRate: 48000, format: 'mp3' })
      },
      fail: () => {
        if (this.disposed) return
        this.setData({ status: 'idle', statusText: '未获得麦克风权限' })
        wx.showModal({
          title: '需要麦克风权限',
          content: '录音需要使用麦克风，请在设置中允许录音后重试。',
          confirmText: '打开设置',
          success: (result) => { if (result.confirm && !this.disposed) wx.openSetting({}) }
        })
      }
    })
  },

  // 先进入收尾状态，等 handleStop 收到文件后再恢复 idle。
  stopRecording() {
    this.clearTimer()
    this.setData({ status: 'stopping', statusText: '正在保存录音' })
    this.recorder.stop()
  },

  // 试听本地临时文件，无需调用后端。
  togglePlayback() {
    if (!this.data.audioPath || this.data.status !== 'idle') return
    if (this.data.playing) return this.player.stop()
    this.player.src = this.data.audioPath
    this.setData({ playing: true })
    this.player.play()
  },

  // 清除页面对录音的引用和显示，没有主动删除微信临时文件。
  clearRecording() {
    if (this.data.status !== 'idle') return
    this.player.stop()
    this.setData({ audioPath: '', timeText: '00:00', statusText: '准备就绪', playing: false, uploadState: 'idle', uploadMessage: '' })
  },

  // 本地文件 -> POST /api/recordings -> 校验回执 -> 更新页面。
  uploadRecording() {
    if (!this.data.audioPath || this.data.status !== 'idle') return
    this.player.stop()
    this.setData({ status: 'uploading', uploadState: 'uploading', statusText: '正在上传', uploadMessage: '正在发送录音…' })
    // HTTP、解析和网络错误共用此处理，恢复 idle 后才可重试。
    const fail = (message) => {
      if (!this.disposed) this.setData({ status: 'idle', statusText: '上传失败，可重试', uploadState: 'error', uploadMessage: message })
    }
    // 自动构造 multipart/form-data；返回的任务对象可用于取消上传。
    this.uploadTask = wx.uploadFile({
      url: `${baseUrl}/api/recordings`,
      filePath: this.data.audioPath,
      name: 'file', // 对应 Java 的 @RequestParam("file")，不是实际文件名。
      timeout: 30000,
      success: (response) => {
        if (this.disposed) return
        // success 仅表示收到 HTTP 响应；400/413/500 等仍需当作失败处理。
        if (response.statusCode !== 200) {
          fail(response.statusCode === 413 ? '录音超过 2 MB，请缩短录音后重试' : '上传未成功，请重试')
          return
        }
        try {
          // uploadFile 返回的 data 是字符串，先解析成对象才能访问属性。
          const receipt = JSON.parse(response.data)
          if (receipt.status !== 'RECEIVED' || typeof receipt.sizeBytes !== 'number' || receipt.sizeBytes <= 0) {
            fail('返回结果异常，请重试')
            return
          }
          // RECEIVED 仅表示收到文件，不表示已完成识别或翻译。
          this.setData({ status: 'idle', statusText: '上传成功', uploadState: 'success', uploadMessage: '录音已接收，翻译服务尚未接入' })
        } catch (error) {
          fail('返回结果异常，请重试')
        }
      },
      fail: () => fail('无法上传，请检查网络和服务连接后重试')
    })
  }
})
