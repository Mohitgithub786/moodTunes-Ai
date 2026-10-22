import requests, re
html = requests.get('https://mood-tunes-ai.vercel.app').text
js_paths = re.findall(r'src="([^"]+\.js)"', html)
print('JS files:', js_paths)
for p in js_paths:
    url = 'https://mood-tunes-ai.vercel.app' + p if p.startswith('/') else p
    js = requests.get(url).text
    matches = re.findall(r'https?://[^\s"\'<>)]+', js)
    apis = [m for m in matches if 'localhost' in m or 'hf.space' in m]
    print(p, 'found APIs:', set(apis))
