OUTPUT_FORMAT("elf32-m68k")
ENTRY(_start)
MEMORY { rom (rx) : ORIGIN = 0x000000, LENGTH = 4M  ram (rwx) : ORIGIN = 0xFF0000, LENGTH = 0xFE00 }
SECTIONS {
  .text : { KEEP(*(.text.boot)) *(.text .text.*) *(.rodata .rodata.*) . = ALIGN(2); } > rom
  _data_load = .;
  .data : AT(_data_load) { _data_start = .; *(.data .data.*) . = ALIGN(2); _data_end = .; } > ram
  .bss (NOLOAD) : { *(.bss .bss.* COMMON) . = ALIGN(2); } > ram
  /DISCARD/ : { *(.comment) *(.note*) *(.eh_frame*) }
}
