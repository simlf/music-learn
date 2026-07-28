#!/bin/sh
# Decodes the repo's Salamander mp3 samples to mono 16-bit 44.1k WAV so the Node
# harness can read them without a decoder dependency. Uses macOS's built-in
# afconvert; there is no ffmpeg on this machine and the constraint was no new
# npm dependencies. On Linux use:
#   for f in "$SRC"/*.mp3; do ffmpeg -v error -i "$f" -ac 1 -ar 44100 \
#     -c:a pcm_s16le "$OUT/$(basename "$f" .mp3).wav"; done
#
# Usage: ./decode.sh /tmp/salamander-wav
set -eu
OUT=${1:?usage: decode.sh <output-dir>}
SRC=$(cd "$(dirname "$0")/../../../../static/samples/salamander" && pwd)
mkdir -p "$OUT"
for f in "$SRC"/*.mp3; do
	b=$(basename "$f" .mp3)
	afconvert -f WAVE -d LEI16@44100 -c 1 "$f" "$OUT/$b.wav"
done
echo "decoded $(ls "$OUT"/*.wav | wc -l | tr -d ' ') samples to $OUT"
echo "now run:  WAV_DIR=$OUT node measure.mjs"
