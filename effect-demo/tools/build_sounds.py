#!/usr/bin/env python3
"""音声フォルダから sounds.js（内蔵音声バンドル）を生成する。

  python3 tools/build_sounds.py <音声フォルダ> [-o sounds.js] [-b 160k]

各ファイルを ffmpeg で MP3 に変換し、base64 にして JS に埋め込む。
index.html を file:// で直接開いても読み込めるよう、fetch ではなく
<script> で読み込める形式にしている。表示名はファイル名（拡張子なし）。
"""
import argparse
import base64
import json
import pathlib
import subprocess
import sys

AUDIO_EXT = {'.wav', '.mp3', '.ogg', '.m4a', '.flac', '.aiff', '.aif'}


def encode_mp3(path, bitrate):
    cmd = ['ffmpeg', '-v', 'error', '-i', str(path), '-vn', '-c:a', 'libmp3lame',
           '-b:a', bitrate, '-f', 'mp3', '-']
    return subprocess.run(cmd, check=True, capture_output=True).stdout


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('src', type=pathlib.Path, help='音声ファイルのあるフォルダ')
    ap.add_argument('-o', '--out', type=pathlib.Path,
                    default=pathlib.Path(__file__).resolve().parent.parent / 'sounds.js')
    ap.add_argument('-b', '--bitrate', default='160k')
    args = ap.parse_args()

    files = sorted(p for p in args.src.rglob('*') if p.suffix.lower() in AUDIO_EXT)
    if not files:
        sys.exit(f'音声ファイルが見つかりません: {args.src}')

    entries = []
    for p in files:
        data = encode_mp3(p, args.bitrate)
        entries.append({'name': p.stem, 'type': 'audio/mpeg', 'data': base64.b64encode(data).decode('ascii')})
        print(f'{len(data) // 1024:6d} KB  {p.stem}')

    lines = ['// 自動生成ファイル（tools/build_sounds.py）。手で編集しないでください。',
             'window.BUNDLED_SOUNDS = [']
    lines += [f'  {json.dumps(e, ensure_ascii=False)},' for e in entries]
    lines.append('];')
    args.out.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(f'-> {args.out} ({args.out.stat().st_size // 1024} KB, {len(entries)} files)')


if __name__ == '__main__':
    main()
