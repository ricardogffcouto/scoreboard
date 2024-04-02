from flask import render_template, jsonify, request, url_for, redirect, make_response, abort
from app.lib.Player import Player
from app.lib.Match import Match
from app.lib.json_utils import encoder
from app import app
import pickle
import os
import requests
import json

MATCH = None

# ROUTES WITHOUT PAGES
@app.route('/api/update_players', methods = ['POST'])
def update_players():
    players = request.form.to_dict()['players']
    with open('./players', 'w') as file:
        json.dump(players, file)
    return players

@app.route('/api/update_competitions', methods = ['POST'])
def update_competitions():
    competitions = request.form.to_dict()['competitions']
    with open('./competitions', 'w') as file:
        json.dump(competitions, file)
    return competitions

@app.route('/api/db/get_player_by_member_id/<member_id>')
def get_player_from_database_by_member_id(member_id):
    if os.path.exists('./players'):
        with open('./players', 'r') as file:
            players = json.loads(json.load(file))
    for p in players:
        if p['member_id']==int(member_id):
            return jsonify(p)
    return abort(404)

@app.route('/api/db/get_player/<player_id>')
def get_player_from_database(player_id):
    if os.path.exists('./players'):
        with open('./players', 'r') as file:
            players = json.loads(json.load(file))
    for p in players:
        print(p)
        if p['id']==int(player_id):
            return jsonify(p)
    return abort(404)

@app.route('/api/db/get_competition/<competition_id>')
def get_competition_from_database(competition_id):
    if os.path.exists('./competitions'):
        with open('./competitions', 'r') as file:
            competitions = json.loads(json.load(file))
    for c in competitions:
        if c['id']==int(competition_id):
            return jsonify(c)
    return abort(404)

@app.route('/api/load_last_match')
def load_last_match():
    saved_matches = [files for root, dirs, files in os.walk(os.path.join(os.path.dirname(os.path.abspath(__file__)), "matches"), topdown=False)][0]
    if saved_matches:
        file_numbers = [int(filename.split("_")[1]) for filename in saved_matches]
        last_match = "match_{}".format(max(file_numbers))
        filename = os.path.join(os.path.dirname(os.path.abspath(__file__)), "matches", last_match)
        with open(filename, 'r') as file:
            data = json.load(file)
            global MATCH
            MATCH = Match()
            MATCH.from_JSON(data)
            return make_response(jsonify(MATCH.toJSON()), 200)
    return abort(404)

@app.route('/api/create_match', methods = ['POST'])
def create_match():
    global MATCH
    data = request.form.to_dict()
    
    url = None
    if 'id' in data:
        url = int(data['id'])

    player_1_data = json.loads(data['player_1'])
    player_2_data = json.loads(data['player_2'])

    total_reds = 15
    if data['total_reds']:
        total_reds = int(data['total_reds'])

    best_of = None
    if data['best_of']:
        best_of = int(data['best_of'])

    player_1 = Player(url=player_1_data['id'], firstName=player_1_data['first_name'], lastName=player_1_data['last_name'], member_id=player_1_data['member_id'])
    player_2 = Player(url=player_2_data['id'], firstName=player_2_data['first_name'], lastName=player_2_data['last_name'], member_id=player_2_data['member_id'])
    MATCH = Match(url=url, player1=player_1, player2=player_2, total_reds=total_reds, bestOf=best_of)
    MATCH.start()
    return jsonify(MATCH.toJSON())

@app.route('/end_frame_pot')
def end_frame_pot():
    if MATCH.can_end_frame():
        pot = MATCH.endFrame()
        save_match()
        return jsonify(pot.toJSON())
    else:
        return redirect(url_for('end_frame'))

@app.route('/new_frame')
def new_frame():
    if MATCH.can_end_frame():
        MATCH.new_frame()
        return redirect(url_for('scoreboard'))
    else:
        return redirect(url_for('end_frame'))

@app.route('/_scoreboard_data')
def scoreboard_data():
    return jsonify(MATCH.scoreboard_data_json())

@app.route('/_frame_stats')
def frame_stats():
    return jsonify(MATCH.currentFrame().stats())

@app.route('/_match_stats')
def match_stats():
    return jsonify(MATCH.stats())

def save_match():
    filename = os.path.join(os.path.dirname(os.path.abspath(__file__)), "matches", MATCH.filename) 
    with open(filename, 'w') as file:
        json.dump(MATCH, file, default=encoder, indent=4, sort_keys=True)

@app.route('/ball/<value>')
def ball(value):
    pot = MATCH.currentFrame().currentBreak().pot(value=int(value))
    if pot:
        save_match()
        return jsonify(pot.toJSON())
    return abort(400)

@app.route('/ball_manual/<value>')
def ball_manual(value):
    pot = MATCH.currentFrame().currentBreak().pot(value=int(value), manual=True)
    save_match()
    return jsonify(pot.toJSON())

@app.route('/free_ball/<value>')
def free_ball(value):
    pot = MATCH.currentFrame().currentBreak().freeBall(value=int(value))
    save_match()
    return jsonify(pot.toJSON())

@app.route('/end_break')
def end_break():
    pot = MATCH.currentFrame().endBreak()
    save_match()
    return jsonify(pot.toJSON())

@app.route('/foul/<value>')
def foul(value):
    pot = MATCH.currentFrame().currentBreak().gotFoul(value=int(value))
    MATCH.currentFrame().newBreakSamePlayer()
    save_match()
    return jsonify(pot.toJSON())

@app.route('/undo')
def undo():
    undone_balls = MATCH.currentFrame().undo()
    if undone_balls:
        save_match()
        return jsonify([pot.toJSON() for pot in undone_balls])

@app.route('/remove_red')
def remove_red():
    pot = MATCH.currentFrame().currentBreak().removeRed()
    save_match()
    return jsonify(pot.toJSON())

@app.route('/set_duration', methods=["POST"])
def set_duration():
    data = request.form
    try:
        MATCH.duration = int(data["match_seconds"])
        MATCH.currentFrame().duration = int(data["frame_seconds"])
        save_match()
        return '', 204
    except:
        return '', 500


# PAGES

@app.route('/')
@app.route('/index')
def index():
    return render_template("index.html")

@app.route('/new_match')
def new_match():
    return render_template("new_match.html")

@app.route('/scoreboard')
def scoreboard():
    return render_template("scoreboard.html", data=MATCH.scoreboard_data())

@app.route('/end_frame')
def end_frame():
    return render_template("end_frame.html", stats=MATCH.currentFrame().stats(), frame=True, frame_number=MATCH.currentFrameId(), players = MATCH.players)

@app.route('/end_match')
def end_match():
    return render_template("end_frame.html", stats=MATCH.stats(), frame=False, frame_number=MATCH.currentFrameId(), players = MATCH.players)