import {post_ball, end_match, change_page} from './lib/api.js'
import {open_overlay, close_overlay} from './lib/hold.js'

function draw_highest_break(data) {
    $('#break-div').empty();
    var ball;
    for (ball of data.highest_break.balls) {
        ball = $.parseJSON(ball)
        if (!ball.end_break && !ball.end_match) {
            let text = ""
            let value = ball.value
            let player;
            if (ball.freeBall) {
                text = "FB"
            } else if (ball.redIllegalPot) {
                text = "-1"
            } else if (ball.foul) {
                text = "F"
                value = 'foul'
            }
    
            if (data.highest_break.player == 0) {
                player = 1
            } else {
                player = 2
            }
            if (ball.redIllegalPot) {
                player = 0
            }
            let html = '<div class="ball-size ball break-ball-margin ball-border ball-value-' + value + '" style="float: left;">' + text + '<div class="ball-player player_' + player + '-color"></div></div>'
            $('#break-div').append(html)
        }
    }
}

$(window).on('keydown', function(event) {
    if ($('#endMatchModal').is(":visible")) {
        if (event.key == 'Enter') {
            try {
                $.getJSON('/end_frame_pot', data => terminate_match(data));
            } catch (e) {
                console.log(e)
                change_page('index')
            }
        } else if (event.key == 'Backspace') {
            $('#endMatchModal').modal('hide')
        } 
    } else {
        if (event.key == 'Backspace') {
            window.location = "/end_frame";
        } else if (event.key == '0') {
            $('#endMatchModal').modal('show');
        }
    }   
});

async function terminate_match(data) {
    open_overlay("A terminar encontro...")
    try {
        await post_ball(data)
        let match = await $.getJSON("/_scoreboard_data")
        let match_id = JSON.parse(match).match.id
        await end_match(match_id)
    } catch (e) {
        console.log(e)
    }
    close_overlay()
    await change_page('index')
}

$( document ).ready(function() {
    $.getJSON('/_match_stats',
        function(data) {
            draw_highest_break(data)
    });
    return false;
});