"""Erzeugt die Sprachaufnahmen der App mit Piper (Open Source, MIT), britische Stimmen.

Ablauf:
  pip install piper-tts numpy
  Stimmen von huggingface.co/rhasspy/piper-voices laden (en/en_GB/cori/high, en/en_GB/jenny_dioco/medium; je .onnx + .onnx.json)
  npx tsx scripts/speech-texts.ts > texts.json
  python3 scripts/make-audio.py texts.json <ordner-mit-stimmen> [schlüssel=stimme,...]

Schreibt public/audio/<schlüssel>.mp3, public/audio/praise/*.mp3 und src/data/audio-manifest.ts.
Vorhandene Dateien werden übersprungen; neue Wörter kommen also einfach dazu.
Optional: einzelne Schlüssel mit der zweiten Stimme ("jenny") erzeugen, wenn "cori" ein Wort undeutlich spricht.
"""
import io, json, os, re, subprocess, sys, wave
import numpy as np
from piper import PiperVoice, SynthesisConfig

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'audio')
texts_path, voices_dir = sys.argv[1:3]
override = dict(x.split('=') for x in sys.argv[3].split(',')) if len(sys.argv) > 3 and sys.argv[3] else {}
force = os.environ.get('FORCE') == '1'

VOICES = {
    'cori': PiperVoice.load(os.path.join(voices_dir, 'en_GB-cori-high.onnx')),
    'jenny': PiperVoice.load(os.path.join(voices_dir, 'en_GB-jenny_dioco-medium.onnx')),
}
SAY = {'mr': 'Mister', 'mrs': 'Missus', 'ok': 'okay', 'tv': 'T V'}
NAMES = {'milan': 'Meelan', 'marlon': 'Marlon'}  # so spricht die englische Stimme die Namen wie im Deutschen
PRAISE = {
    'card': ['{n}, you are so smart!', 'Well done, {n}!', 'Great job, {n}! You are a superstar!', 'Amazing, {n}! What a player!', '{n}, you are brilliant!'],
    'day': ['Fantastic, {n}! Training day complete!', 'Well played, {n}! What a goal!', 'Yes! {n}, you did it!'],
}


def synth(voice, text, slow):
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w:
        VOICES[voice].synthesize_wav(text, w, syn_config=SynthesisConfig(length_scale=slow))
    buf.seek(0)
    with wave.open(buf) as w:
        sr = w.getframerate()
        a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    return a, sr


def render(text, path, slow, voice='cori'):
    if os.path.exists(path) and not force:
        return
    a, sr = synth(voice, text, slow)
    nz = np.where(np.abs(a) > 0.01)[0]
    if len(nz):
        a = a[max(0, nz[0] - sr // 40): nz[-1] + sr // 10]
    a = np.concatenate([np.zeros(sr // 25, dtype=np.float32), a])
    a = a * (0.89 / max(1e-4, float(np.abs(a).max())))  # Spitzenpegel angleichen (loudnorm verstärkt bei kurzen Clips das Rauschen)
    wav = path[:-4] + '.wav'
    with wave.open(wav, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes())
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', wav, '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '48k', path], check=True)
    os.remove(wav)


def say_text(text):
    s = re.sub(r"\b(Mrs|Mr|OK|TV)\b", lambda m: SAY[m.group(1).lower()], text)
    return s if re.search(r'[.!?]$', s) else s + '.'


os.makedirs(os.path.join(OUT, 'praise'), exist_ok=True)
for t in json.load(open(texts_path)):
    single = len(t['text'].split()) <= 2
    render(say_text(t['text']), os.path.join(OUT, f"{t['key']}.mp3"), 1.2 if single else 1.05, override.get(t['key'], 'cori'))

for cid, name in NAMES.items():
    for kind, lines in PRAISE.items():
        for i, line in enumerate(lines):
            render(line.format(n=name), os.path.join(OUT, 'praise', f'{kind}-{cid}-{i}.mp3'), 1.0)

keys = sorted(f[:-4] for f in os.listdir(OUT) if f.endswith('.mp3'))
with open(os.path.join(ROOT, 'src', 'data', 'audio-manifest.ts'), 'w') as f:
    f.write('// Automatisch erzeugt (scripts/make-audio.py) – Schlüssel der vorhandenen Sprachaufnahmen in public/audio\n')
    f.write('export const AUDIO = new Set<string>([\n' + ''.join(f"  '{k}',\n" for k in keys) + '])\n')
print(len(keys), 'Aufnahmen')
