"""Geprüfte Sprachaufnahmen: pro Text mehrere Aufnahmen (Piper, britische Stimmen cori/jenny) erzeugen und nur eine behalten,
die Whisper (small.en) eindeutig versteht. Einzelwörter sind bei neuronalen Stimmen unzuverlässig, daher diese Auswahl.
Aufruf im Ordner mit texts.json (npx tsx scripts/speech-texts.ts) und piper/<stimme>.onnx; Ergebnis in accepted/*.mp3,
danach nach public/audio kopieren und src/data/audio-manifest.ts neu schreiben. Lob-Sätze: scripts/make-audio.py."""
# Pro Text mehrere Aufnahmen erzeugen und nur eine behalten, die die Spracherkennung eindeutig versteht.
import io, json, os, re, subprocess, wave, numpy as np, scipy.signal as ss
from piper import PiperVoice, SynthesisConfig
from faster_whisper import WhisperModel

m = WhisperModel('small.en', device='cpu', compute_type='int8')
V = {'cori': PiperVoice.load('piper/en_GB-cori-high.onnx'), 'jenny': PiperVoice.load('piper/en_GB-jenny_dioco-medium.onnx')}
texts = json.load(open('texts.json'))
OUT = 'accepted'; os.makedirs(OUT, exist_ok=True)
SAY = {'mr': 'Mister', 'mrs': 'Missus', 'ok': 'okay', 'tv': 'T V'}
NUM = {'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
       'eleven': '11', 'twelve': '12', 'mr': 'mister', 'mrs': 'missus', 'ok': 'okay', 'tv': 'tv', 'mum': 'mom', 'grey': 'gray', 'colour': 'color',
       "i'm": 'i am', "it's": 'it is', "he's": 'he is', "she's": 'she is', "let's": 'let us', "where's": 'where is', 'goodnight': 'good night',
       't': 'tea', 'tshirt': 't shirt'}
# Britische Aussprache, die die (amerikanisch trainierte) Erkennung anders schreibt
ALT = {'door': {'daw', 'door'}, 'four': {'4', 'for', 'fore'}, 'two': {'2', 'to', 'too'}, 'to': {'to', 'too', '2'}, 'eye': {'i', 'eye', 'aye'},
       'a': {'a', 'uh', 'ah'}, 'in': {'in', 'inn'}, 'year': {'year', 'yeah'}, 'ear': {'ear', 'here', 'year'}, 'hair': {'hair', 'here'},
       'tv': {'tv', 't v', 'tvs'}, 'no': {'no', 'know'}, 'sun': {'sun', 'son'}, 'write': {'write', 'right'}, 'red': {'red', 'read'},
       'key': {'key', 'kee'}, 'new': {'new', 'knew'}, 'pear': {'pear', 'pair'},
       'here': {'here', 'hear'}, 'for': {'for', '4', 'four'}, 'board': {'board', 'bored'}, 'be': {'be', 'bee', 'b'}, 'at': {'at', 'add'}, 'on': {'on', 'an'}}


def norm(s):
    s = s.lower().replace('’', "'").replace('-', ' ').replace('.', ' ')
    s = re.sub(r"[^a-z0-9' ]", ' ', s)
    return ' '.join(NUM.get(w, w) for w in s.split())


def synth(voice, text, ls):
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w:
        V[voice].synthesize_wav(text, w, syn_config=SynthesisConfig(length_scale=ls))
    buf.seek(0)
    with wave.open(buf) as w:
        sr = w.getframerate(); a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    nz = np.where(np.abs(a) > 0.01)[0]
    if len(nz): a = a[max(0, nz[0] - sr // 40): nz[-1] + sr // 10]
    return np.concatenate([np.zeros(sr // 25, np.float32), a]), sr


def heard(a, sr):
    b = ss.resample_poly(a, 16000, sr).astype(np.float32); z = np.zeros(16000, np.float32)
    return ' '.join(s.text.strip() for s in m.transcribe(np.concatenate([z, b, z]), beam_size=5, language='en')[0])


report = json.load(open('bestof.json')) if os.path.exists('bestof.json') else {}
for t in texts:
    key, text = t['key'], t['text']
    if key in report: continue
    say = re.sub(r"\b(Mrs|Mr|OK|TV)\b", lambda x: SAY[x.group(1).lower()], text)
    if not re.search(r'[.!?]$', say): say += '.'
    short = len(text.split()) <= 2
    want = norm(text); ok_set = ALT.get(want, {want})
    result = None; tries = []
    for voice, n in (('cori', 12), ('jenny', 8)):
        for i in range(n):
            a, sr = synth(voice, say, (1.0, 1.15, 1.3)[i % 3] if short else 1.05)
            dur = len(a) / sr
            if short and dur > 1.8: tries.append(f'{voice}:zu lang'); continue
            g = heard(a, sr); tries.append(f'{voice}:{g}')
            if norm(g) in ok_set:
                result = (voice, a, sr); break
        if result: break
    if result:
        voice, a, sr = result
        a = a * (0.89 / max(1e-4, float(np.abs(a).max())))
        wav = f'{OUT}/{key}.wav'
        with wave.open(wav, 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes())
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', wav, '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '48k', f'{OUT}/{key}.mp3'], check=True)
        os.remove(wav)
    report[key] = {'text': text, 'ok': bool(result), 'voice': result[0] if result else None, 'tries': tries}
    json.dump(report, open('bestof.json', 'w'), indent=1, ensure_ascii=False)
    print(('OK  ' if result else 'NEIN') , text, '|', tries[-1], flush=True)
print('fertig', sum(r['ok'] for r in report.values()), '/', len(report))
