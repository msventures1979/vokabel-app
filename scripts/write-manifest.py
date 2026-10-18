"""Schreibt src/data/audio-manifest.ts aus allen mp3 in public/audio (Englisch und Deutsch)."""
import os
keys = sorted(f[:-4] for f in os.listdir('public/audio') if f.endswith('.mp3'))
with open('src/data/audio-manifest.ts', 'w') as f:
    f.write('// Automatisch erzeugt (scripts/write-manifest.py) – Schlüssel der vorhandenen Sprachaufnahmen in public/audio\nexport const AUDIO = new Set<string>([\n')
    f.writelines(f"  '{k}',\n" for k in keys)
    f.write('])\n')
print(len(keys))
