import {create_match, start_match, get_player_by_member_id, TOKEN, API_URL, change_page} from './lib/api.js'
import {open_overlay, close_overlay} from './lib/hold.js'

var INPUT = ""
var CURRENT = 0;
var BLOCK_KEYS = false
var options = {
    theme:"sk-bounce",
    textColor:"white"
};

$(document).ready(function(){
    highlight_current()
    $("#reds-in-table").find(".nm-id").html("15")
})

$(window).on('keydown', function(event) {
    if ($('#matchNotCreatedModal').is(':visible')) {
        $('#matchNotCreatedModal').modal('hide')
        if (event.key == 'Enter') {
            create_offline_match().then(() => {
                change_page("scoreboard")
            }).catch((e) => {
                console.log(e)
                $('#matchNotCreatedModal').modal('show')
            })
        }
        return
    }
    if (!BLOCK_KEYS && !$('#holdon-overlay').is(":visible")) {
        BLOCK_KEYS = true
        if (INPUT == "0") {
            INPUT = ""
        }
        if (event.key == '1' || event.key == '2' || event.key == '3' || event.key == '4' || event.key == '5' || event.key == '6' || event.key == '7' || event.key == '8' || event.key == '9') {
            if (CURRENT == 4) {
                if (event.key == '1') {
                    INPUT = "15"
                } else if (event.key == '2') {
                    INPUT = "10"
                } else if (event.key == '3') {
                    INPUT = "6"
                }
            } else {
                INPUT += event.key
                if (CURRENT == 0) {
                    $("#player-1").find(".nm-name").html("")
                } else if (CURRENT == 1) {
                    $("#player-2").find(".nm-name").html("")
                }
            }
        } else if (event.key == '.' && INPUT.length > 0) {
            INPUT += "0"
        } else if (event.key == 'Backspace') {
            if (CURRENT == 0 && INPUT == "" && $("#player-1").find(".nm-name").html() == "") {
                window.location = "/";
            }
            var PREV_INPUT = INPUT
            INPUT = INPUT.slice(0, -1)
            if (CURRENT == 0) {
                $("#player-1").find(".nm-name").html("")
            } else if (CURRENT == 1) {
                $("#player-2").find(".nm-name").html("")
                if (PREV_INPUT == "") {
                    $("#player-2-id").html(INPUT)
                    CURRENT = 0
                    INPUT = $("#player-1-id").html()
                }
            } else if (CURRENT == 2) {
                $("#competition").find(".nm-name").html("")
                if (PREV_INPUT == "") {
                    $("#competition-id").html(INPUT)
                    CURRENT = 1
                    INPUT = $("#player-2-id").html()
                }
            } else if (CURRENT == 3) {
                $("#best-of").find(".nm-name").html("")
                if (PREV_INPUT == "") {
                    $("#best-of").find(".nm-id").html(INPUT)
                    CURRENT = 2
                    INPUT = $("#competition-id").html()
                }
            } else if (CURRENT == 4) {
                CURRENT = 3
                INPUT = $("#best-of").find(".nm-id").html()
            }
        } else if (event.key == 'Enter') {
            if (CURRENT == 0) {
                CURRENT = 1
                set_player(1)
                INPUT = $("#player-2-id").html()
            } else if (CURRENT == 1) {
                CURRENT = 2
                set_player(2)
                INPUT = $("#competition-id").html()
            } else if (CURRENT == 2) {
                CURRENT = 3
                set_competition()
                INPUT = $("#best-of").find(".nm-id").html()
            } else if (CURRENT == 3) {
                CURRENT = 4
                set_best_of()
                INPUT = $("#reds-in-table").find(".nm-id").html()
            } else if (CURRENT == 4) {
                if ($("#reds-in-table").find(".nm-id").html() == "") {
                    INPUT = "15"
                } else {
                    open_overlay("Criando jogo...")
                    create_online_match()
                }
            } 
        }
        if (INPUT == "" || ((INPUT.charAt(0) == "0" && INPUT.length == 1))) {
            INPUT = ""
        }
        if (parseInt(INPUT) > 199) {
            INPUT = INPUT.slice(0, -1)
        }
        if (CURRENT == 0) {
            $("#player-1-id").html(INPUT)
        } else if (CURRENT == 1) {
            $("#player-2-id").html(INPUT)
        } else if (CURRENT == 2) {
            $("#competition-id").html(INPUT)
        }  else if (CURRENT == 3) {
            $("#best-of").find(".nm-id").html(INPUT)
        }  else if (CURRENT == 4) {
            if (INPUT == "") {
                INPUT = $("#reds-in-table").find(".nm-id").html()
            }
            $("#reds-in-table").find(".nm-id").html(INPUT)
        }

        BLOCK_KEYS = false
    }
    highlight_current()
})

