import {post_ball, change_page} from './lib/api.js'
import {open_overlay, close_overlay} from './lib/hold.js'

var FRAME_DRAW = false

function draw_break_balls(data) {
    $('#break-div').empty();
    var ball;
    var brk;
    for (brk of data.balls) {
        for (ball of brk.break) {
            ball = JSON.parse(ball)
            if (!ball.end_break && !ball.end_match) {
                let text = ""
                let value = ball.value
                let player = 1

                if (value == 0) {
                    continue
                }
                if (ball.freeBall) {
                    text = "FB"
                } else if (ball.redIllegalPot) {
                    text = "-1"
                } else if (ball.foul) {
                    text = "F"
                    value = 'foul'
                } else if (ball.manual) {
                    text = value.toString()
                    value = "foul"
                }

                if (brk.player == 1) {
                    player = 2
                }

                if (ball.redIllegalPot) {
                    player = 0
                }

                let html = '<div class="ball-size ball break-ball-margin ball-border ball-value-' + value + '" style="float: left;">' + text + '<div class="ball-player player_' + player + '-color"></div></div>'
                $('#break-div').append(html)
            }
        }
        $('#break-div').append('<span class="margin-between-breaks"></span>')
    }
}

$(window).on('keydown', function(event) {
    if ($('#newFrameModal').is(":visible")) {
        if (event.key == 'Enter' && !FRAME_DRAW) {
            try {
                $.getJSON('/end_frame_pot', data => terminate_frame(data));
            } catch (e) {
                change_page('new_frame')
            }
        } else if (event.key == 'Backspace') {
            $('#newFrameModal').modal('hide')
        } 
    } else {
        if (event.key == 'Enter' && !FRAME_DRAW) {
            $('#newFrameModal').modal('show');
        } else if (event.key == 'Backspace') {
            change_page("scoreboard")
        } else if (event.key == '9' && !FRAME_DRAW) {
            change_page("end_match")
        }
    }
});

$( document ).ready(function() {
    $.getJSON('/_frame_stats',
        function(data) {
            FRAME_DRAW = data.draw
            draw_break_balls(data)
    });
    return false;
});

async function terminate_frame(data) {
    open_overlay("A terminar frame...")
    try {
        await post_ball(data)
    } catch (e) {
        console.log(e)
    }
    close_overlay()
    await change_page("new_frame")
}