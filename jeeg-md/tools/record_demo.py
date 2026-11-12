"""Registra la ROM demo (bot) in MP4 con audio: python3 tools/record_demo.py OUT.mp4 [secondi]"""
import sys, os, subprocess, wave, array; sys.path.insert(0, os.path.dirname(__file__))
import ctypes as C
import mdrun
from mdrun import MD, symbols
out = sys.argv[1]; secs = int(sys.argv[2]) if len(sys.argv) > 2 else 125
audio = array.array('h')
def audb(data, n):
    audio.extend(array.array('h', C.string_at(data, n * 4))); return n
mdrun.AUDB_FN = audb
m = MD('build/jeeg_auto.bin')
m._cbs[3] = mdrun.AUDB(audb); m.core.retro_set_audio_sample_batch(m._cbs[3])
av = mdrun.AV(); m.core.retro_get_system_av_info(C.byref(av)); sr = int(av.timing.sr); fps = av.timing.fps
S = symbols('build/out.elf')
tmpv = out + '.tmp.mp4'; tmpa = out + '.wav'
ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '320x224', '-r', str(fps), '-i', '-',
                       '-vf', 'scale=960:672:flags=neighbor', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'veryfast', tmpv], stdin=subprocess.PIPE)
done_at = None
for f in range(int(fps * secs)):
    m.run(1); fr = m.frame.convert('RGB')
    if fr.size != (320, 224):
        from PIL import Image
        c = Image.new('RGB', (320, 224)); c.paste(fr, (0, 0)); fr = c
    ff.stdin.write(fr.tobytes())
    if done_at is None and m.read(S, 'test_flags', 1) & 0x80: done_at = f
    if done_at is not None and f - done_at > fps * 5: break
ff.stdin.close(); ff.wait()
w = wave.open(tmpa, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes(audio.tobytes()); w.close()
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmpv, '-i', tmpa, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', out], check=True)
os.remove(tmpv); os.remove(tmpa); print('ok', out, f, 'frame')
