# Subway Surfers

## 当前公告 - v1.1.0

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
