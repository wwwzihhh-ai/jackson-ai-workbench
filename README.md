# Jackson 工作台

Jackson 工作台是一个适合电脑和 iPhone 使用的个人网页 App，把健身计划、财经观察和今日待办放在同一个界面里。数据默认只保存在当前浏览器，不需要注册账号，也不需要填写任何 API 密钥。

项目最初的完整愿景还包括 AI 热点、心得复盘和个人支出记录。当前 V1.1 优先交付健身、财经观察和每日待办，其他模块保留在后续路线图中，不会被描述成已经上线的功能。

## 已有功能

- 今日总览：集中查看训练、财经和待办进度。
- 健身运动：建立训练档案、自动生成训练/恢复计划、逐组打卡、休息倒计时和连续打卡。
- 财经资讯：每天从本地内容池轮换 5 条观察框架，并覆盖美股、A 股和宏观分类。
- 今日待办：添加、编辑、完成、筛选和删除任务。
- 个性化：浅色、深色、跟随系统三种主题，侧边栏模块可以长按排序。
- 本地数据：支持导入、导出备份和重置。
- PWA：可以从 iPhone Safari 添加到主屏幕，以接近独立 App 的方式打开。

## 技术说明

项目使用原生 HTML、CSS 和 JavaScript，没有 React、Next.js 或 Vite，也没有第三方运行依赖。构建脚本只负责把源码和 PWA 文件复制到 `dist` 文件夹，适合直接部署到 Vercel。

主要目录：

```text
├─ index.html                 页面结构与 iOS/PWA 设置
├─ src/
│  ├─ styles.css              页面样式和 iPhone 安全区域适配
│  └─ app.js                  工作台全部交互逻辑
├─ public/
│  ├─ manifest.webmanifest    PWA 应用信息
│  ├─ sw.js                   离线缓存和更新逻辑
│  └─ icons/                  主屏幕图标
├─ scripts/                   本地运行、检查、测试和构建脚本
├─ package.json               项目命令
└─ vercel.json                Vercel 输出目录配置
```

## 在本地运行

电脑需要先安装 Node.js 20 或更高版本，以及 pnpm。

```bash
pnpm install
pnpm dev
```

命令执行后，终端会显示端口号。在浏览器中打开电脑对应的本地地址即可。

常用检查命令：

```bash
pnpm check
pnpm test
pnpm build
```

构建成功后，可部署文件位于 `dist` 文件夹。

## 免费部署到 GitHub Pages（当前推荐）

仓库已经包含 `.github/workflows/deploy-pages.yml`。在 GitHub 仓库的 **Settings → Pages** 中把 Source 设为 **GitHub Actions** 后，每次向 `main` 分支推送代码，GitHub 都会自动构建并更新网站。

网站地址：`https://wwwzihhh-ai.github.io/jackson-ai-workbench/`

## 部署到 Vercel（可选）

1. 将项目推送到 GitHub。
2. 使用 GitHub 登录 Vercel。
3. 在 Vercel 点击 **Add New → Project**。
4. 导入 `wwwzihhh-ai/jackson-ai-workbench`。
5. Framework Preset 选择 **Other**。
6. Vercel 会读取项目配置并执行 `pnpm run build`，输出目录为 `dist`。
7. 点击 **Deploy**。

连接 GitHub 后，今后向生产分支 `main` 推送代码会自动触发新的 Vercel 构建和部署。

## 环境变量

当前版本不需要任何环境变量，也没有真实密钥。`.env.example` 只保留说明；`.env`、`.env.local` 等本地文件均已被 Git 忽略。

未来如果接入真实财经 API，不应把密钥写入 `src/app.js`，而应通过服务端接口和 Vercel 环境变量保护密钥。

## 在 iPhone 添加到主屏幕

1. 使用 **Safari** 打开部署后的 GitHub Pages 或 Vercel 网站。
2. 点击 Safari 底部的 **分享** 按钮（方框向上箭头）。
3. 在分享菜单中向下找到并点击 **添加到主屏幕**。
4. 名称保留为“Jackson 工作台”，点击右上角 **添加**。
5. 以后从桌面上的 J 图标打开即可。

第一次打开以及更新应用时需要联网；成功打开后，核心页面可以使用离线缓存。个人数据仍然保存在这个主屏幕 Web App 的本地存储中，请定期使用“数据管理 → 导出备份”。

## 当前尚未真正接入的能力

- 财经卡片是本地演示摘要，不是实时行情或真实新闻，也不构成投资建议。
- 训练重量是规则生成的参考起点，不代替医生或专业教练的判断。
- 尚未接入 Apple 健康、iCloud、系统通知或 Apple 提醒事项。
- 尚未接入账号、云端数据库或跨设备自动同步。
- 浏览器本地数据不会自动同步到另一台 iPhone；更换设备前需要手动导出备份。

## 数据与隐私

项目不上传健身档案、待办或浏览记录。清除 Safari 网站数据会删除本地资料，因此重要数据请先导出备份。
