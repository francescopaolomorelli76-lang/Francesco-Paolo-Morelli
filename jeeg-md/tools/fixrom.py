# Allinea la ROM a 128 KB multipli, scrive fine ROM e checksum nell'header.
import sys, struct
p = sys.argv[1]; b = bytearray(open(p, 'rb').read())
size = max(0x20000, (len(b) + 0x1FFFF) & ~0x1FFFF)
b += b'\xff' * (size - len(b))
struct.pack_into('>I', b, 0x1A4, size - 1)
cs = 0
for i in range(0x200, size, 2): cs = (cs + (b[i] << 8 | b[i + 1])) & 0xFFFF
struct.pack_into('>H', b, 0x18E, cs)
open(p, 'wb').write(b)
print('ROM', p, size // 1024, 'KB checksum', hex(cs))
