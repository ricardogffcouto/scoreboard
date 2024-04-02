#!/usr/bin/python
# -*- coding: utf-8 -*-

from builtins import object
from . import Break, Ball, json_utils
import json
from datetime import datetime


class Frame(object):
    """docstring for Frame"""

    def _json_fields(self):
        frame = {
            "id": self.frame_id,
            "breaks": self.breaks,
            "start_time": self.start_time,
            "duration": self.duration,
        }
        return frame

    def toJSON(self):
        return json.dumps(self, default=json_utils.encoder, indent=4, sort_keys=True)

    def undo(self):
        undone_balls = []
        if self.last_ball_was_foul():
            undone_balls.append(self.breaks[-2].potted[-1])
            undone_balls.append(self.breaks[-2].potted[-2])
            self.breaks = self.breaks[:-2]
            return undone_balls

        pot = self.currentBreak().undo()
        if pot:
            return [pot]
        else:
            if len(self.breaks) > 1:
                self.breaks = self.breaks[:-1]
                undone_balls.append(self.breaks[-1].potted[-1])
                del self.breaks[-1].potted[-1]
                return undone_balls
            else:
                return None

    def activePlayer(self):
        return self.currentBreak().player

    def currentBreak(self):
        if len(self.breaks):
            return self.breaks[-1]

    def endBreak(self):
        # Change players
        brk = self.currentBreak()
        end_break = Ball.Ball(
            match=self.match, brk=brk, order=self.match.currentBallId(), end_break=True
        )
        brk.potted.append(end_break)

        if self.activePlayer() == self.players[0]:
            newPlayer = self.players[1]
        else:
            newPlayer = self.players[0]

        # Create new break
        newBreak = Break.Break(
            player=newPlayer,
            frame=self,
            break_id=self.match.currentBreakId(),
            match=self.match,
        )
        self.breaks.append(newBreak)

        return end_break

    def newBreakSamePlayer(self):
        brk = self.currentBreak()
        end_break = Ball.Ball(
            match=self.match, brk=brk, order=self.match.currentBallId(), end_break=True
        )
        brk.potted.append(end_break)

        newBreak = Break.Break(
            player=self.activePlayer(),
            frame=self,
            break_id=self.match.currentBreakId(),
            match=self.match,
        )
        self.breaks.append(newBreak)

        return end_break

    def create_end_frame_ball(self):
        brk = self.currentBreak()
        end_frame = Ball.Ball(
            match=self.match, brk=brk, order=self.match.currentBallId(), end_frame=True
        )
        brk.potted.append(end_frame)
        return end_frame

    def winner(self):
        if self.score()[0] > self.score()[1]:
            return self.players[0]
        else:
            return self.players[1]

    def manual(self):
        for brk in self.breaks:
            if brk.redsPotted() == -1:
                return True
        return False

    def pointsInTable(self):
        pointsInTable = self.match.total_reds * 8 + 27
        finalSequencePoints = 0

        for brk in self.breaks:
            if brk.redsPotted() == -1:  # Manual mode activated
                return -1
            finalSequencePoints += brk.finalSequencePoints()

        pointsInTable -= (
            self.match.total_reds - self.redsInTable()
        ) * 8 + finalSequencePoints

        # If match is tied and there are no points in table
        if self.score()[0] - self.score()[1] == 0 and pointsInTable == 0:
            return 7

        return max(pointsInTable, 0)

    def redsInTable(self):
        redsInTable = self.match.total_reds

        for brk in self.breaks:
            redsInTable -= brk.redsPotted() + brk.illegal_reds()
            if brk.redsPotted() == -1:
                return -1

        return max(redsInTable, 0)

    def score(self):
        score = [0, 0]
        for brk in self.breaks:
            if brk.player == self.players[0]:
                score[0] += brk.totalPoints()
            else:
                score[1] += brk.totalPoints()

        return score

    def isFinalSequence(self):
        """Verifies if there are no reds in table, and if we started the final sequence"""
        last_break = self.breaks[-1]
        if self.redsInTable() == 0:
            if len(last_break.potted):
                if len(last_break.potted) and not last_break.potted[-1].isLastRed:
                    return True
            else:
                return True
        return False

    def isLastRed(self):
        if self.redsInTable() == 1:
            return True
        return False

    def highest_break_per_player(self):
        highest_break_per_player = [0, 0]
        for brk in self.breaks:
            if brk.player == self.players[0]:
                highest_break_per_player[0] = max(
                    highest_break_per_player[0], brk.breakPoints()
                )
            else:
                highest_break_per_player[1] = max(
                    highest_break_per_player[1], brk.breakPoints()
                )
        return highest_break_per_player

    def highest_break(self):
        highest_break = max(self.highest_break_per_player())
        for brk in self.breaks:
            if brk.breakPoints() == highest_break:
                return brk

    def enough_points_to_win(self):
        if abs(self.score()[0] - self.score()[1]) < self.pointsInTable():
            return True
        return False

    def enough_points_to_draw(self):
        if abs(self.score()[0] - self.score()[1]) == self.pointsInTable():
            return True
        return False

    def last_ball_potted(self):
        brk = self.break_with_last_ball_potted()
        if brk:
            return brk.last_valid_ball_potted()

    def last_ball_was_foul(self):
        if len(self.breaks) >= 2:
            if len(self.breaks[-1].potted) < 1:
                if len(self.breaks[-2].potted) >= 1:
                    if self.breaks[-2].potted[0].foul:
                        return True
        return False

    def break_with_last_ball_potted(self):
        for brk in reversed(self.breaks):
            if brk.last_valid_ball_potted():
                return brk
        return None

    def allowed_mods(self):
        allowed_mods = {
            "freeball": False,
            "foul": True,
            "manual": True,
            "undo": True,
            "remove_red": True,
        }
        if self.last_ball_was_foul():
            allowed_mods["freeball"] = True
        if len(self.breaks) <= 0:
            allowed_mods["undo"] = False
        if self.redsInTable() <= 0:
            allowed_mods["remove_red"] = False
        if len(self.currentBreak().potted) > 0:
            allowed_mods["manual"] = False

        return allowed_mods

    def allowed_balls(self):
        last_ball = self.last_ball_potted()
        any_ball = [1, 2, 3, 4, 5, 6, 7]

        if self.manual():
            return any_ball

        if last_ball:
            if last_ball.isLastRed:
                if self.break_with_last_ball_potted() is self.currentBreak():
                    return any_ball[-6:]
                else:
                    return [2]

            if self.isFinalSequence():
                if last_ball.freeBall:
                    return [last_ball.value]
                else:
                    if self.pointsInTable() == 7:
                        return [7]
                    elif last_ball.isFinalSequence:
                        return [last_ball.value + 1]
                return [2]

            if (
                last_ball.value == 1
                and self.break_with_last_ball_potted() == self.currentBreak()
            ):
                return any_ball

        return [1]

    def balls_potted(self):
        balls = []
        for brk in self.breaks:
            balls += brk.balls_potted()
        return balls

    def balls_potted_per_player(self):
        balls = [[], []]
        for brk in self.breaks:
            if brk.player == self.players[0]:
                balls[0] += brk.balls_potted()
            else:
                balls[1] += brk.balls_potted()
        return balls

    def all_balls_potted_in_order(self):
        balls = []
        for brk in self.breaks:
            if len(brk.potted):
                balls.append(
                    {
                        "player": 0 if brk.player == self.players[0] else 1,
                        "break": [ball.to_json() for ball in brk.potted],
                    }
                )
        return balls

    def reds_potted_per_player(self):
        reds = [[], []]
        balls = self.balls_potted_per_player()
        for ball in balls[0]:
            if ball.value == 1 and not ball.freeBall:
                reds[0].append(ball)
        for ball in balls[1]:
            if ball.value == 1 and not ball.freeBall:
                reds[1].append(ball)
        return reds

    def stats(self):
        return {
            "player_1": {
                "points": self.score()[0],
                "stats": {
                    "potted_balls": len(self.balls_potted_per_player()[0]),
                    "potted_reds": len(self.reds_potted_per_player()[0]),
                    "highest_break": self.highest_break_per_player()[0],
                },
            },
            "player_2": {
                "points": self.score()[1],
                "stats": {
                    "potted_balls": len(self.balls_potted_per_player()[1]),
                    "potted_reds": len(self.reds_potted_per_player()[1]),
                    "highest_break": self.highest_break_per_player()[1],
                },
            },
            "balls": self.all_balls_potted_in_order(),
            "draw": True if self.score()[0] == self.score()[1] else False,
        }

    def __init__(
        self, players, match, frame_id, breaks=None, start_time=None, duration=0
    ):
        super(Frame, self).__init__()

        self.players = players

        self.match = match

        self.frame_id = frame_id

        if breaks is None:
            breaks = [
                Break.Break(
                    player=self.players[0],
                    frame=self,
                    break_id=self.match.currentBreakId(),
                    match=self.match,
                )
            ]

        if not start_time:
            start_time = datetime.now()
        self.start_time = start_time

        self.breaks = breaks

        self.duration = duration
