# Auto Skip - IINA Plugin

## 项目概述
自动跳过片头片尾的 IINA 侧边栏插件。设置秒数后，播放时自动跳过指定区间。

## 目录结构
```
├── Info.json              # 插件清单 (id: io.iina.auto-skip, version 1.0.2)
├── src/
│   ├── index.js           # 后端: mpv 事件监听、跳过逻辑、菜单注册
│   ├── sidebar.html       # 侧边栏 DOM (跳过设置面板)
│   ├── sidebar.js         # 侧边栏交互 (输入净化、保存、日志)
│   ├── sidebar.css        # 侧边栏样式 (半透明组件 + 毛玻璃 + 无轨道滚动条)
│   ├── preferences.html   # 偏好设置 DOM
│   ├── preferences.js     # 快捷键输入净化、验证、冲突检测
│   ├── preferences.css    # 偏好设置样式
│   └── help.html          # 帮助页面
├── assets/
│   └── sidebar.png
├── userscript/             # 原始跳帧脚本 (保留, 不激活)
└── AGENTS.md              # 本文件
```

## 核心逻辑

### 数据流
```
side bar 设置 → iina.postMessage(SAVE) → index.js → preferences 持久化

mpv.time-pos.changed → index.js checkSkipPosition() → 位置匹配 → seek/stop → addLog → sidebar 显示日志
```

### 跳过算法
```
checkSkipPosition():
  if !enabled || skipInProgress → return

  pos = time-pos
  duration = file duration

  // 片头: pos < introDuration → seek(introDuration)
  // 片尾: pos >= duration - outroDuration → seek(duration - 0.3) 触发自然 EOF

  skipInProgress = true → 500ms 后自动复位 (防回跳死循环)
```

### 防回跳机制
- `skipInProgress` boolean flag
- seek 前置位 → 500ms 后复位
- `iina.file-loaded` 时强制复位

### 事件监听生命周期
- 在 `iina.window-loaded` 时注册 `mpv.time-pos.changed` 和 `iina.file-loaded`
- **永远不注销** (侧边栏关闭不影响监听)
- IINA 保证 JSContext 在 PlayerCore 生命周期内持续存活

## 配置结构
### skipConfig (侧边栏设置)
```json
{
  "enabled": false,
  "introDuration": 0,
  "outroDuration": 0
}
```

### 全局偏好
- `keybind`: 快捷键 (默认 "s")
- `autoFocus`: 输入框自动跳转 (默认 true)

## 事件列表
| 事件名 | 方向 | 说明 |
|--------|------|------|
| `auto-skip-init` | 后端→前端 | 侧边栏打开时：当前配置 + autoFocus |
| `auto-skip-save` | 前端→后端 | 保存新配置 |
| `auto-skip-log` | 后端→前端 | 跳过日志消息 |
| `auto-skip-visible` | 前端→后端 | 侧边栏可见性通知 |

## 菜单与快捷键
- 菜单项: `Plugin → 自动跳过`
- 默认快捷键: `s`
- 快捷键配置/冲突检测沿用原项目逻辑

## 参考: PotPlayer 跳略播放
跳过片头片尾功能在 PotPlayer 中称为"跳略播放" (Skip Playback)。

### 操作方式
- 右键 → 播放 → 跳略播放 → 跳略播放设置
- 输入格式: hh:mm:ss
- 片头从开头算，片尾从结尾倒算
- 支持多段跳过区间（跳过中间广告）
- 快捷键 `'` 开关，`Shift+'` 切换

### 行为特点
- 全局生效（设一次所有视频都适用）
- 进度条上跳过区域显示为黑色
- 实现原理：渲染时直接跳帧，不进行 seek 操作
- 无需保持窗口打开

### 与本案差异
本插件通过 mpv seek 实现跳过（实际执行跳转），PotPlayer 是渲染层跳过。功能效果一致，本插件缺少进度条可视化反馈。

## 项目溯源
- 基于 [bbeny123/iina-jump-to-frame](https://github.com/bbeny123/iina-jump-to-frame) 改造
- 原作者：Ch1re (Chire)
- 作者：lingya (GitHub: pangziqiang)
- 许可证：MIT，双版权声明（Ch1re + lingya）
- 全中文界面，输入框三框时/分/秒，默认快捷键 S

## 仓库部署
- 仓库地址：`github.com/pangziqiang/iina-auto-skip`
- Git remote 使用 https + token 方式（本地 VPN 拦截 SSH 端口 22）
- `AGENTS.md` 加入 `.gitignore`，仅本地保留不上传
- 备份目录：`/Users/yao/iina-jump-to-frame-CN`（汉化版）
- 插件包：`/Users/yao/Downloads/auto-skip-1.0.2.iinaplgz`

## superpowers skills overrides

### subagent-driven-development

Modified agent selection and escalation flow:

1. **BLOCKED** → Orchestrator collects fix_hint, escalates via `subagent_type: expert`
2. **`expert` subagent BLOCKED** → mark task failed, return to user

Otherwise follow the skill exactly as written.

## 编码约定
- 同原项目 (const/let, event.on/off, CSS 变量)
- 时间精度: 整数秒，无需毫秒
- 三框输入: 时/分/秒独立 input，内部转总秒数存储
- 焦点自动跳: 输入满2位自动跳到下一框 (偏好设置控制)
- 日志最多 20 条
