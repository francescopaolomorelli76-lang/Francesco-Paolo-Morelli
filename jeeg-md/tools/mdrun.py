"""Banco di prova headless: esegue una ROM Mega Drive nel core libretro Genesis Plus GX.
Input scriptati, screenshot PNG, lettura della RAM del 68000 per i test automatici."""
import ctypes as C, os
from PIL import Image

CORE = '/usr/lib/x86_64-linux-gnu/libretro/genesis_plus_gx_libretro.so'
# id RetroPad -> pulsanti Mega Drive (mappatura di default del core: Y=A, B=B, A=C)
MAP = {'B_': 0, 'A': 1, 'START': 3, 'UP': 4, 'DOWN': 5, 'LEFT': 6, 'RIGHT': 7, 'C': 8, 'B': 0}
RID = {'A': 1, 'B': 0, 'C': 8, 'START': 3, 'UP': 4, 'DOWN': 5, 'LEFT': 6, 'RIGHT': 7, 'MODE': 2, 'X': 10, 'Y': 9, 'Z': 11}

class GameInfo(C.Structure):
    _fields_ = [('path', C.c_char_p), ('data', C.c_void_p), ('size', C.c_size_t), ('meta', C.c_char_p)]
class Geometry(C.Structure):
    _fields_ = [('bw', C.c_uint), ('bh', C.c_uint), ('mw', C.c_uint), ('mh', C.c_uint), ('ar', C.c_float)]
class Timing(C.Structure):
    _fields_ = [('fps', C.c_double), ('sr', C.c_double)]
class AV(C.Structure):
    _fields_ = [('geometry', Geometry), ('timing', Timing)]

ENV = C.CFUNCTYPE(C.c_bool, C.c_uint, C.c_void_p)
VID = C.CFUNCTYPE(None, C.c_void_p, C.c_uint, C.c_uint, C.c_size_t)
AUD = C.CFUNCTYPE(None, C.c_int16, C.c_int16)
AUDB = C.CFUNCTYPE(C.c_size_t, C.c_void_p, C.c_size_t)
POLL = C.CFUNCTYPE(None)
STATE = C.CFUNCTYPE(C.c_int16, C.c_uint, C.c_uint, C.c_uint, C.c_uint)

class MD:
    def __init__(self, rom):
        self.core = C.CDLL(CORE)
        self.fmt = 0; self.frame = None; self.held = set()
        self.sysdir = C.create_string_buffer(b'/tmp')
        self._cbs = [ENV(self._env), VID(self._vid), AUD(lambda l, r: None), AUDB(lambda d, n: n), POLL(lambda: None), STATE(self._state)]
        c = self.core
        c.retro_set_environment(self._cbs[0]); c.retro_set_video_refresh(self._cbs[1])
        c.retro_set_audio_sample(self._cbs[2]); c.retro_set_audio_sample_batch(self._cbs[3])
        c.retro_set_input_poll(self._cbs[4]); c.retro_set_input_state(self._cbs[5])
        c.retro_init()
        data = open(rom, 'rb').read(); self._data = C.create_string_buffer(data, len(data))
        gi = GameInfo(rom.encode(), C.cast(self._data, C.c_void_p), len(data), None)
        assert c.retro_load_game(C.byref(gi)), 'load_game fallito'
        c.retro_get_memory_data.restype = C.c_void_p; c.retro_get_memory_size.restype = C.c_size_t

    def _env(self, cmd, data):
        cmd &= 0xFFFF
        if cmd in (9, 31):  # system / save directory
            C.cast(data, C.POINTER(C.c_char_p))[0] = C.cast(self.sysdir, C.c_char_p).value; return True
        if cmd == 10: self.fmt = C.cast(data, C.POINTER(C.c_uint))[0]; return True
        if cmd == 3: C.cast(data, C.POINTER(C.c_bool))[0] = True; return True
        return False

    def _vid(self, data, w, h, pitch):
        if not data: return
        if self.fmt == 1:
            buf = C.string_at(data, pitch * h)
            self.frame = Image.frombuffer('RGBA', (w, h), buf, 'raw', 'BGRA', pitch, 1).convert('RGB')
        else:
            buf = C.string_at(data, pitch * h)
            self.frame = Image.frombuffer('RGB', (w, h), buf, 'raw', 'BGR;16', pitch, 1)

    def _state(self, port, dev, idx, id_):
        if port != 0 or dev != 1: return 0
        return 1 if id_ in self.held else 0

    def press(self, *btns): self.held = {RID[b] for b in btns}
    def run(self, n=1):
        for _ in range(n): self.core.retro_run()
    def shot(self, path, scale=2):
        im = self.frame
        if scale != 1: im = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
        im.save(path)
    def ram(self):
        # Genesis Plus GX conserva la RAM del 68000 a parole con byte scambiati: riordina in big-endian
        p = self.core.retro_get_memory_data(2); n = self.core.retro_get_memory_size(2)
        b = bytearray(C.string_at(p, n)); b[0::2], b[1::2] = b[1::2], b[0::2]
        return b
    def read(self, syms, name, n=2, signed=False):
        a = syms[name] - 0xFF0000; return int.from_bytes(self.ram()[a:a + n], 'big', signed=signed)

def symbols(elf):
    out = {}
    for line in os.popen(f'm68k-linux-gnu-nm {elf}'):
        a = line.split()
        if len(a) == 3: out[a[2]] = int(a[0], 16)
    return out
