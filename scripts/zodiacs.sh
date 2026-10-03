#!/bin/sh
# build + run zodiac.asm inside the emulator sandbox

set -e

nasm -f elf64 -o /zodiac.o /zodiac.asm
ld -o /zodiac /zodiac.o

# feed the program's two inputs via stdin
# (change these if you want different demo values)
printf "3\n25\n" | /zodiac