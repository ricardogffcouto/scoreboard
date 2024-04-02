#!/usr/bin/python
# -*- coding: utf-8 -*-

from builtins import object
from . import Ball, json_utils
import json
from datetime import datetime

class Break(object):
    """docstring for Break"""
    def _json_fields(self):
        brk = {
            "player" : self.player,
            "id" : self.break_id,
            "balls" : self.potted,
            "start_time" : self.start_time,
        }
        return brk

    def toJSON(self):
        return json.dumps(self, default=json_utils.encoder, indent=4, sort_keys=True)

    def undo(self):
        if len(self.potted):
            undone_ball = self.potted[-1]
            self.potted = self.potted[:-1]
            return undone_ball
        else:
            return None

    def ballId(self):
        return len(self.potted)-1

    def manual(self, value):
        ballPotted = Ball.Ball(match = self.match, brk=self, order=self.match.currentBallId(), value = value, manual = True)
        self.potted = [ballPotted]
        return ballPotted

    def pot(self, value = 1, manual = False):
        print(self.frame.allowed_balls())
        if value in self.frame.allowed_balls() or manual:
            ballPotted = None
            is_last_red = False
            is_final_sequence = False
            if value == 1 and self.frame.isLastRed():
                is_last_red = True
            elif self.frame.isFinalSequence():
                is_final_sequence = True

            ballPotted = Ball.Ball(match = self.match, brk=self, order=self.match.currentBallId(), value = value, isLastRed = is_last_red, isFinalSequence = is_final_sequence, manual = manual)
            self.potted.append(ballPotted)

            return ballPotted
        return None


    def freeBall(self, value):
        if value in self.frame.allowed_balls():
            ballPotted = Ball.Ball(match = self.match, brk=self, order=self.match.currentBallId(), value = value, freeBall = True, isFinalSequence=self.frame.isFinalSequence())
            self.potted.append(ballPotted)
            return ballPotted
        return ""

    def gotFoul(self, value):
        if value < 4:
            value = 4
        ballPotted = Ball.Ball(match = self.match, brk=self, order=self.match.currentBallId(), foul = True, isFinalSequence=self.frame.isFinalSequence(), value = value)
        self.potted = [ballPotted]
        return ballPotted

    def end(self):
        self.player.breaks.append(self)
        self.frame.endBreak()

    def totalPoints(self):
        points = 0
        for ball in self.potted:
            if not ball.redIllegalPot:
                points += ball.value
        return points

    def breakPoints(self):
        points = 0
        for ball in self.potted:
            if not ball.foul and not ball.redIllegalPot:
                points += ball.value
        return points

    def finalSequencePoints(self):
        points = 0
        for ball in self.potted:
            if ball.isFinalSequence and ball.was_potted() and not ball.freeBall:
                points += ball.value
        return points

    def removeRed(self):
        if self.frame.redsInTable() > 0:
            ballPotted = Ball.Ball(match = self.match, brk=self, order=self.match.currentBallId(), value = 0, redIllegalPot = True)
            self.potted.append(ballPotted)
            return ballPotted
        return ""

    def redsPotted(self):
        redsPotted = 0
        for ball in self.potted:
            if not ball.foul and not ball.freeBall and ball.value == 1:
                redsPotted += 1
            if ball.manual:
                return -1
        return redsPotted

    def illegal_reds(self):
        return len([ball for ball in self.potted if ball.redIllegalPot])

    def last_valid_ball_potted(self):
        if len(self.potted) > 0:
            for ball in reversed(self.potted):
                if ball.was_potted():
                    return ball
        return None

    def balls_potted(self):
        balls = []
        for ball in self.potted:
            if ball.was_potted():
                balls.append(ball)
        return balls

    def __init__(self, player, frame, match, break_id, potted = None, start_time = None):
        super(Break, self).__init__()

        self.player = player

        self.frame = frame

        self.match = match

        self.break_id = break_id

        if potted is None:
            potted = []
        self.potted = potted

        if not start_time:
            start_time = datetime.now()
        self.start_time = start_time
