from typ import *


class StatsDict(TypedDict):
    time: str
    uptime: int
    wifiSignal: int
    memoryFree: int
    memoryUsed: int
    flashFree: int
    flashUsed: int
