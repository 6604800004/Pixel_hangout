#!/bin/sh
# สร้าง assets/rnnoise.wasm ใหม่ (ปกติไม่ต้องทำ — ไฟล์ .wasm อยู่ใน repo แล้ว)
# ใช้ RNNoise v0.1.1 ของ Xiph (BSD-3, ดู assets/rnnoise-COPYING.txt) คอมไพล์ด้วย clang → wasm32 โดยไม่ต้องมี emscripten
set -e
HERE=$(cd "$(dirname "$0")" && pwd); OUT="$HERE/../../assets/rnnoise.wasm"
TMP=$(mktemp -d); git clone -q https://github.com/xiph/rnnoise.git "$TMP/rnnoise"; cd "$TMP/rnnoise" && git checkout -q v0.1.1 && cd src
clang --target=wasm32 -O2 -ffreestanding -nostdlib -fno-builtin-malloc -I"$HERE" -I../include -DNDEBUG -Wno-everything \
  -Wl,--no-entry -Wl,--export=rnnoise_create -Wl,--export=rnnoise_process_frame -Wl,--export=px_buf -Wl,--export=memory \
  -Wl,--allow-undefined -Wl,--strip-all -o "$OUT" denoise.c kiss_fft.c pitch.c celt_lpc.c rnn.c rnn_data.c "$HERE/libc.c"
echo "wrote $OUT"
