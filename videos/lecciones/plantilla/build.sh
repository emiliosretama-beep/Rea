#!/bin/bash
cd "$(dirname "$0")"
export NODE_PATH=/home/user/artemnovitckii/claude-animation-skills/kit/node_modules
W=4; N=$(node -e "global.window={};" 2>/dev/null; grep -c "^SC.push" web/shots.js); rm -rf seg; mkdir -p seg; pids=()
for ((w=0;w<W;w++)); do ids=""; for ((i=w;i<N;i+=W)); do ids="${ids:+$ids,}$i"; done; node render_h.js segments "$ids" > seg/log$w.txt 2>&1 & pids+=($!); done
for p in "${pids[@]}"; do wait $p; done
[ "$(ls seg/shot_??.mp4 | wc -l)" -eq "$N" ] || { echo "faltan tomas: $(ls seg/shot_??.mp4 | wc -l)/$N"; exit 1; }
for f in seg/shot_??.mp4; do echo "file '$PWD/$f'"; done > seg/list.txt
ffmpeg -v error -y -f concat -safe 0 -i seg/list.txt -c copy silent.mp4
ffmpeg -v error -y -i silent.mp4 -i audio/mix.wav -map 0:v -map 1:a -c:v libx264 -crf 21 -preset medium -pix_fmt yuv420p -af "alimiter=limit=0.8:attack=2:release=60,loudnorm=I=-16:TP=-1.5:LRA=9" -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart "${1:-leccion}.mp4"
ffprobe -v error -show_entries format=duration,size:stream=width,height -of compact "${1:-leccion}.mp4"
echo BUILD_DONE
