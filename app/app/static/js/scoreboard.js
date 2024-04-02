import {post_ball, post_time, post_undo, change_page, end_match} from './lib/api.js'

var MATCH_SECONDS = 0;
var FRAME_SECONDS = 0;
var FOUL = false;
var FREE_BALL = false;
var MANUAL = false;
var MANUAL_POINTS = "0";

function pad ( val ) {
    return val > 9 ? val : "0" + val;
}

function set_match_time() {
    ++MATCH_SECONDS;
    let match_minutes = parseInt((MATCH_SECONDS) / 60, 10)
    let minutes = match_minutes % 60
    let hours = parseInt(match_minutes / 60, 10)

    $("#match-time").html(hours + ":" + pad(minutes))
}

function set_frame_time() {
    ++FRAME_SECONDS
    let seconds = (FRAME_SECONDS) % 60
    let frame_minutes = parseInt((FRAME_SECONDS) / 60, 10)
    let minutes = frame_minutes % 60
    let hours = parseInt(frame_minutes / 60, 10)

    if (hours != 0) {
        $("#frame-time").html(hours + ":" + pad(minutes) + ":" + pad(seconds))
    } else {
        $("#frame-time").html(pad(minutes) + ":" + pad(seconds))
    }
}

function draw_break_balls(data) {
    $('#break-div').empty();
    var ball;
    for (ball of data.frame.break_balls) {
        if (!ball.end_break && !ball.end_frame) {
            let text = ""
            let value = ball.value
            if (ball.freeBall) {
                text = "FB"
            } else if (ball.red_illegal_pot) {
                text = "-1"
                value = "illegal"
            }
            let html = '<div class="ball-size ball break-ball-margin ball-border ball-value-' + value + '" style="float: left;">' + text + '</div></div>'
            $('#break-div').append(html)
        }
    }
}

function update_match_data() {
    $.getJSON("/_scoreboard_data",
    data => {
        let match_data = JSON.parse(data)
        $('#player-1-points').html(match_data.player_1.points);
        $('#player-2-points').html(match_data.player_2.points);
        $('#player-1-frames').html(match_data.player_1.frames);
        $('#player-2-frames').html(match_data.player_2.frames);
        $('#player-1-break').html(match_data.player_1.break);
        $('#player-2-break').html(match_data.player_2.break);
        $('#reds-in-table').removeClass('ball-value-1')
        $('#reds-in-table').html("");
        if (match_data.frame.reds_in_table >= 0) {
            $('#reds-in-table').html(match_data.frame.reds_in_table);
            $('#reds-in-table').addClass('ball-value-1')
        }
        if (match_data.match.best_of) {
            $('#best-of').html('(' + match_data.match.best_of + ')');
        }
        $('#points-in-table').html("(" + match_data.frame.points_in_table + ")");
        if (match_data.frame.enough_points_to_win || match_data.frame.points_in_table < 0) {
            $('#points-label, #points-in-table').removeClass('red')
            $('#points-label, #points-in-table').removeClass('yellow')
            if (match_data.frame.points_in_table < 0) {
                $('#points-in-table').html("");
            }
        } else if (match_data.frame.enough_points_to_draw) {
            $('#points-label, #points-in-table').removeClass('red')
            $('#points-label, #points-in-table').addClass('yellow')
        } else {
            $('#points-label, #points-in-table').addClass('red')
            $('#points-label, #points-in-table').removeClass('yellow')
        }
        FOUL = false;
        FREE_BALL = false;
        MANUAL = false;
        $('#mod').html("")
        draw_break_balls(match_data)
        MATCH_SECONDS = match_data.match.duration
        FRAME_SECONDS = match_data.frame.duration
    });
}

