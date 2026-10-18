"""Geprüfte deutsche Sprachaufnahmen (Lernwörter, Leserakete, Silben) mit Piper (thorsten, Ersatz: kerstin).
Pro Text mehrere Aufnahmen, behalten wird die erste, die Whisper (small, Deutsch) eindeutig versteht.
Aufruf im Arbeitsordner mit texts-de.json (npx tsx scripts/speech-texts-de.ts) und piper/<stimme>.onnx:
  python3 audio-bestof-de.py texts-de.json <ausgabeordner>
Danach die mp3 nach public/audio kopieren und src/data/audio-manifest.ts neu schreiben.
"""
import difflib, io, json, os, re, subprocess, sys, wave
import numpy as np, scipy.signal as ss
from piper import PiperVoice, SynthesisConfig
from faster_whisper import WhisperModel

texts = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
os.makedirs(OUT, exist_ok=True)
m = WhisperModel('small', device='cpu', compute_type='int8')
V = {'thorsten': PiperVoice.load('piper/de_DE-thorsten-high.onnx'), 'kerstin': PiperVoice.load('piper/de_DE-kerstin-low.onnx')}


def norm(s):
    s = s.lower().replace('ß', 'ss')
    return re.sub(r'[^a-zäöü]', '', s)


def synth(voice, text, ls):
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w:
        V[voice].synthesize_wav(text, w, syn_config=SynthesisConfig(length_scale=ls))
    buf.seek(0)
    with wave.open(buf) as w:
        sr = w.getframerate()
        a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    nz = np.where(np.abs(a) > 0.01)[0]
    if len(nz):
        a = a[max(0, nz[0] - sr // 40): nz[-1] + sr // 10]
    return np.concatenate([np.zeros(sr // 25, np.float32), a]), sr


def heard(a, sr):
    b = ss.resample_poly(a, 16000, sr).astype(np.float32)
    z = np.zeros(16000, np.float32)
    return ' '.join(s.text.strip() for s in m.transcribe(np.concatenate([z, b, z]), beam_size=5, language='de')[0])


report = {}
for t in texts:
    path = f"{OUT}/{t['key']}.mp3"
    if os.path.exists(path):
        continue
    say = t['say'] + ('.' if not t['say'].endswith(('.', '!', '?')) else '')
    syl = t['kind'] == 'syl'
    result, tries, best = None, [], None
    for voice, n in (('thorsten', 14), ('kerstin', 6)):
        for i in range(n):
            a, sr = synth(voice, say, (1.6 if syl else 1.15) + 0.1 * (i % 3))
            if not syl and len(a) / sr > 2.2:
                tries.append('zu lang'); continue
            g = heard(a, sr); tries.append(f'{voice}:{g}')
            sc = difflib.SequenceMatcher(None, norm(g), norm(t['text'])).ratio() + (0.05 if voice == 'thorsten' else 0)
            if best is None or sc > best[0]: best = (sc, a, sr)
            if norm(g) == norm(t['text']):
                result = (a, sr); break
        if result: break
    fallback = not result and best is not None
    if fallback: result = best[1:]  # beste Annäherung statt Stille
    if result:
        a, sr = result
        a = a * (0.89 / max(1e-4, float(np.abs(a).max())))
        wav = path[:-4] + '.wav'
        with wave.open(wav, 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
            w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes())
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', wav, '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '48k', path], check=True)
        os.remove(wav)
    report[t['key']] = bool(result) and not fallback
    print('NAH ' if fallback else 'OK  ' if result else 'NEIN', t['say'], '|', tries[-1], flush=True)
print('fertig', sum(report.values()), '/', len(report))
