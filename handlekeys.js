// 游戏初始化完成标志，由 main.js 设置
var gameReady = false;

document.addEventListener(
    "keydown",
    event => {
        // 开场动画期间忽略键盘输入，避免访问未初始化变量
        if (!gameReady) {
            return;
        }
        key = event.keyCode;
        if (key == 39) {
            player.pos[0] += 6;
            police.pos[0] = player.pos[0];
        }
        if (key == 37) {
            player.pos[0] -= 6;
            police.pos[0] = player.pos[0];
        }
        if (key == 38) {
            if (player.pos[1] < -4) {
                player.pos[1] = -4;
            }
            jumping = true;
            ducking = false;
            player.speedy = 0.3;
        }
        if (key == 40) {
            if (player.fly_boost == false) {
                if (player.pos[1] != -4) {
                    player.pos[1] = -4;
                }
                ducking = true;
                jumping = false;
                player.speedy = 0.2;
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
                d = new Date();
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
                greyScale = false
        }
    },
    false
);
