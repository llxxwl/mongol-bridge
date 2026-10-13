# 蒙语桥 MongolBridge

微信小程序录音 + Java Spring Boot 文件接收原型。
当前支持录音、试听、清除、上传与失败重试，尚未接入蒙古语识别和中文翻译。

## 目录

```text
mongol-bridge/
  miniprogram/  微信小程序，使用微信开发者工具打开
  server/       Java 后端，使用 IDEA 打开其中的 pom.xml
```

## 两台电脑的准备

每台电脑安装 Git、JDK 21、微信开发者工具，以及用于编辑 Java 的 IDEA。
无需单独安装 Maven，server 中的 Maven Wrapper 会下载指定版本。
首次启动需要联网下载依赖。两台电脑可使用不同磁盘目录。

在 GitHub 登录自己的账号，新电脑克隆私有仓库时通过 Git 的凭据管理器
完成 GitHub 登录。终端提示认证时按提示操作，不要把访问令牌写入远程 URL。

首次下载代码：从 GitHub 仓库的 Code 按钮复制 HTTPS 地址，然后运行
`git clone 仓库HTTPS地址`，再进入生成的 mongol-bridge 文件夹。

## 启动后端

在仓库根目录的 PowerShell 中执行：

```powershell
java -version
javac -version
cd server
.\mvnw.cmd spring-boot:run
```

两条版本命令应显示 21；JAVA_HOME 应指向本机 JDK 根目录，不要带 bin。
不要把另一台电脑的 JDK 安装路径复制进项目配置。

浏览器访问 http://127.0.0.1:8080/api/health，返回 UP 表示服务可用。
后端运行窗口保持打开；Ctrl+C 停止。端口被占用时先确认是否已有本项目运行。
也可以在 IDEA 导入 server/pom.xml，项目 SDK 选择 21，然后运行
MongolBridgeApplication 的 main 方法。

## 启动小程序

1. 微信开发者工具导入本仓库的 miniprogram 子目录，不能选择仓库根目录。
2. 使用项目已有 AppID，登录有该小程序开发权限的微信。
3. 本地调试在“详情 → 本地设置”中关闭域名、TLS 和 HTTPS 证书校验。
4. 本项目已关闭编译热重载。若本机设置覆盖它，请在本地设置中关闭热重载。
5. 编译、录音、结束录音，再点击“上传录音”。

电脑调试默认连接 http://127.0.0.1:8080，它指向当前电脑。
公司与家里的后端各自运行，代码同步不意味着后台进程同步。
小程序公共配置固定基础库 3.17.4；个人配置可能覆盖，需在工具里确认版本。

手机调试需同一局域网，将 miniprogram/utils/config.js 的地址改为电脑 IPv4，
并在启动后端前设置 `$env:SERVER_ADDRESS = '0.0.0.0'`。
按需要允许专用网络防火墙通信，使用开发者工具真机调试。
本机 IP 变动不要作为公共配置提交，提交前用 git diff 检查并恢复通用地址。

## 每天同步代码

开始工作前，在仓库根目录：

```powershell
git status
git pull --ff-only
```

如果还有未提交修改，先处理这些修改再拉取。`--ff-only` 遇到分叉会停止，
不会自动生成一次合并；不要用强制推送解决不理解的冲突。

完成工作、换电脑之前：

```powershell
git diff
git add .
git diff --cached --stat
git commit -m "说明本次修改"
git push
```

新电脑首次提交若提示缺少作者信息，可在本仓库执行：

```powershell
git config user.name "你的提交显示名"
git config user.email "你的GitHub提交邮箱"
```

Git 提交邮箱可使用 GitHub Settings → Emails 提供的 noreply 邮箱。
Git 作者信息与 GitHub 登录认证是两件不同的事。

## 提交范围和验证

提交源码、pom.xml、mvnw、mvnw.cmd 和 .mvn；不要遗漏点开头的 .mvn 目录。
.gitignore 已排除编译产物、IDE 设置、开发工具私有设置、常见本地密钥文件、录音和日志。
AppID 是项目标识，可以随源码同步；AppSecret 和第三方 API 密钥不能写入源码。
私有仓库也不能代替正确的密钥管理。

在 server 目录运行 `./mvnw.cmd test` 测试接口，`./mvnw.cmd package` 打包。
此原型默认只监听本机，没有用户登录和配额限制，不应直接作为公网服务发布。
