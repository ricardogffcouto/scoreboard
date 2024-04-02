#!/usr/bin/python
# -*- coding: utf-8 -*

from builtins import object
from . import Ball, Frame, Break, Player, json_utils
import json
from datetime import datetime
import os

class Match(object):
    """docstring for Match"""
    def _json_fields(self):
        match = {
            "url" : self.url,
            "players" : self.players,
            "best_of" : self.bestOf,
            "frames" : self.frames,
            "duration" : self.duration,
            "total_reds" : self.total_reds,
            "start_time" : self.start_time,
            "filename" : self.filename,
        }
        return match
    
    def toJSON(self):
        return json.dumps(self, default=json_utils.encoder, indent=4, sort_keys=True)

    def from_JSON(self, data):
        self.url = data['url']
        for i, player in enumerate(data['players']):
            self.players[i] = Player.Player(player['first_name'], player['last_name'], player['url'], player['member_id'])
        for frame in data['frames']:
            self.frames.append(Frame.Frame(self.players, self, frame['id'], [], frame['start_time'], frame['duration']))
            for brk in frame['breaks']:
                player = self.players[0]
                if brk['player']['url'] == self.players[1].url:
                    player = self.players[1]
                self.frames[-1].breaks.append(Break.Break(player, self.frames[-1], self, brk['id'], [], brk['start_time']))
                for ball in brk['balls']:
                    brk_obj = self.frames[-1].breaks[-1]
                    self.frames[-1].breaks[-1].potted.append(Ball.Ball(self, brk_obj, ball['order'], ball['value'], ball['end_break'],  ball['free_ball'], ball['foul'], ball['manual'], ball['is_last_red'], ball['is_final_sequence'], ball['red_illegal_pot'], ball['end_frame'], ball['pot_time']))
        self.bestOf = data['best_of']
        self.duration = data['duration']
        self.total_reds = data['total_reds']
        self.start_time = data['start_time']
        self.filename = data['filename']

    def duration_to_time(self, seconds, match=True):
        m, s = divmod(seconds, 60)
        h, m = divmod(m, 60)
        if match:
            return "%d:%02d" % (h, m)
        if h == 0:
            return "%02d:%02d" % (m, s)
        return "%d:%02d:%02d" % (h, m, s)

    def totalPoints(self):
        points = [0, 0]
        for frame in self.frames:
            score = frame.score()
            points[0] += score[0]
            points[1] += score[1]

        return points

    def highest_break_per_player(self):
        breaks = [0, 0]
        for frame in self.frames:
            highestBreaks = frame.highest_break_per_player()
            if breaks[0] < highestBreaks[0]:
                breaks[0] = highestBreaks[0]
            if breaks[1] < highestBreaks[1]:
                breaks[1] = highestBreaks[1]

        return breaks

    def highest_break(self):
        highest_break = max(self.highest_break_per_player())
        for frame in self.frames:
            for brk in frame.breaks:
                if brk.breakPoints() == highest_break:
                    return brk

    def highest_break_balls_with_player(self):
        brk = self.highest_break()
        balls = {
            'player': 0 if brk.player == self.players[0] else 1,
            'balls': [ball.toJSON() for ball in brk.potted]
        }
        return balls

    def score(self):
        score = [0, 0]
        if len(self.frames) > 1:
            frames = self.frames[:-1]
            for frame in frames:
                if frame.score()[0] > frame.score()[1]:
                    score[0] += 1
                elif frame.score()[0] < frame.score()[1]:
                    score[1] += 1

        return score

    def currentScore(self):
        score = [0, 0]
        for frame in self.frames:
            if frame.score()[0] > frame.score()[1]:
                score[0] += 1
            elif frame.score()[0] < frame.score()[1]:
                score[1] += 1

        return score

    def currentFrame(self):
        return self.frames[-1]

    def currentFrameId(self):
        frame_id = 1
        return frame_id + len(self.frames)

    def currentBreakId(self):
        break_id = 1
        for frame in self.frames:
            break_id += len(frame.breaks)
        return break_id

    def currentBallId(self):
        ball_id = 1
        for frame in self.frames:
            for brk in frame.breaks:
                ball_id += len(brk.potted)
        return ball_id

    def frame_id(self, frame):
        if frame in self.frames:
            return self.frames.index(frame) + 1
        return None

    def break_id(self, brk):
        break_id = 0
        for frame in self.frames:
            if brk in frame.breaks:
                break_id += frame.breaks.index(brk) + 1
                return break_id
            break_id += len(frame.breaks)
        return break_id

    def ball_order(self, ball):
        ball_id = 0
        for frame in self.frames:
            for brk in frame.breaks:
                if ball in brk.potted:
                    ball_id += brk.potted.index(ball) + 1
                    return ball_id
                ball_id += len(brk.potted)
        return ball_id

    def lastFrame(self):
        return self.frames[-2]

    def can_end_frame(self):
        if self.currentFrame().score()[0] != self.currentFrame().score()[1]:
            return True
        return False

    def endFrame(self):
        if self.can_end_frame():
            pot = self.currentFrame().create_end_frame_ball()
            return pot
        else:
            return {"success": False, "data": ""}

    def new_frame(self):
        new_frame = Frame.Frame(players=self.players, match=self, frame_id=self.currentFrameId())
        self.frames.append(new_frame)

    def winner(self):
        if self.score()[0] > self.score()[1]:
            return self.players[0]
        elif self.score()[1] > self.score()[0]:
            return self.players[1]
        else:
            return False

    def balls_potted_per_player(self):
        balls = [[], []]
        for frame in self.frames:
            balls_potted_in_frame = frame.balls_potted_per_player()
            balls[0] += balls_potted_in_frame[0]
            balls[1] += balls_potted_in_frame[1]
        return balls

    def points_per_player(self):
        points = [0, 0]
        for frame in self.frames:
            score = frame.score()
            points[0] += score[0]
            points[1] += score[1]
        return points

    def start(self):
        self.start_time = datetime.now()
        self.new_frame()

    def set_filename(self):
        # saved_matches = [files for root, dirs, files in os.walk(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../matches"), topdown=False)][0]
        # filename = "match_1"
        # if saved_matches:
        #     file_numbers = [int(filename.split("_")[1]) for filename in saved_matches]
        #     filename = "match_{}".format(max(file_numbers) + 1)
        return "match_1"

    def scoreboard_data(self):
        return {
            "player_1":{
                "first_name": self.players[0].firstName,
                "last_name": self.players[0].lastName,
                "frames": self.score()[0],
                "break": self.currentFrame().currentBreak().breakPoints() if self.currentFrame().currentBreak().player is self.players[0] else "",
                "points": self.currentFrame().score()[0],

            },
            "player_2":{
                "first_name": self.players[1].firstName,
                "last_name": self.players[1].lastName,
                "frames": self.score()[1],
                "break": self.currentFrame().currentBreak().breakPoints() if self.currentFrame().currentBreak().player is self.players[1] else "",
                "points": self.currentFrame().score()[1],
            },
            "frame":{
                "reds_in_table": self.currentFrame().redsInTable(),
                "points_in_table": self.currentFrame().pointsInTable(),
                "enough_points_to_win": self.currentFrame().enough_points_to_win(),
                "enough_points_to_draw": self.currentFrame().enough_points_to_draw(),
                "break_balls": self.currentFrame().currentBreak().potted,
                "allowed_mods": self.currentFrame().allowed_mods(),
                "duration": self.currentFrame().duration,
                "time": self.duration_to_time(self.currentFrame().duration, False)
            },
            "match":{
                "id": self.url,
                "best_of": self.bestOf,
                "start_time": self.start_time,
                "duration": self.duration,
                "time": self.duration_to_time(self.duration)
            }
        }
    
    def scoreboard_data_json(self):
        return json.dumps(self.scoreboard_data(), default=json_utils.encoder, indent=4, sort_keys=True)


    def stats(self):
        return {
            "player_1":{
                "points": self.currentScore()[0],
                "stats": {
                    "potted_balls": len(self.balls_potted_per_player()[0]),
                    "total_points": self.points_per_player()[0],
                    "highest_break": self.highest_break_per_player()[0],
                }

            },
            "player_2":{
                "points": self.currentScore()[1],
                "stats": {
                    "potted_balls": len(self.balls_potted_per_player()[1]),
                    "total_points": self.points_per_player()[1],
                    "highest_break": self.highest_break_per_player()[1],
                }
            },
            "highest_break": self.highest_break_balls_with_player(),
            "match_duration": self.duration,
            "frame_duration": self.currentFrame().duration
        }

    def __init__(self, url=None, player1 = None, player2 = None, bestOf = 0, frames = None, total_reds = 15, start_time = None, filename = None):
        super(Match, self).__init__()

        self.url = url

        self.players = [player1, player2]

        self.bestOf = bestOf

        if frames is None:
            frames = []
        self.frames = frames

        self.duration = 0

        self.total_reds = total_reds

        self.start_time = start_time

        if not filename:
            filename = self.set_filename()
        self.filename = filename