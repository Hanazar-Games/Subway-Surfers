# Subway Surfers

## 当前公告 - v1.1.6

发布日期：2026-07-09

本版本对上一版新增功能和全局 UI/UX/音效/音乐做深度复查修复：

- 修复 HUD 分数因随距离连续增长而每 80ms 触发一次弹跳动画、数字持续抖动的问题，现在只在金币等大幅得分时弹跳；同时移除与 CSS 动画冲突的死代码内联缩放。
- 修复首局游戏（历史最佳为 0）从 1 分起就全程金色"破纪录"脉冲的噪音问题。
- 修复破纪录时结算页同时出现三处"NEW RECORD!"文字（标题、插入横幅、画布飘字）的重复堆叠，仅保留标题文字并配合光爆、闪光与彩带。
- 修复胜利同时破纪录时"YOU WON!"标题被"NEW RECORD!"覆盖的问题，胜利信息优先，纪录由 Best 栏 ★ 与庆祝特效表达。
- 修复多个成就同时解锁时提示框全部叠在同一位置、互相遮挡无法阅读的问题，现在按序垂直排列。
- 修复火车轰鸣音效首次触发时因增益节点默认值为 1.0 而爆出一声低频巨响的问题，现在从静音平滑淡入。
- 修复死亡慢动作期间下蹲/跳跃/绳索障碍碰撞与 800m 终点判定仍会触发，可能截断死亡动画甚至在撞毁瞬间误判获胜的问题。
- 为 uiGameOver 增加重入保护，杜绝统计数据被重复累计的可能。
- 修复触屏上从虚拟按键起步的滑动手势会同时触发按键与滑动、造成一次操作输入两次的问题。
- 新增切后台/锁屏时自动暂停：游戏计时基于墙钟时间，此前切走再回来会出现警察莫名追上、道具全部过期的情况；倒计时在后台结束时也会自动进入暂停。
- 新增菜单子页面（怎么玩/统计/设置）支持 Esc 键返回主菜单。
- 修复历史最佳分数在本地存储损坏时显示 NaN、旧版统计数据缺字段导致金币成就永远无法解锁的健壮性问题。
- 复测开始/倒计时/暂停/恢复/被抓死亡音效/胜利流程/成就解锁/破纪录展示/Esc 导航全流程与控制台异常。

## 历史公告 - v1.1.5

发布日期：2026-07-09

本版本对 UI/UX/音效/音乐做整体自查修复：

- 修复破纪录特效（NEW RECORD 光爆与文字）误插入隐藏的开始菜单卡片、结算页看不到的问题。
- 修复结算页距离字段的判空变量写错，极端情况下可能报错的问题。
- 修复暂停后金币连击计时未补偿、恢复游戏时连击倍率被无故清零的问题。
- 修复"障碍碰撞豁免索引"在下蹲/跳跃/绳索三类障碍间共享，撞到一种障碍会连带另外两类同序号障碍失去碰撞的问题。
- 修复启动页"PRESS ANY KEY TO START"提示无效的问题，现在按任意键或点击即可跳过开场动画。
- 修复重开游戏会污染设置里"显示开场动画"开关状态的问题，该偏好改为独立持久化保存。
- 修复在最左/最右车道继续按方向键仍会播放音效、倾斜并产生残影的问题。
- 修复上升途中重复按跳跃可刷新跳跃（音效连发、悬空漏洞）以及飞行状态按跳跃遗留脏状态的问题。
- 修复被警察抓住的三种失败路径没有碰撞音效的问题，现在与火车/箱子/井盖死亡一致。
- 新增通关胜利小号式上行音阶音效。
- 修复暂停压低背景音乐时，若用户音量本身低于 0.1 反而会变响的问题。
- 修复音效音量从本地存储读到非法值时产生 NaN、导致整套合成音效失效的隐患。
- 修复移动端四个虚拟按键共享节流窗口、快速"横移+跳跃"组合会丢按键的问题。
- 复测开始/倒计时/暂停/恢复/结算/重开全流程、破纪录展示、连击保留与控制台异常。

## 历史公告 - v1.1.4

发布日期：2026-07-07

本版本继续修复移动端 UI/UX 细节：

- 修复移动端游戏结束过快时，开局按键提示仍停留在结算页底部、遮挡 Play Again / Main Menu 操作区的问题。
- 按键提示现在会在 HUD 隐藏、暂停和结算流程中统一清理，避免残留在非游戏状态。
- 复测桌面 start/pause/resume/menu 流程、移动端触控流程、资源请求和控制台异常。

## 历史公告 - v1.1.3

发布日期：2026-07-04

本版本继续优化游戏内容、建模表现和高速可读性：

