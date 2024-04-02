#!/usr/bin/python
# -*- coding: utf-8 -*-

from builtins import object
import json
from datetime import datetime
from . import json_utils

class Ball(object):
    """docstring for Ball"""
    def _json_fields(self):
        ball = {
            "match" : self.match.url,
            "player" : self.brk.player.url,
            "order" : self.order,
            "break_id" : self.brk.break_id,
            "frame_id" : self.brk.frame.frame_id,
            "value" : self.value,
            "end_break" : self.end_break,
            "end_frame" : self.end_frame,
            "free_ball" : self.freeBall,
            "foul" : self.foul, 
            "manual" : self.manual,
            "red_illegal_pot" : self.redIllegalPot,
            "is_last_red" : self.isLastRed,
            "is_final_sequence" : self.isFinalSequence,   
            "pot_time" : self.pot_time
        }
        return ball

    def toJSON(self):
        return json.dumps(self, default=json_utils.encoder, indent=4, sort_keys=True)

    def name(self):
        if self.manual:
            return 'Inserção manual'

        if self.foul:
            if self.value <= 4:
                return 'Falta do adversário'
            elif self.value == 5:
                return 'Falta do adversário à Azul'
            elif self.value == 6:
                return 'Falta do adversário à Rosa'
            else:
                return 'Falta do adversário à Preta'

        if self.freeBall:
            return 'Bola Livre'

        if self.value == 1:
            return 'Vermelha'
        elif self.value == 2:
            return 'Amarela'
        elif self.value == 3:
            return 'Verde'
        elif self.value == 4:
            return 'Castanha'
        elif self.value == 5:
            return 'Azul'
        elif self.value == 6:
            return 'Rosa'
        elif self.value == 7:
            return 'Preta'
        elif self.value == 0:
            return 'Vermelha inserida em falta'

    def was_potted(self):
        if not self.foul and not self.redIllegalPot and not self.manual and not self.end_break and not self.end_frame:
            return True
        return False

    def __init__(self, match, brk, order, value = 0, end_break = False, freeBall = False, foul = False, manual = False, isLastRed = False, isFinalSequence = False, redIllegalPot = False, end_frame = False, pot_time = None):
        super(Ball, self).__init__()

        self.match = match

        self.brk = brk

        self.order = order

        self.end_break = end_break

        self.value = value

        self.freeBall = freeBall

        self.foul = foul

        self.manual = manual

        self.redIllegalPot = redIllegalPot

        self.isLastRed = isLastRed

        self.isFinalSequence = isFinalSequence
        
        self.end_frame = end_frame

        if not pot_time:
            pot_time = datetime.now()
        self.pot_time = pot_time
