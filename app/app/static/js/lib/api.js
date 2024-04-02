// export var API_URL = "http://127.0.0.1:8000/api/"
// export var TOKEN = "ce434a40351e44c7a873724b1ca42bb70f64db65"
export var API_URL = "http://104.248.253.118/api/"
export var TOKEN = "dd126a5e60127c7746197b77cc0ba69ce39416fb"

export function ping() {
    return $.getJSON(API_URL)
}

export async function update_players() {
    await $.ajax({
        url: API_URL + "profiles/",
        type: 'GET',
        dataType: 'json',
        headers: {
            'Authorization' : 'Token ' + TOKEN,
        },
        timeout: 3000,
        success: (data) => {
        $.post("api/update_players", {
            players: JSON.stringify(data)
            })
        },
        error: e => console.log(e)
    })
    return "Update players done"
}

export async function update_competitions() {
    await $.ajax({
        url: API_URL + "phases/",
        type: 'GET',
        dataType: 'json',
        headers: {
            'Authorization' : 'Token ' + TOKEN,
        },
        timeout: 3000,
        success: (data) => {
            $.post("api/update_competitions", {
                competitions: JSON.stringify(data)
            })
        },
        error: e => console.log(e)
    })
    return "Update competitions done"
}

export async function get_player_by_member_id(member_id, player_order) {
    try {
        return await $.ajax({
            url: API_URL + "profiles/member_id/" + member_id + "/",
            type: 'GET',
            dataType: 'json',
            headers: {
                'Authorization' : 'Token ' + TOKEN,
            },
            timeout: 3000,
        })
    } catch (err) {
        try {
            return await $.getJSON("/api/db/get_player_by_member_id/" + member_id)
        } catch (err) {
            return await default_player(player_order)
        }
    }
}

export async function get_player(id, player_order) {
    try {
        return await $.ajax({
            url: API_URL + "profiles/" + id + "/",
            type: 'GET',
            dataType: 'json',
            headers: {
                'Authorization' : 'Token ' + TOKEN,
            },
            timeout: 3000
        })    
    } catch (err) {
        try {
            return await $.getJSON("/api/db/get_player/" + id)
        } catch (err) {
            return await default_player(player_order)
        }
    }
}

export async function get_match(id) {
    try {
        return await $.ajax({
            url: API_URL + "matches/" + id + "/",
            type: 'GET',
            dataType: 'json',
            headers: {
                'Authorization' : 'Token ' + TOKEN,
            },
            timeout: 3000
        })    
    } catch (err) {
        console.log(err)
        return null
    }
}

function default_player(player_order) {
    let player = {
        'first_name': 'Jogador',
        'member_id': 0,
        'url': 0,
        'id': 0,
    }
    if (player_order == 1) {
        player.last_name = 'A'
    } else {
        player.last_name = 'B'
    }
    return player
}

export async function get_competition(competition_id) {
    try {
        return await $.ajax({
            url: API_URL + "phases/" + competition_id + "/",
            type: 'GET',
            dataType: 'json',
            headers: {
                'Authorization' : 'Token ' + TOKEN,
            },
            timeout: 3000
        })    
    } catch (err) {
        try {
            return await $.getJSON("/api/db/get_competition/" + competition_id)
        } catch (err) {
            return {'id': 0, 'scoreboard_name': 'Amigável'}
        }
    }
}

export async function create_match(player_1_id, player_2_id, competition, total_reds, best_of) {
    let player_1 = await get_player(player_1_id, 1)
    let player_2 = await get_player(player_2_id, 2)
    let data = {
        'player_1': player_1.id,
        'player_2': player_2.id,
        'total_reds': total_reds,
        'best_of': best_of,
        'competition_phase': competition,
    }
    return await $.ajax({
        url: API_URL + "matches/",
        type: 'POST',
        headers: {
            'Authorization' : 'Token ' + TOKEN,
        },
        data: data,
        success: async match => {
            match.player_1 = JSON.stringify(player_1)
            match.player_2 = JSON.stringify(player_2)
            return match;
        },
        error: async e => {
            console.log(e)
            data.player_1 = JSON.stringify(player_1)
            data.player_2 = JSON.stringify(player_2)
            return data;
        }
    })
}

export async function start_match(match) {
    let match_data = await $.post("api/create_match", 
        match, async (match_data) => {
            return match_data;
    }).fail((e) => {
        console.log(e)
        return false;
    })
    if (match_data) {
        let match_json = JSON.parse(match_data)
        if (match_json.url) {
            let patch = {
                'start_time': match_json.start_time
            }
            return await $.ajax({
                url: API_URL + 'matches/' + match_json.url + "/",
                type: 'PATCH',
                headers: {
                    'Authorization' : 'Token ' + TOKEN,
                },
                timeout: 3000,
                data: JSON.stringify(patch),
                processData: false,
                contentType: 'application/json',
                }).fail((e) => {
                    console.log(e)
                    return true
                });
        }
    } else {
        return false
    }

}

export async function end_match(match_id) {
    let now = new Date()
    let patch = {
        'end_time': now.toJSON()
    }
    console.log(JSON.stringify(patch))
    return $.ajax({
        type: 'PATCH',
        url: API_URL + 'matches/' + match_id + "/",
        headers: {
            'Authorization' : 'Token ' + TOKEN,
        },
        timeout: 3000,
        data: JSON.stringify(patch),
        processData: false,
        contentType: 'application/json',
        }).fail((e) => {
            console.log(e)
            return false
        });
}

export async function post_time(match_seconds, frame_seconds) {
    let data = {
        'match_seconds': match_seconds,
        'frame_seconds': frame_seconds
    }
    $.post('/set_duration', data,
    () => {
        return true
    });
}

export async function post_ball(ball) {
    return $.ajax({
        dataType: "json",
        url: API_URL + "balls/",
        headers: {
            'Authorization' : 'Token ' + TOKEN,
        },
        crossDomain: true,
        data: ball,
        contentType: "application/json; charset=utf-8",
        method: "POST",
        success: () => {
            post_scoreboard_data()
            return true
        },
        error: (e) => {
            console.log(e)
            post_scoreboard_data()
            return true
        },
        timeout: 3000
    })
}

export async function post_undo(ball) {
    console.log(ball)
    $.ajax({
        dataType: "json",
        url: API_URL + "balls/0/",
        headers: {
            'Authorization' : 'Token ' + TOKEN,
        },
        crossDomain: true,
        data: ball,
        contentType: "application/json; charset=utf-8",
        method: "DELETE",
        success: () => {
            post_scoreboard_data()
            return true
        },
        error: (e) => {
            console.log(e)
            post_scoreboard_data()
            return true
        },
        timeout: 3000
    })
}

function post_scoreboard_data() {
    $.getJSON('/_scoreboard_data', data => {
        let match_data = JSON.parse(data)
        data = {
            scoreboard_data: data
        }
        $.ajax({
            dataType: "json",
            url: API_URL + "matches/" + match_data.match.id + "/",
            headers: {
                'Authorization' : 'Token ' + TOKEN,
            },
            crossDomain: true,
            data: JSON.stringify(data),
            contentType: "application/json; charset=utf-8",
            method: "PATCH",
            success: function(data) {
                return true
            },
            error: function(xhr, status, error){
                return true
            },
            timeout: 3000
        })
});
}

export async function change_page(page) {
    window.location = "/" + page;
}