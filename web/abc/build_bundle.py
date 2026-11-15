#!/usr/bin/env python3
"""Bundle Let's Go ABC into one self-contained HTML file (all assets as data: URIs).

usage: python3 build_bundle.py OUT.html [--no-mic]
--no-mic hides the record buttons, for hosts that refuse microphone access.
"""
import base64, json, mimetypes, pathlib, sys

here = pathlib.Path(__file__).parent
out = pathlib.Path(sys.argv[1]); no_mic = '--no-mic' in sys.argv
types = {'.png': 'image/png', '.wav': 'audio/wav'}
assets = {str(f.relative_to(here)).replace('\\', '/'):
          f'data:{types[f.suffix.lower()]};base64,' + base64.b64encode(f.read_bytes()).decode()
          for f in sorted((here / 'assets').rglob('*')) if f.suffix.lower() in types}

# Route every relative asset URL the app builds through the bundled map.
shim = """
window.ABC_ASSETS = %s;
window.ABC_NO_MIC = %s;
(function () {
  const R = u => (typeof u === 'string' && window.ABC_ASSETS[u]) || u;
  const d = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  Object.defineProperty(HTMLImageElement.prototype, 'src', { get: d.get, set(v) { d.set.call(this, R(v)); }, configurable: true });
  const NA = window.Audio;
  window.Audio = function (u) { return new NA(R(u)); };
  window.Audio.prototype = NA.prototype;
})();
""" % (json.dumps(assets, separators=(',', ':')), 'true' if no_mic else 'false')

html = f"""<title>Let's Go ABC</title>
<style>
{(here / 'style.css').read_text()}
</style>
<div id="wrap"><div id="stage"></div></div>
<script>{shim}</script>
<script>
{(here / 'data.js').read_text()}
</script>
<script>
{(here / 'app.js').read_text()}
</script>
"""
out.write_text(html)
print(f'{out}: {len(html)/1e6:.1f} MB, {len(assets)} assets')
