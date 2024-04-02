#!/usr/bin/python
# -*- coding: utf-8 -*
from builtins import object
import json
from . import json_utils

class Player(object):
    """docstring for Player"""
    def _json_fields(self):
        player = {
            "url" : self.url,
            "member_id" : self.member_id,
            "first_name" : self.firstName,
            "last_name" : self.lastName,
        }
        return player

    def toJSON(self):
        return json.dumps(self, default=json_utils.encoder, indent=4, sort_keys=True)

    def __init__(self, firstName, lastName, url = None, member_id=None):

        super(Player, self).__init__()
        self.url = url

        self.firstName = firstName

        self.lastName = lastName

        self.name = self.firstName + " " + self.lastName

        self.member_id = member_id