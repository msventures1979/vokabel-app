import io, json, os, re, subprocess, sys, wave, numpy as np, scipy.signal as ss
from piper import PiperVoice, SynthesisConfig
from faster_whisper import WhisperModel
SRC = sys.argv[2]; OUT = sys.argv[3]; os.makedirs(OUT, exist_ok=True)
texts = json.load(open(sys.argv[1]))
m = WhisperModel('small', device='cpu', compute_type='int8')
V = {'thorsten': PiperVoice.load('piper/de_DE-thorsten-high.onnx'), 'kerstin': PiperVoice.load('piper/de_DE-kerstin-low.onnx')}
norm = lambda s: re.sub(r'[^a-zäöü]', '', s.lower().replace('ß', 'ss'))
def synth(voice, text, ls):
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w: V[voice].synthesize_wav(text, w, syn_config=SynthesisConfig(length_scale=ls))
    buf.seek(0)
    with wave.open(buf) as w:
        sr = w.getframerate(); a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    nz = np.where(np.abs(a) > 0.01)[0]
    if len(nz): a = a[max(0, nz[0] - sr // 40): nz[-1] + sr // 8]
    return np.concatenate([np.zeros(sr // 20, np.float32), a]), sr
def heard(a, sr):
    b = ss.resample_poly(a, 16000, sr).astype(np.float32); z = np.zeros(16000, np.float32)
    return ' '.join(s.text.strip() for s in m.transcribe(np.concatenate([z, b, z]), beam_size=5, language='de')[0])
def save(a, sr, path):
    a = a * (0.89 / max(1e-4, float(np.abs(a).max())))
    wav = path[:-4] + '.wav'
    with wave.open(wav, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes())
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', wav, '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '48k', path], check=True); os.remove(wav)
def dur(p): return float(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',p],capture_output=True,text=True).stdout)
def stretch(src, dst, tempo):
    subprocess.run(['ffmpeg','-loglevel','error','-y','-i',src,'-af',f'rubberband=tempo={tempo:.3f}:pitchq=quality,apad=pad_dur=0.1','-ac','1','-ar','24000','-c:a','libmp3lame','-b:a','48k',dst],check=True)
for t in texts:
    path = f"{OUT}/{t['key']}.mp3"; src = f"{SRC}/{t['key']}.mp3"
    if os.path.exists(path): continue
    if t['kind'] == 'syl':
        stretch(src, path, 0.8); print('SYL ', t['say'], flush=True); continue
    say = t['say'] + '.'; done = None
    for voice, ls in (('thorsten', 1.7), ('thorsten', 1.85), ('thorsten', 2.0), ('kerstin', 1.6), ('kerstin', 1.8)):
        a, sr = synth(voice, say, ls)
        g = heard(a, sr)
        if norm(g) == norm(t['text']): done = (a, sr, voice, ls); break
    if done:
        save(done[0], done[1], path); print(f"NEU  {t['say']} {done[2]} {done[3]} {len(done[0])/done[1]:.2f}s", flush=True)
    else:
        sp = max(0.25, dur(src) - 0.15); tempo = max(0.62, min(1.0, sp / 0.75))
        stretch(src, path, tempo); print(f"DEHN {t['say']} tempo {tempo:.2f}", flush=True)
print('fertig', flush=True)
