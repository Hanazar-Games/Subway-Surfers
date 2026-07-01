# Subway Surfers

## 当前公告 - v1.1.2

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