$(window).on('keydown', function(event) {
    if (MANUAL) {
        if (MANUAL_POINTS == "0") {
            MANUAL_POINTS = ""
        }
        if (event.key == '1' || event.key == '2' || event.key == '3' || event.key == '4' || event.key == '5' || event.key == '6' || event.key == '7' || event.key == '8' || event.key == '9') {
            MANUAL_POINTS += event.key
        } else if (event.key == '.' && MANUAL_POINTS.length > 0) {
            MANUAL_POINTS += event.key
        } else if (event.key == 'Backspace') {
            MANUAL_POINTS = MANUAL_POINTS.slice(0, -1)
        } else if (event.key == "/") {
            MANUAL = false
            MANUAL_POINTS = "0"
            $('#mod').html("")
        } else if (event.key == 'Enter') {
            $.getJSON('/ball_manual/' + parseInt(MANUAL_POINTS),
            data => {
                MANUAL = false
                MANUAL_POINTS = "0"
                $('#mod').html("")
                post_ball(data)
                $.getJSON('/end_break',
                    data => {
                        if (data.length) {
                            post_ball(data)
                        }
                        update_match_data()
                    })
            });
        }
        if (MANUAL_POINTS == "" || ((MANUAL_POINTS.charAt(0) == "0" && MANUAL_POINTS.length == 1))) {
            MANUAL_POINTS = "0"
        }
        if (parseInt(MANUAL_POINTS) > 155) {
            MANUAL_POINTS = MANUAL_POINTS.slice(0, -1)
        }
        if ($("#player-1-break").html() == "") {
            $("#player-2-break").html(MANUAL_POINTS)
        } else {
            $("#player-1-break").html(MANUAL_POINTS)
        }

    } else {
        if (event.key == '1' || event.key == '2' || event.key == '3' || event.key == '4' || event.key == '5' || event.key == '6' || event.key == '7') {
            $(function() {
                if (FOUL) {
                    $.getJSON('/end_break',
                    data => {
                        if (data.length) {
                            post_ball(data)
                            update_match_data()
                            $.getJSON("/foul/" + (parseInt(event.key)),
                            data => {
                                if (data.length) {
                                    post_ball(data)
                                    update_match_data()
                                }
                            });
                        }
                    });
 
                } else if (FREE_BALL) {
                    $.getJSON("/free_ball/" + (parseInt(event.key)),
                    data => {
                        if (data.length) {
                            post_ball(data)
                            update_match_data()
                        }
                    });
                } else {
                    $.getJSON("/ball/" + (parseInt(event.key)),
                    data => {
                        post_ball(data)
                        update_match_data()
                    }).fail(
                        e => console.log(e)
                    );
                }
            });
        // Key f (FOUL)
        } else if (event.key == "-") {
            $.getJSON('/_scoreboard_data',
            data => {
                let match_data = JSON.parse(data)
                if (match_data.frame.allowed_mods.foul) {
                    FOUL = !FOUL
                    FREE_BALL = false
                    MANUAL = false
                    if (FOUL) {
                        $('#mod').html("FALTA")
                    } else {
                        $('#mod').html("")
                    }
                }
            });
        } else if (event.key == "+") {
            $.getJSON('/_scoreboard_data',
            data => {
                let match_data = JSON.parse(data)
                if (match_data.frame.allowed_mods.freeball) {
                    FREE_BALL = !FREE_BALL
                    FOUL = false
                    MANUAL = false
                    if (FREE_BALL) {
                        $('#mod').html("FREE BALL")
                    } else {
                        $('#mod').html("")
                    }
                }
            });
        } else if (event.key == "/") {
            $.getJSON('/_scoreboard_data',
            data => {
                let match_data = JSON.parse(data)
                if (match_data.frame.allowed_mods.manual) {
                    MANUAL = true
                    FOUL = false
                    FREE_BALL = false
                    if (MANUAL) {
                        $('#mod').html("MANUAL")
                    } else {
                        $('#mod').html("")
                    }
                }
            });
         } else if (event.key == 'Backspace') {
            if ($('#player-1-points').html() == "0" && $('#player-2-points').html() == "0") {
                change_page("end_match")
            } else {
                $.getJSON('/undo',
                data => data.forEach(
                    ball => {
                        post_undo(ball)
                        update_match_data()
                    })
                );
            }

        } else if (event.key == 'Tab') {
            $.getJSON('/remove_red',
            data => {
                post_ball(data)
                update_match_data()
            });
        }
        else if (event.key == 'Enter') {
            $.getJSON('/end_break',
            data => {
                post_ball(data)
                update_match_data()
            });
        }
        else if (event.key == '0') {
            change_page("end_frame");
        }
        return false;
    }
});

$( document ).ready(function() {
    $.getJSON('/_scoreboard_data',
        () => {
            update_match_data()
    });
    // Match and frame time
    setInterval(
        () => {
            set_match_time()
            set_frame_time()
            post_time(MATCH_SECONDS, FRAME_SECONDS)
        }, 1000);
    return false;
});