- 增强玩家模型，加入手臂、腿部、背包和帽檐结构，跑动时会有更清楚的摆臂/迈步动作。
- 优化轨道模型，加入凸起轨条和横向枕木，让道路不再只是平面贴图。
- 改进城市背景建模，侧面高度和距离产生变化，减少重复感。
- 新增障碍前地面警示光效，火车、箱子、井盖、跳跃/下蹲障碍和绳索更容易提前识别。
- 优化金币生成，加入平铺、弧线和错层金币队列，提高收集路线变化。
- 修复快速开始时启动页可能重新覆盖游戏画面的 UI 状态问题。
- 修复玩家身体左侧法线方向错误，改善新增模型在光照下的明暗表现。
- 修复发光贴片纵向缩放未生效的问题，让危险提示、冲击波和光效尺寸更准确。

## 历史公告 - v1.1.2

发布日期：2026-07-01

本版本针对 v1.1.1 的新暂停、音频和移动端改动继续做深度自查修复：

- 修复 Esc 暂停后无法再用 Esc 恢复的问题。
- 修复恢复按钮可被重复触发导致多个恢复计时器同时运行的潜在问题。
- 加强暂停/恢复状态保护，避免恢复中再次暂停造成 UI 与主循环状态不同步。
- 改进触控按钮显示条件，避免小屏或混合输入设备误判为桌面而隐藏移动控制。
- 复测开始、倒计时、暂停、恢复、音量同步、移动端布局和资源加载。

## 历史公告 - v1.1.1

发布日期：2026-07-01

本版本继续针对 UI/UX、SFX/BGM 和移动端体验做深度修复：

- 修复快速重复点击开始游戏可能重复注入游戏脚本、重复倒计时的问题。
- 修复倒计时期间按 Esc 暂停后，游戏仍会在暂停层背后启动的问题。
- 修复暂停期间 HUD 计时、道具倒计时和若干时间戳会继续消耗的问题。
- 修复暂停后 HUD 计时刷新未停止、恢复后未重新接续的问题。
- 修复暂停页音量滑块与设置页音量状态不同步的问题。
- 修复 UI 点击音效不跟随 SFX 音量设置的问题。
- 修复移动端缺少 viewport 设置导致布局缩放异常的问题。
- 改进触控按钮，避免部分浏览器同时触发 pointer 与 touch 导致一次点击移动两格。
- 加长开局安全窗口，降低首次进入游戏时过早撞上障碍的挫败感。
- 改进移动端安全区、HUD 换行和弹层滚动，减少小屏遮挡与溢出。

## 历史公告 - v1.1.0

发布日期：2026-06-29

本版本重点修复稳定性、UI/UX、SFX/BGM 与开局体验：

- 修复 UI 控制器语法错误，开始菜单按钮、统计、设置与暂停流程恢复正常。
- 修复角色绘制时的 `cubeRotation` 运行时错误。
- 修复倒计时期间游戏提前移动的问题，开跑时间与 HUD 计时现在从 `GO!` 后开始。
- 修复开局安全窗口，前 70m 不再把致命/减速障碍刷在初始车道。
- 修复分数 HUD 不实时更新的问题。
- 修复灰度/闪墙 shader 切换时缺失 uniform 的潜在崩溃。
- 修复 WebGL 纹理上传兼容性，图片会先标准化后进入 WebGL。
- 修复 SFX 音量设置不影响 WebAudio 合成音效的问题。
- 修复 BGM 提前自动播放与浏览器用户激活策略冲突的问题。
- 改进暂停时 HUD 显隐、移动端菜单布局、分数弹字屏幕坐标和 favicon/preload 控制台噪声。

## 历史公告 - v1.0.0

### Controls

- Left/Right Arrow: To move left and right
- Up Arrow: To jump
- Down Arrow: To duck
- 1: City theme
- 2: Neon Theme
- g: Grey Scale
- f: Flashing Walls

### Features

- The World has two themes- City(Key 1) and Neon(Key 2)
- The player runs through the obstacle course followed by a police officer and a police dog collecting as many coins as he can
- The road is a 3 lane track which has various types of obstacles:
  - Trains: Move with a velocity and the game ends as soon as the player collides with one
  - Boxes: Big boxes lying on the road stop th player dead in the tracks and the game ends
  - Stop1: The player has to duck below these obstacles.
  - Stop2: The player has to jump above these obstacles.
  - Ropes: These extend over all the lanes. The player can jump over or duck below these obstacles.
- Power Ups:
  - Jumping Boots: Increases the jump height of the player for 10 seconds
  - Flying Boost: Enables the player to fly over the obstacles for 10 seconds
  - Hoverboard: Avoids all collisions for 10 seconds

### Shader Tasks

- Two different themes implemented
- Textures added to make realistic world
- Press g to turn the world greyscale
- Press f to make the walls flash
