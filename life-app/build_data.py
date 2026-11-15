"""Builds data.js and assets/ for Let's Go LIFE from ../LIFE/*.WAV.
The text was transcribed with Whisper and corrected by hand; each '|' is one clip."""
import json, os, shutil
SRC = os.path.join(os.path.dirname(__file__), '..', 'LIFE')
T = """
1: This | is Sam's | room / It's in | a big | mess / Sam | can't find | his things
2: Two socks | are in front of | the door / The socks | are behind | the cat / The cat | is next to | the carpet
3: The cactus | is in | the pot / The cactus | is green / The pot | is brown
4: There are | four books | on the shelf / The lamp | is green / The light bulb | is yellow
5: The teddy bear | is sitting | on the shelf / He is sitting | under the window | on the shelf / The fish | is swimming | in the bowl
6: The radio | is black / The water | is blue / The books | are brown
7: The antenna | is long / The alarm clock | has two hands / The radio | has a cassette | in it
8: Sam is sleeping | in his bed / Sam has | a long nose / The cat has | a small nose
9: Sam's blanket | is pink / Two slippers | are under | the bed / The jump rope | is long
10: There are many blocks | on the carpet / The knapsack | is green and yellow / The shoe | is next to | the soccer ball
11: Some of | the blocks | are blue / Some of | the blocks | are red / One of | the blocks | is green
12: The towel | is hanging on | the closet door / The jeans | are hanging on | the clothes rack / The picture | is hanging | on the wall
13: The jeans | are blue / The hat | is black / The towel | has circles | on it
14: The clown | has yellow hair / His bow tie | is red | and blue / His nose | is red
15: There is | a lamp | on the desk / The chair | is under | the desk / One drawer | is open
16: The plug | is in | the socket / The mouse | is in | its hole / The mouse | is gray
17: The computer screen | is black / The keyboard | is in front of | the computer / The mouse | is next to | the computer
18: The spider web | is in | the corner / The spider | is in | his web / The spider | is black
19: The balloon | is floating | in the air / The balloon | is red / A string | is tied to | the balloon
20: The lampshade | is hanging | from the ceiling / The light bulb | is hot / The ceiling | is high up
21: The toy box | is on top of | the closet / The basketball | is red / The basketball | is round
A1: This | is Sam's | room / Yes. | The room | is in | a mess / No. | Sam | can't find | his things
A10: There are | many blocks | on the carpet / No. | The knapsack | is green | and yellow / The shoe | is next to | the soccer ball
A11: No. | Some of | the blocks | are blue / No. | Some of | the blocks | are red / No. | One of | the blocks | is green
A12: It is hanging | on the closet | door / They are hanging | on the clothes rack
"""
def parse(key, line):
    out = []
    for si, s in enumerate(line.split(' / '), 1):
        clips = []
        for ci, t in enumerate(s.split(' | '), 1):
            f = f'{key}_{si}_{ci}'
            src = os.path.join(SRC, f + '.WAV')
            assert os.path.getsize(src) > 0, f
            shutil.copy(src, os.path.join('assets', f.lower() + '.wav'))
            clips.append([f.lower(), t.strip()])
        # every clip of the sentence must be used
        assert not os.path.exists(os.path.join(SRC, f'{key}_{si}_{len(clips)+1}.WAV')), (key, si)
        out.append(clips)
    return out
rows = dict(l.split(': ', 1) for l in T.strip().splitlines())
scenes = []
for n in range(1, 22):
    sc = {'n': n, 's': parse(str(n), rows[str(n)])}
    if f'A{n}' in rows: sc['a'] = parse(f'A{n}', rows[f'A{n}'])
    scenes.append(sc)
open('data.js', 'w').write('window.LIFE_SCENES = ' + json.dumps(scenes, ensure_ascii=False) + ';\n')
print(len(scenes), 'scenes,', len(os.listdir('assets')), 'files')
