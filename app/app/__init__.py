from flask import Flask

app = Flask(__name__)
app.config.from_pyfile("../../webscoreboard_config.py")

from app import routes