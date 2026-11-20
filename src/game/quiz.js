// HOW WELL DO YOU KNOW ZUBIA? Question pool (all facts from her CV / project notes), scoring and ranks.
// Works offline: everything here is local. "ask" is used only when online, to fetch a bonus fact
// from the RAG assistant.
export const POOL = [
  {
    q: 'Which game engine is Zubia’s main engine?',
    a: ['Unity', 'Unreal Engine', 'Godot', 'GameMaker'],
    fact: 'Unity (C#) is her main engine: gameplay, enemy AI, VR and UI.',
    ask: 'In one sentence, what kind of Unity work do you do most?',
  },
  {
    q: 'Where is Zubia studying Computer Science?',
    a: ['NED University, Karachi', 'IBA, Karachi', 'LUMS, Lahore', 'FAST, Islamabad'],
    fact: 'B.S. CSIT with a Gaming & Animation specialization at NED University (2023–2027).',
    ask: 'In one sentence, what is your degree specialization about?',
  },
  {
    q: 'What did she win at GameCon, NED’s game dev competition?',
    a: ['Runner-up (2nd place)', '1st place', 'Best Art award', 'Audience choice'],
    fact: 'She was runner-up at GameCon at NED University.',
    ask: 'In one sentence, tell me about a competition or game jam you took part in.',
  },
  {
    q: 'Her final year project, VR-UAVSim, trains people to fly…',
    a: ['Drones (UAVs)', 'Passenger jets', 'Helicopters', 'Spaceships'],
    fact: 'VR-UAVSim is a VR flight-training simulator for UAVs, a concept proposed by SUPARCO.',
    ask: 'In one sentence, what is special about VR-UAVSim?',
  },
  {
    q: 'Which VR headset does she build experiences for?',
    a: ['Meta Quest', 'HTC Vive', 'PlayStation VR2', 'Apple Vision Pro'],
    fact: 'She builds Meta Quest experiences with the XR Interaction Toolkit.',
    ask: 'In one sentence, which VR interactions have you built?',
  },
  {
    q: 'How many game-studio internships has she completed?',
    a: ['3', '1', '2', '5'],
    fact: 'Game Storm Studios, Treeobit and TechCami, plus freelance work.',
    ask: 'In one sentence, what did you build at Game Storm Studios?',
  },
  {
    q: 'In The Unbroken Oath, where is the rescue mission set?',
    a: ['A ruined Sun Temple', 'A space station', 'A desert city', 'An abandoned asylum'],
    fact: 'Operation Sun Temple: free three captured friends, from morning light into a night storm.',
    ask: 'In one sentence, what are the enemies like in The Unbroken Oath?',
  },
  {
    q: 'In The Abduction, where does the kidnapped boy wake up?',
    a: ['An abandoned asylum', 'A pirate ship', 'A forest cabin', 'A school basement'],
    fact: 'Find keys, solve the riddle on each door and avoid the patrolling guards. Free on itch.io!',
    ask: 'In one sentence, how do the guards behave in The Abduction?',
  },
  {
    q: 'Spikes Rush, her endless runner, was built in…',
    a: ['Unreal Engine', 'Unity', 'Godot', 'Three.js'],
    fact: 'Spikes Rush is an Unreal Engine runner: a spiky purple germ dodging barricades.',
    ask: 'In one sentence, what have you built in Unreal Engine?',
  },
  {
    q: 'Warp: Fractured Reality splits two scientists between which dimensions?',
    a: ['Time and Space', 'Fire and Ice', 'Light and Dark', 'Past and Future'],
    fact: 'A split-screen co-op game: both players have to reach the end together.',
    ask: 'In one sentence, how does co-op work in Warp: Fractured Reality?',
  },
  {
    q: 'What is her main programming language?',
    a: ['C#', 'Python', 'Java', 'Rust'],
    fact: 'C# daily, plus C++, JavaScript and PHP.',
    ask: 'In one sentence, what do you use C++ for?',
  },
  {
    q: 'How many keys do you need to escape her VR Escape Room?',
    a: ['3', '2', '4', '5'],
    fact: 'Three riddles, three keys: a shooting target, a grabbable chess puzzle and a dial lock.',
    ask: 'In one sentence, what puzzles are in your VR Escape Room?',
  },
  {
    q: 'What was the name of the team that made The Unbroken Oath?',
    a: ['Dazzling Devs', 'Pixel Pirates', 'Code Knights', 'Byte Squad'],
    fact: 'A team of four: Samrah, Duaa, Zubia and Maha.',
    ask: 'In one sentence, what was your role in The Unbroken Oath?',
  },
  {
    q: 'Besides A*, which path-planning algorithm has she worked with?',
    a: ['RRT*', 'Minimax', 'Q-learning', 'Genetic algorithms'],
    fact: 'Her game AI work covers A*, RRT/RRT*, NavMesh and sight & noise detection.',
    ask: 'In one sentence, how do you make enemy AI feel alive?',
  },
  {
    q: 'The Masked Regime was made for a 2025 game jam. What was the theme?',
    a: ['Masks', 'Gravity', 'Only one button', 'Time loops'],
    fact: 'A two-player local co-op obstacle race on the theme of masks.',
    ask: 'In one sentence, what is The Masked Regime?',
  },
  {
    q: 'Where can you download three of her games for free?',
    a: ['itch.io', 'Steam', 'Epic Games Store', 'Google Play'],
    fact: 'Super Jump, Warp: Fractured Reality and The Abduction are free on itch.io.',
    ask: 'In one sentence, which of your games can people play right now?',
  },
  {
    q: 'At Treeobit, what did she mainly work on?',
    a: ['Character animation systems', 'Sound design', 'Marketing', 'QA testing only'],
    fact: 'Animation-state blending, level integration and core mechanics in C#.',
    ask: 'In one sentence, what did you do at Treeobit?',
  },
]

export const ROUNDS = 5
export const TIME = 15 // seconds per question

const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Pick ROUNDS questions; each gets its options shuffled. correct = index of the right option. */
export function deal() {
  return shuffle(POOL)
    .slice(0, ROUNDS)
    .map((item) => {
      const opts = shuffle(item.a.map((text, i) => ({ text, right: i === 0 })))
      return { ...item, opts, correct: opts.findIndex((o) => o.right) }
    })
}

export const comboMult = (streak) => (streak >= 4 ? 3 : streak === 3 ? 2 : streak === 2 ? 1.5 : 1)
export const points = (secsLeft, streak) => Math.round((100 + secsLeft * 10) * comboMult(streak))

export function rankOf(correct) {
  if (correct >= ROUNDS) return { id: 'legend', title: 'Legendary Recruiter', icon: '👑', line: 'Perfect run. You know Zubia better than her CV does!' }
  if (correct >= 3) return { id: 'scout', title: 'Talent Scout', icon: '🔭', line: 'Sharp eye! You spotted most of the talent.' }
  return { id: 'rookie', title: 'Rookie', icon: '🌱', line: 'Every recruiter starts somewhere. Explore the studio and try again!' }
}

// Zubia's player card: game-style ratings, kept in line with her Fit Check scores (api/_data/fit.json)
export const CARD_STATS = [
  ['UNI', 'Unity', 95],
  ['VR', 'VR / XR', 90],
  ['AI', 'Enemy AI', 82],
  ['NET', 'Multiplayer', 80],
  ['3D', '3D & anim', 72],
  ['UE', 'Unreal', 70],
]
// overall rating = the average of the six
export const CARD_OVR = Math.round(CARD_STATS.reduce((a, s) => a + s[2], 0) / CARD_STATS.length)
