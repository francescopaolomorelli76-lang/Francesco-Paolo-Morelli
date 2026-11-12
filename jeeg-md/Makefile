CC=m68k-linux-gnu-gcc
OBJCOPY=m68k-linux-gnu-objcopy
CFLAGS=-m68000 -O2 -fomit-frame-pointer -ffreestanding -fno-builtin -fno-tree-loop-distribute-patterns -fno-store-merging -mstrict-align -nostdlib -fno-pic -fno-asynchronous-unwind-tables -Wall -Wno-parentheses -Wno-misleading-indentation -Isrc -Ibuild $(EXTRA)
SRC_C?=src/md.c src/audio.c src/game.c build/assets.c
OUT?=build/jeeg.bin
all: $(OUT)
$(OUT): src/boot.s $(SRC_C) src/game.h src/md.h md.ld
	$(CC) $(CFLAGS) -c src/boot.s -o build/boot.o
	$(CC) $(CFLAGS) -T md.ld -Wl,--no-warn-rwx-segments build/boot.o $(SRC_C) -o build/out.elf
	$(OBJCOPY) -O binary build/out.elf $@
	python3 tools/fixrom.py $@
