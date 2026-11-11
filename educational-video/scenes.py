# Scene definitions for the Year 7 AI revision video.
#
# Each scene has some HTML and a list of narration "beats". Every beat is
# (spoken_text, reveal_index). Elements in the HTML marked data-r="N" fade in
# when beat N of that scene starts speaking (data-d adds an extra delay in
# seconds, for staggering several items inside one beat).

SCENES = [
    # 0 ─ Intro
    dict(html="""
<div class="center">
  <div class="bigicon" data-r="0">🤖</div>
  <div class="hero" data-r="0" data-d="0.3">AI Revision</div>
  <div class="sub" data-r="0" data-d="0.7">Everything you need for your Year 7 quiz</div>
  <div class="dots" data-r="0" data-d="1.0"><i class="bg-teal"></i><i class="bg-purple"></i><i class="bg-red"></i><i class="bg-yellow"></i><i class="bg-navy"></i></div>
</div>""",
         beats=[("Hi! Ready for your A.I. quiz? Let's go through everything you need to know.", 0)]),

    # 1 ─ What is AI?
    dict(html="""
<h1>What is Artificial Intelligence?</h1>
<div class="defbox" data-r="0"><b class="teal">AI</b> = computer systems that <b>learn from data</b> to make decisions or predictions, without being programmed for every situation.</div>
<div class="grid2">
  <div class="card" data-r="1">
    <div class="cardhead"><div class="ic bg-navy">🧮</div><h2>Traditional programming</h2></div>
    <ul><li>Follows fixed "if-then" rules</li><li>Fails in situations it wasn't programmed for</li><li>Example: <b>a basic calculator</b></li></ul>
  </div>
  <div class="card" data-r="2">
    <div class="cardhead"><div class="ic bg-teal">🤖</div><h2>Artificial Intelligence</h2></div>
    <ul><li>Learns from data to make decisions</li><li>Can handle new, unexpected situations</li><li>Example: <b>a spam filter</b></li></ul>
  </div>
</div>""",
         beats=[
             ("A.I. means computer systems that learn from data to make decisions or predictions, without being programmed for every situation.", 0),
             ("Traditional programs follow fixed if-then rules, like a calculator.", 1),
             ("A.I. can handle new situations, like a spam filter.", 2),
         ]),

    # 2 ─ Key vocabulary
    dict(html="""
<h1>Key vocabulary</h1>
<div class="grid2 vocab">
  <div class="card" data-r="1"><h3 class="teal">Automation</h3><p>Using technology to do tasks without a human.</p></div>
  <div class="card" data-r="2"><h3 class="teal">Algorithm</h3><p>A step-by-step set of instructions a computer follows.</p></div>
  <div class="card" data-r="3"><h3 class="red">Perception</h3><p>How machines collect and understand signals from their surroundings.</p></div>
  <div class="card" data-r="4"><h3 class="red">Intelligence</h3><p>The ability to learn, reason, solve problems and adapt.</p></div>
  <div class="card" data-r="5"><h3 class="purple">Dataset</h3><p>A huge collection of information used to train AI.</p></div>
  <div class="card" data-r="6"><h3 class="purple">Generative AI</h3><p>AI that creates new content, like text or images.</p></div>
</div>
<div class="tip" data-r="0"><b>Quiz tip:</b> Learn these word-for-word. Some questions give you the definition and ask for the word.</div>""",
         beats=[
             ("Learn these six words, word for word!", 0),
             ("Automation: using technology to do tasks without a human.", 1),
             ("Algorithm: a step-by-step set of instructions a computer follows.", 2),
             ("Perception: how machines collect and understand signals from their surroundings.", 3),
             ("Intelligence: the ability to learn, reason, solve problems and adapt.", 4),
             ("Dataset: a huge collection of information used to train A.I.", 5),
             ("And generative A.I. is A.I. that creates new content, like text or images.", 6),
         ]),

    # 3 ─ AI in the UAE
    dict(html="""
<h1>AI all around us in the UAE 🇦🇪</h1>
<div class="uae">
  <div class="col">
    <div class="card row" data-r="0"><div class="ic bg-teal">🚦</div><div><h2>Smart traffic signals</h2><p>In Dubai, traffic lights change using real-time traffic flow, not a fixed timer.</p></div></div>
    <div class="card row" data-r="1"><div class="ic bg-purple">✈️</div><div><h2>Biometric airport gates</h2><p>At Abu Dhabi Airport, gates use facial recognition. If the match is unclear, <b>a human should check, because AI can make mistakes.</b></p></div></div>
  </div>
  <div class="card lav" data-r="2">
    <h2>Visible or hidden AI?</h2>
    <p><b class="purple">Visible:</b> you can see it working, e.g. facial unlock.</p>
    <p><b class="purple">Hidden:</b> works behind the scenes, e.g. a recommendation engine suggesting videos.</p>
  </div>
</div>
<div class="tip" data-r="1" data-d="3.0"><b>Quiz tip:</b> For short answers, give the action AND the reason: "A human should check … because …"</div>""",
         beats=[
             ("In Dubai, traffic lights change with real-time traffic flow.", 0),
             ("Abu Dhabi Airport gates use facial recognition. If it's unclear, a human should check, because A.I. can make mistakes.", 1),
             ("A.I. can be visible, like face unlock, or hidden, like video suggestions.", 2),
         ]),

    # 4 ─ Five Big Ideas
    dict(html="""
<h1>The Five Big Ideas of AI</h1>
<div class="five">
  <div class="card" data-r="0" data-d="0.0"><div class="ic bg-teal">👁️</div><h2>1. Perception</h2><p>Senses the world using sensors</p></div>
  <div class="card" data-r="0" data-d="0.9"><div class="ic bg-purple">🗺️</div><h2>2. Representation</h2><p>Keeps internal models (maps) of the world</p></div>
  <div class="card" data-r="0" data-d="2.6"><div class="ic bg-red">🎓</div><h2>3. Learning</h2><p>Learns and improves from big data</p></div>
  <div class="card" data-r="1" data-d="0.0"><div class="ic bg-yellow">💬</div><h2>4. Natural Interaction</h2><p>Talks and works with humans naturally</p></div>
  <div class="card" data-r="1" data-d="1.4"><div class="ic bg-navy">🌍</div><h2>5. Societal Impact</h2><p>Changes society in good and bad ways</p></div>
</div>
<div class="trick" data-r="2">🧠 <b>P</b>lease <b>R</b>emember <b>L</b>earning <b>I</b>s <b>I</b>nteresting!</div>""",
         beats=[
             ("The Five Big Ideas of A.I. are: Perception, sensing the world. Representation, making maps of the world. Learning from big data.", 0),
             ("Natural Interaction with humans. And Societal Impact, good and bad.", 1),
             ("Memory trick: Please Remember Learning Is Interesting!", 2),
         ]),

    # 5 ─ Self-driving car
    dict(html="""
<h1>How a self-driving car "sees" 🚗</h1>
<div class="car">
  <div>
    <h2 class="label">Sensors</h2>
    <div class="pill" data-r="0" data-d="0.0">📷 <b class="teal">Cameras:</b> capture colour pixels</div>
    <div class="pill" data-r="0" data-d="0.9">🔦 <b class="teal">LiDAR:</b> measures distance with lasers</div>
    <div class="pill" data-r="0" data-d="1.6">📡 <b class="teal">Radar:</b> measures distance with radio waves</div>
    <div class="pill" data-r="0" data-d="2.3">🎤 <b class="teal">Microphones:</b> turn sound into digital data</div>
  </div>
  <div>
    <h2 class="label">The 4 steps, in order</h2>
    <div class="step" data-r="1"><span class="num bg-red">1</span>Sensors collect information about the road</div>
    <div class="step" data-r="2"><span class="num bg-red">2</span>AI identifies the object and puts it on a map</div>
    <div class="step" data-r="3"><span class="num bg-red">3</span>The system predicts what may happen next</div>
    <div class="step" data-r="4"><span class="num bg-red">4</span>The vehicle chooses a safe action</div>
  </div>
</div>
<div class="tip" data-r="4" data-d="1.4"><b>Remember:</b> AI does NOT see like a human. It turns sensor signals into data and spots patterns.</div>""",
         beats=[
             ("A self-driving car senses with cameras, lie-dar, radar and microphones.", 0),
             ("One: sensors collect road information.", 1),
             ("Two: A.I. identifies objects and maps them.", 2),
             ("Three: it predicts what happens next.", 3),
             ("Four: it chooses a safe action.", 4),
         ]),

    # 6 ─ Using AI responsibly
    dict(html="""
<h1>Using AI responsibly</h1>
<div class="grid2 values">
  <div class="card row" data-r="0"><div class="ic bg-purple">🎯</div><div><h2>Accuracy</h2><p>Test AI to keep mistakes low. Bad data = bad decisions.</p></div></div>
  <div class="card row" data-r="1"><div class="ic bg-purple">🔒</div><div><h2>Privacy</h2><p>Protect people's personal data.</p></div></div>
  <div class="card row" data-r="2"><div class="ic bg-purple">🙋</div><div><h2>Honesty</h2><p>People should always know if they are talking to an AI or a human.</p></div></div>
  <div class="card row" data-r="3"><div class="ic bg-purple">🎨</div><div><h2>Copyright</h2><p>Respect work made by real artists, authors and programmers.</p></div></div>
</div>""",
         beats=[
             ("Be responsible! Accuracy: bad data means bad decisions.", 0),
             ("Privacy: protect personal data.", 1),
             ("Honesty: people should know if they're talking to an A.I.", 2),
             ("And copyright: respect real artists and authors.", 3),
         ]),

    # 7 ─ Prompt in, response out
    dict(html="""
<h1>Prompt in, response out</h1>
<div class="flow">
  <div class="card" data-r="0"><div class="ic bg-teal">⌨️</div><h2>PROMPT</h2><p>The question or instruction you type in</p></div>
  <div class="arrow" data-r="1">➜</div>
  <div class="card" data-r="1"><div class="ic bg-purple">🧠</div><h2>AI PREDICTS</h2><p>It guesses the most likely helpful words, one at a time</p></div>
  <div class="arrow" data-r="1" data-d="1.8">➜</div>
  <div class="card" data-r="1" data-d="1.8"><div class="ic bg-red">💬</div><h2>RESPONSE</h2><p>The text the AI gives back to you</p></div>
</div>
<div class="defbox lavbox" data-r="2"><b class="purple">Remember:</b> AI doesn't "know" things or read your mind. It predicts words from patterns, so it can sound confident even when it is <b>wrong</b>.</div>""",
         beats=[
             ("When you type a prompt into a chatbot,", 0),
             ("the A.I. predicts the most likely words, one at a time, to make its response.", 1),
             ("It doesn't really know things, so it can sound confident even when it's wrong!", 2),
         ]),

    # 8 ─ Weak vs strong prompt
    dict(html="""
<h1>Weak prompt vs strong prompt</h1>
<div class="grid2">
  <div class="card row weak" data-r="0"><div class="ic glyph bg-red">✕</div><div><h2 class="red">Weak: <i>"tell me about volcanoes"</i></h2><p>Too vague. You might get a huge essay or the wrong level.</p></div></div>
  <div class="card row strong" data-r="1"><div class="ic glyph bg-teal">✓</div><div><h2 class="teal">Strong:</h2><p class="big"><i>"Explain how volcanoes erupt for a Year 7 student, in 5 short bullet points."</i></p></div></div>
</div>
<h2 class="label" data-r="2">The 4 ingredients of a great prompt</h2>
<div class="tiles">
  <div class="tile bg-teal"   data-r="2" data-d="0.4"><h3>TASK</h3><p>What should it do?<br>Explain, list, compare</p></div>
  <div class="tile bg-purple" data-r="2" data-d="0.8"><h3>TOPIC</h3><p>What is it about?<br>"how volcanoes erupt"</p></div>
  <div class="tile bg-red"    data-r="2" data-d="1.2"><h3>AUDIENCE</h3><p>Who is it for?<br>"for a Year 7 student"</p></div>
  <div class="tile bg-navy"   data-r="2" data-d="1.6"><h3>FORMAT</h3><p>What shape and size?<br>"5 bullet points"</p></div>
</div>""",
         beats=[
             ("\"Tell me about volcanoes\" is a weak prompt. It's too vague.", 0),
             ("\"Explain how volcanoes erupt for a Year seven student, in five short bullet points\" is strong,", 1),
             ("because it has a task, a topic, an audience, and a format.", 2),
         ]),

    # 9 ─ PREP
    dict(html="""
<h1>The PREP formula</h1>
<div class="prep">
  <div class="preprow" data-r="0" data-d="0.0"><span class="letter bg-teal">P</span><div><b>Persona</b> Give the AI a role</div><div class="ex">"Act as an environmental scientist."</div></div>
  <div class="preprow" data-r="0" data-d="1.6"><span class="letter bg-purple">R</span><div><b>Request</b> State the task clearly</div><div class="ex">"Write a short guide about recycling plastics."</div></div>
  <div class="preprow" data-r="1" data-d="0.0"><span class="letter bg-red">E</span><div><b>Examples</b> Give context</div><div class="ex">"Focus on plastic waste in UAE schools."</div></div>
  <div class="preprow" data-r="1" data-d="1.3"><span class="letter bg-navy">P</span><div><b>Parameters</b> Set the rules: length, tone</div><div class="ex">"Use 3 bullet points in a formal tone."</div></div>
</div>""",
         beats=[
             ("Or use the PREP formula. Persona: give the A.I. a role. Request: state the task clearly.", 0),
             ("Examples: give context. Parameters: set rules like length and tone.", 1),
         ]),

    # 10 ─ Common mistakes
    dict(html="""
<h1>Common mistakes and how to fix them</h1>
<div class="grid2">
  <div>
    <h2 class="label">Watch out for</h2>
    <div class="card row warn" data-r="0" data-d="0.0"><div class="ic sm bg-red">⚠️</div><div><h3>Missing constraints</h3><p>No length given, so the answer is far too long or too short.</p></div></div>
    <div class="card row warn" data-r="0" data-d="1.0"><div class="ic sm bg-red">⚠️</div><div><h3>Being too vague</h3><p>One-word prompts leave the AI guessing.</p></div></div>
    <div class="card row warn" data-r="0" data-d="1.9"><div class="ic sm bg-red">⚠️</div><div><h3>Overloading context</h3><p>Too many unrelated questions in one prompt confuse the AI.</p></div></div>
  </div>
  <div class="card mint" data-r="1">
    <div class="cardhead"><div class="ic bg-teal">🔄</div><h2>Refine with follow-up prompts</h2></div>
    <ul><li>"Make it shorter."</li><li>"Explain that more simply."</li><li>"Give me an example."</li><li>"Put that in a table."</li><li>"Rewrite this for younger readers."</li></ul>
    <p class="teal strongline">More detail = BETTER answers, not worse!</p>
  </div>
</div>""",
         beats=[
             ("Avoid missing constraints, being too vague, or asking too many questions at once.", 0),
             ("Then improve answers with follow-ups like \"make it shorter.\"", 1),
         ]),

    # 11 ─ Stay safe
    dict(html="""
<h1>Stay safe with AI</h1>
<div class="grid2 values">
  <div class="card row" data-r="0"><div class="ic bg-red">🔒</div><div><h2>Keep it private</h2><p>Never share your full name, address, school, passwords or photos.</p></div></div>
  <div class="card row" data-r="1"><div class="ic bg-teal">✅</div><div><h2>Check the facts</h2><p>AI can be wrong. Check important facts in a trusted source.</p></div></div>
  <div class="card row" data-r="2"><div class="ic bg-purple">💜</div><div><h2>Be kind and honest</h2><p>Only ask for appropriate things. Don't pass off AI work as your own.</p></div></div>
  <div class="card row" data-r="3"><div class="ic bg-navy">🧑‍🏫</div><div><h2>Tell a teacher</h2><p>If a response seems strange, upsetting or unsafe, stop and tell an adult.</p></div></div>
</div>
<div class="tip" data-r="3" data-d="2.0"><b>Quiz tip:</b> Safe: "I am a Year 7 student who likes football". Not safe: anything that identifies you.</div>""",
         beats=[
             ("Stay safe: never share your name, address, school, passwords or photos.", 0),
             ("Check the facts.", 1),
             ("Don't pass off A.I. work as your own.", 2),
             ("And if anything seems upsetting, stop and tell an adult.", 3),
         ]),

    # 12 ─ AI artistry
    dict(html="""
<h1>AI Artistry: human art vs AI images</h1>
<div class="art">
  <div class="card" data-r="0"><div class="cardhead"><div class="ic bg-red">🖌️</div><h2>Human artwork</h2></div>
    <ul><li>Comes from personal emotion and experience</li><li>Made with real materials or digital tools</li><li>Intentional artistic choices</li></ul></div>
  <div class="card" data-r="1"><div class="cardhead"><div class="ic bg-purple">🤖</div><h2>Synthetic media (AI)</h2></div>
    <ul><li>Made by statistical algorithms</li><li>Copies patterns from huge training datasets</li><li>No personal intent or real emotion</li></ul></div>
  <div class="card navycard" data-r="2"><div class="cardhead"><div class="ic bg-yellow">✋</div><h2 class="yellow">Why extra fingers?</h2></div>
    <p>AI predicts pixel patterns. It doesn't understand that a hand has five fingers, or how letters spell words, so hands and text often go wrong.</p></div>
</div>
<div class="trick" data-r="3">🎨 "AI is a brush, but <b>you</b> are the artist!"</div>""",
         beats=[
             ("Human art comes from real emotion and experience.", 0),
             ("A.I. images just copy patterns from huge datasets.", 1),
             ("That's why they often get extra fingers!", 2),
             ("Remember: A.I. is a brush, but you are the artist!", 3),
         ]),

    # 13 ─ Outro / self-check
    dict(html="""
<h1>Self-check: are you quiz-ready?</h1>
<div class="grid2 checks">
  <div class="chk" data-r="0" data-d="0.0"><span class="box" data-r="0" data-d="0.3"></span>I can explain how AI is different from a calculator</div>
  <div class="chk" data-r="0" data-d="0.2"><span class="box" data-r="0" data-d="0.5"></span>I can name all Five Big Ideas in order</div>
  <div class="chk" data-r="0" data-d="0.4"><span class="box" data-r="0" data-d="0.7"></span>I can put the 4 self-driving car steps in order</div>
  <div class="chk" data-r="0" data-d="0.6"><span class="box" data-r="0" data-d="0.9"></span>I can name one ethical value and explain it</div>
  <div class="chk" data-r="0" data-d="0.8"><span class="box" data-r="0" data-d="1.1"></span>I can write a prompt with Task, Topic, Audience and Format</div>
  <div class="chk" data-r="0" data-d="1.0"><span class="box" data-r="0" data-d="1.3"></span>I can say what P-R-E-P stands for</div>
  <div class="chk" data-r="0" data-d="1.2"><span class="box" data-r="0" data-d="1.5"></span>I can write a follow-up prompt that improves an answer</div>
  <div class="chk" data-r="0" data-d="1.4"><span class="box" data-r="0" data-d="1.7"></span>I can give one difference between human art and AI images</div>
</div>
<div class="goodluck" data-r="1">Good luck! 🍀</div>""",
         beats=[
             ("If you can tick every box, you're quiz-ready!", 0),
             ("Good luck!", 1),
         ]),
]
