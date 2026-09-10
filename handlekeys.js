"use strict";
// 游戏初始化完成标志，由 main.js 设置
var gameReady = false;

// 显式声明 key，避免隐式全局变量
var key;
var d, flash_start_time;

document.addEventListener(
    "keydown",
    event => {
        // 开场动画期间忽略键盘输入，避免访问未初始化变量
        if (!gameReady) {
            return;
        }
        if (window.gamePaused || dying) {
            return;
        }
        if (event.target && event.target.closest && event.target.closest('button, input, select, textarea')) return;
        key = event.keyCode;
        if (event.repeat && (key === 70 || key === 71)) return;
        // 阻止方向键和空格滚动页面
        if ([32, 37, 38, 39, 40].indexOf(key) !== -1) {
            event.preventDefault();
        }
        // Only move/tilt/play sound when there is actually a lane to move into
        if (key == 39 && player.pos[0] < 6) {
            player.pos[0] += 6;
            police.pos[0] = player.pos[0];
            player.tilt = -0.25;
            if (typeof playBumpSound === 'function') playBumpSound();
        }
        if (key == 37 && player.pos[0] > -6) {
            player.pos[0] -= 6;
            police.pos[0] = player.pos[0];
            player.tilt = 0.25;
            if (typeof playBumpSound === 'function') playBumpSound();
        }
        // Ignore jump while already rising or while flying (prevents mid-air
        // jump refresh / sound spam and stale jump state after fly boost)
        if (key == 38 && player.grounded && !player.fly_boost) {
            if (ducking) player.pos[1] += 1;
            jumping = true;
            ducking = false;
            player.grounded = false;
            wasInAir = true;
            player.speedy = Math.sqrt(0.02 * (player.jumping_boots ? 7 : 4));
            if (typeof playJumpSound === 'function') playJumpSound();
        }
        if (key == 40) {
            if (player.fly_boost == false) {
                if (player.grounded) {
                    if (!ducking) player.pos[1] -= 1;
                    ducking = true;
                    duckTime = 0.45;
                } else {
                    player.speedy = -0.5;
                }
                jumping = false;
                if (typeof playBumpSound === 'function') playBumpSound();
            }
        }

        if (key == 49) {
            theme = 1;
            theme_flag = 1;
        }
        if (key == 50) {
            theme = 2;
            theme_flag = 1;
        }

        if (key == 70) {
            if (flashing == false) {
                flashing = true;
                greyScale = false;
                var d = new Date();
                flash_start_time = d.getTime() * 0.001;
            }
            else
                flashing = false;
        }
        if (key == 71) {
            if (greyScale == false) {
                greyScale = true;
                flashing = false;
            }
            else
                greyScale = false;
        }
    },
    false
);
