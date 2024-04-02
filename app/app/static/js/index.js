import {update_players, update_competitions, ping, get_player, get_competition, start_match, get_match, TOKEN, API_URL} from './lib/api.js'
import {open_overlay, close_overlay} from './lib/hold.js'

var MATCH_ID = ""
var BLOCK_KEYS = false

open_overlay('A atualizar base de dados interna...')
Promise.all([update_players(), update_competitions()]).catch(e => console.log(e)).then(close_overlay())

$(window).on('keydown', function(event) {
    if (!BLOCK_KEYS && !$('#holdon-overlay').is(":visible")) {
        BLOCK_KEYS = true
        if ($('#choicesModal').is(':visible')) {
            if (event.key == 'Enter') {
                $('#choicesModal').modal('hide');
                window.location = "/new_match";
            } else if (event.key == '.') {
                $('#choicesModal').modal('hide');
                open_overlay('Verificando último jogo...')
                $.getJSON("/api/load_last_match",
                (match_data) => {
                    let data = JSON.parse(match_data)
                    open_load_last_game_modal(data)
                }).fail(() => {
                    $('#lastMatchNotFoundModal').modal('show');
                    BLOCK_KEYS = false
                }).always(close_overlay())
            } else if (event.key == '9') {
                $('#choicesModal').modal('hide');
                ping().done(() => {
                    $('#findGameModal').modal('show');
                }).fail((e) => {
                    console.log(e)
                    $("#notConnectedModal").modal("show")
                })
                
                
            } else if (event.key == 'Backspace') {
                $('#choicesModal').modal('hide');
            }
        } else if ($("#findGameModal").is(":visible")) {
            if (event.key == '1' || event.key == '2' || event.key == '3' || event.key == '4' || event.key == '5' || event.key == '6' || event.key == '7' || event.key == '8' || event.key == '9') {
                MATCH_ID += event.key
                if (MATCH_ID == "" || ((MATCH_ID.charAt(0) == "0" && MATCH_ID.length == 1))) {
                    MATCH_ID = ""
                }
                if (parseInt(MATCH_ID) > 999999) {
                    MATCH_ID = MATCH_ID.slice(0, -1)
                }
            } else if (event.key == '.' && MATCH_ID.length > 0) {
                MATCH_ID += "0"
            } else if (event.key == 'Backspace') {
                if (MATCH_ID == "") {
                    $("#findGameModal").modal("hide");
                    $("#choicesModal").modal("show");
                }
                MATCH_ID = MATCH_ID.slice(0, -1)
            } else if (event.key == 'Enter' && $("#load-match").find(".nm-id").html() != "") {
                $("#findGameModal").modal('hide')
                open_overlay("A procurar jogo...")
                find_match().then((data) => {
                    if (data) {
                        open_load_game_modal(data)
                    } else {
                        $("#matchNotValidModal").modal("show")
                    }
                }).catch((e) => {
                    if (e.status == 500) {
                        $("#notConnectedModal").modal("show")
                    } else {
                        $("#matchNotFoundModal").modal("show")
                    }
                }).finally(
                    close_overlay()
                )
            }
            if (MATCH_ID == "") {
                $("#findGameModal").find(".key-back").find(".key-label").html("Recuar")
                $("#findGameModal").find(".key-enter").hide()
            } else {
                $("#findGameModal").find(".key-back").find(".key-label").html("Apagar")
                $("#findGameModal").find(".key-enter").show()
            }
    
            $("#load-match").find(".nm-id").html(MATCH_ID)
        } else if ($('#loadGameModal').is(':visible')) {
            if (event.key == 'Backspace') {
                $('#loadGameModal').modal('hide');
                $('#findGameModal').modal('show');
            } else if (event.key == 'Enter') {
                $('#loadGameModal').modal('hide');
                find_match().then((match_data) => {
                    match_data.player_1 = JSON.stringify(match_data.player_1)
                    match_data.player_2 = JSON.stringify(match_data.player_2)
                    start_match(match_data).then(() => {
                        window.location = "/scoreboard";
                    }).catch((e) => {
                        console.log(e)
                        $('#matchNotFoundModal').modal('show')
                    })
                })
            }
        } else if ($("#matchNotFoundModal").is(':visible')) {
            if (event.key == 'Backspace') {
                $('#matchNotFoundModal').modal('hide');
                $('#findGameModal').modal('show');
            }
        } else if ($("#lastMatchNotFoundModal").is(':visible')) {
            if (event.key == 'Backspace') {
                $("#lastMatchNotFoundModal").modal('hide');
                $('#choicesModal').modal('show');
            }
        }  else if ($("#notConnectedModal").is(':visible')) {
            if (event.key == 'Backspace') {
                $("#notConnectedModal").modal('hide');
            }
        }  else if ($("#matchNotValidModal").is(':visible')) {
            if (event.key == 'Backspace') {
                $("#matchNotValidModal").modal('hide');
                $('#findGameModal').modal('show');
            }
        } else if ($("#loadLastGameModal").is(':visible')) {
            open_overlay("A procurar jogo...")
            if (event.key == 'Backspace') {
                $('#loadLastGameModal').modal('hide');
            } else if (event.key == 'Enter') {
                $('#loadLastGameModal').modal('hide');
                window.location = "/scoreboard";
            }
        }
        else {
            if (event.key == 'Enter') {
                $('#choicesModal').modal('show');
            }
        }
    }
    BLOCK_KEYS = false
});

async function find_match() {
    let match = await $.ajax({
        url: API_URL + "matches/" + MATCH_ID + "/",
        type: 'GET',
        dataType: 'json',
        headers: {
            'Authorization' : 'Token ' + TOKEN,
        }
    })
    match.player_1 = await get_player(match.player_1, 1)
    match.player_2 = await get_player(match.player_2, 2)
    return match
}

async function open_load_game_modal(data) {
    let competition = await get_competition(data.competition)
    let best_of = await set_best_of_text(data.best_of)
    $("#loadGameModal").find(".modal-title").html("Jogo " + data.id)
    $("#loadGameModal").find(".load-game-information").html(competition.name + best_of)
    $("#loadGameModal").find(".load-game-players").html(data.player_1.first_name + " " + data.player_1.last_name + " x " + data.player_2.first_name + " " + data.player_2.last_name)
    $("#loadGameModal").modal("show")
}

async function open_load_last_game_modal(data) {
    let best_of = await set_best_of_text(data.best_of)
    $("#loadLastGameModal").find(".modal-title").html("Jogo " + data.url)
    $("#loadLastGameModal").find(".load-game-information").html(best_of)
    $("#loadLastGameModal").find(".load-game-players").html(data.players[0].first_name + " " + data.players[0].last_name + " x " + data.players[1].first_name + " " + data.players[1].last_name)
    $("#loadLastGameModal").modal("show")
}

async function set_best_of_text(best_of) {
    if (best_of) {
        if (best_of == 1) {
            return " - À melhor de " + best_of + " frame"
        } else {
            return " - À melhor de " + best_of + " frames"
        }
    } else {
        return ""
    }
}