function highlight_current() {
    $(".nm-field").each(function(i) {
        var arrow = $(this).find(".nm-arrow")
        var input = $(this).find(".nm-input")
        arrow.hide()
        input.removeClass("border border-warning border-3 rounded-lg")
        if (i == CURRENT) {
            arrow.show()
            input.addClass("border border-warning border-3 rounded-lg")
        }
    }
    );
}

function set_player(player_order) {
    get_player_by_member_id($("#player-" + player_order).find(".nm-id").html(), player_order).then(
        data => {
            $("#player-" + player_order).find(".nm-name").html(data.first_name + " " + data.last_name)
            if (data.first_name == "Jogador" && (data.last_name == "A" || data.last_name == "B")) {
                $("#player-" + player_order).find(".nm-id").html("")
            }
        }
    )
}

function set_best_of() {
 let best_of = parseInt($("#best-of").find(".nm-id").html())
 if (!(best_of % 2)) {
    $("#best-of").find(".nm-id").html("")
 } else {
    if (best_of == 1) {
        $("#best-of").find(".nm-name").html("FRAME")
    } else {
        $("#best-of").find(".nm-name").html("FRAMES")
    }
 }
}

function set_competition() {
    if ($("#competition-id").html()) {
        $.ajax({
            url: API_URL + "phases/" + $("#competition-id").html() + "/",
            type: 'GET',
            dataType: 'json',
            headers: {
                'Authorization' : 'Token ' + TOKEN,
            },
            success: data => {
                $("#competition").find(".nm-name").html(data.scoreboard_name)
            },
            error: e => {
                $.getJSON("/api/db/get_competition/" + $("#competition-id").html(),
                    data => {
                        $("#competition").find(".nm-name").html(data.scoreboard_name)
                    }).fail( () => {
                        $("#competition").find(".nm-name").html("Amigável")
                    })
                }
        })
    } else {
        $("#competition").find(".nm-name").html("Amigável")
    }
}

async function create_offline_match() {
    let player_1 = await get_player_by_member_id($("#player-1").find(".nm-id").html(), 1)
    let player_2 = await get_player_by_member_id($("#player-2").find(".nm-id").html(), 2)
    let competition = $("#competition").find(".nm-id").html()
    let best_of = $("#best-of").find(".nm-id").html()
    let total_reds = $("#reds-in-table").find(".nm-id").html()
    let match_data = {
        'player_1': JSON.stringify(player_1),
        'player_2': JSON.stringify(player_2),
        'competition_phase': competition,
        'best_of': best_of,
        'total_reds': total_reds
    }
    return await start_match(match_data)
}

async function create_online_match() {
    let player_1 = await get_player_by_member_id($("#player-1").find(".nm-id").html(), 1)
    let player_2 = await get_player_by_member_id($("#player-2").find(".nm-id").html(), 2)
    let competition = $("#competition").find(".nm-id").html()
    let best_of = $("#best-of").find(".nm-id").html()
    let total_reds = $("#reds-in-table").find(".nm-id").html()
    try {
        let match = await create_match(player_1.id, player_2.id, competition, total_reds, best_of)
        await start_match(match)
        change_page("scoreboard")
    }
    catch (e) {
        console.log(e)
        $('#matchNotCreatedModal').modal('show')
    }
    close_overlay()
}