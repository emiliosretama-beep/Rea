# Alineación frase por frase para español: usa audio/line_XX.wav y audio/lines.json de tts_es.py.
# El ASR (Parakeet, inglés) solo aporta tiempos; el texto sale siempre del guion.
import json, re, glob, os, shutil, difflib, unicodedata, numpy as np, soundfile as sf, sherpa_onnx
KIT = "/home/user/Rea/.claude/skills/animacion/kit"
d = glob.glob(KIT + "/models/sherpa-onnx-nemo-parakeet*")[0]
rec = sherpa_onnx.OfflineRecognizer.from_transducer(encoder=f"{d}/encoder.int8.onnx", decoder=f"{d}/decoder.int8.onnx",
    joiner=f"{d}/joiner.int8.onnx", tokens=f"{d}/tokens.txt", model_type="nemo_transducer")
def norm(w):
    w = unicodedata.normalize('NFD', w.lower()); w = ''.join(c for c in w if unicodedata.category(c) != 'Mn')
    return re.sub(r"[^a-z0-9]", "", w)
meta = json.load(open('audio/lines.json')); words = []
for m in meta:
    a, sr = sf.read(f"audio/line_{m['i']:02d}.wav", dtype='float32')
    if a.ndim > 1: a = a.mean(1)
    n = int(len(a) * 16000 / sr); a16 = np.interp(np.linspace(0, len(a) - 1, n), np.arange(len(a)), a).astype(np.float32)
    s = rec.create_stream(); s.accept_waveform(16000, a16); rec.decode_stream(s); r = s.result
    asr = []
    for tok, ts in zip(r.tokens, r.timestamps):
        if tok.startswith(' ') or tok.startswith('▁') or not asr: asr.append([tok.strip(' ▁'), ts])
        else: asr[-1][0] += tok
    sw = m['text'].split(); S = [norm(w) for w in sw]; A = [norm(w[0]) for w in asr]
    st = [None] * len(sw)
    sm = difflib.SequenceMatcher(a=S, b=A, autojunk=False)
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == 'equal' or (op == 'replace' and i2 - i1 == j2 - j1):
            for k in range(i2 - i1): st[i1 + k] = asr[j1 + k][1]
    dur = m['dur']
    # huecos: repartir por número de letras entre vecinos conocidos
    ext = [0.0] + [x for x in st] + [dur]
    known = [0] + [i + 1 for i, x in enumerate(st) if x is not None] + [len(st) + 1]
    if st and st[0] is None: ext[1] = 0.03; known = sorted(set(known + [1]))
    for a_, b_ in zip(known, known[1:]):
        if b_ - a_ > 1:
            ws = [max(1, len(S[i - 1])) for i in range(a_, b_)]
            tot = sum(ws) + (len(S[b_ - 1]) if b_ - 1 < len(S) and b_ <= len(S) else 0)
            t0, t1 = ext[a_], ext[b_]; acc = 0
            lens = [max(1, len(S[i - 1])) for i in range(a_, b_)]
            for i in range(a_ + 1, b_):
                acc += lens[i - a_ - 1]; ext[i] = t0 + (t1 - t0) * acc / sum(lens)
    st = ext[1:-1]
    for i, w in enumerate(sw):
        e = st[i + 1] if i + 1 < len(sw) else dur
        words.append({'w': w, 's': round(m['start'] + st[i], 3), 'e': round(m['start'] + e, 3), 'line': m['i']})
    print(m['i'], 'asr:', ' '.join(x[0] for x in asr))
tot = sf.info('audio/vo.wav').duration
json.dump(words, open('audio/words_new.json', 'w'), indent=0)
if not os.path.exists('audio/words_ref.json'): shutil.copy('audio/words_new.json', 'audio/words_ref.json')
old = json.load(open('audio/words_ref.json'))
anchors = [[o['s'], n['s']] for o, n in zip(old, words)]; clean = [anchors[0]]
for p in anchors[1:]:
    if p[0] > clean[-1][0] + 1e-3 and p[1] > clean[-1][1] + 1e-3: clean.append(p)
json.dump({'anchors': clean, 'old_end': old[-1]['e'], 'new_end': tot}, open('audio/warp.json', 'w'))
open('web/words.js', 'w').write('const WORDS=' + json.dumps(words) + ';')
open('web/warp.js', 'w').write('window.WARP=' + json.dumps(json.load(open('audio/warp.json'))) + ';')
print(' '.join(f"{w['w']}@{w['s']:.2f}" for w in words))
