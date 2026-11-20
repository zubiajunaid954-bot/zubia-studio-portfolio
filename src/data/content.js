// All site content lives here. Edit this file to change text, projects or links.
// Images and videos go in /public/media and are referenced as '/media/<file>'.

export const profile = {
  name: 'Zubia Junaid',
  first: 'Zubia',
  role: 'Game Developer',
  roleLine: 'Unity · Unreal Engine · VR/XR',
  hook:
    'I build games and VR experiences people can step into. Final-year Computer Science student at NED University, specialising in Gaming & Animation, with three game-studio internships behind me.',
  location: 'Karachi, Pakistan',
  availability: 'Open to game developer roles & internships',
  photo: '/img/profile.jpg',
  cv: '/Zubia_Junaid_Resume.pdf',
  email: 'zubiajunaid954@gmail.com',
  links: {
    linkedin: 'https://www.linkedin.com/in/zubia-junaid-9b53b4354',
    github: 'https://github.com/zubiajunaid954-bot',
    itch: 'https://zubia-junaid.itch.io',
  },
}

export const stats = [
  { value: '3', label: 'Game-studio internships' },
  { value: '16', label: 'Projects built' },
  { value: '2nd', label: 'GameCon, NED University' },
]

export const about = {
  paragraphs: [
    'I am a game developer focused on gameplay programming and VR. I am completing a BS in Computer Science & IT at NED University of Engineering & Technology, Karachi, with a specialisation in Gaming & Animation.',
    'Most of my work is in C#: game logic, level design, enemy AI and animation systems in Unity. I have built VR projects for Meta Quest, endless runners in Unreal Engine, and released playable builds on itch.io. I also build full-stack web apps, including this 3D portfolio.',
  ],
  facts: [
    { label: 'Based in', value: 'Karachi, Pakistan' },
    { label: 'Degree', value: 'BS CSIT, Gaming & Animation' },
    { label: 'Graduating', value: '2027' },
    { label: 'Focus', value: 'Unity, VR/XR, gameplay' },
  ],
  focus: [
    { title: 'Unity gameplay', text: 'Game logic, win/lose conditions, levels, difficulty tuning and animation state machines in C#.' },
    { title: 'VR for Meta Quest', text: 'Grabbing, teleport locomotion, hand and controller input, socket puzzles and spatial audio with XRI.' },
    { title: 'Enemy AI', text: 'Patrols, sight and noise detection, NavMesh movement, and A* / RRT* path planning.' },
    { title: 'Unreal Engine', text: 'Third-person gameplay and endless runners built with Blueprints.' },
  ],
}

export const skillGroups = [
  { title: 'Game engines', level: 'Core', items: ['Unity 3D', 'Unity 2D', 'Unreal Engine 5', 'Blueprints'] },
  { title: 'Gameplay & AI', level: 'Core', items: ['Gameplay programming', 'Level design', 'State machines', 'Sight & noise detection', 'NavMesh', 'A* / RRT* pathfinding', 'Animation blending'] },
  { title: 'VR / XR', level: 'Core', items: ['Meta Quest', 'XR Interaction Toolkit', 'XR Origin', 'Teleport locomotion', 'Spatial audio'] },
  { title: 'Languages', level: 'Daily', items: ['C#', 'C++', 'JavaScript', 'PHP', 'SQL'] },
  { title: '3D & tools', level: 'Daily', items: ['Blender', 'Three.js / WebGL', 'OpenGL', 'SFML', 'Git / GitHub', 'Visual Studio'] },
  { title: 'Web & backend', level: 'Working', items: ['React', 'Node.js', 'Express', 'Laravel', 'MySQL', 'MongoDB', 'Socket.io'] },
]

export const education = [
  {
    title: 'B.S. Computer Science & IT, Gaming & Animation',
    place: 'NED University of Engineering & Technology, Karachi',
    when: '2023 – 2027',
    note: 'Final year project: VR-UAVSim, a VR drone-flight training simulator for Meta Quest, based on a concept proposed by SUPARCO.',
  },
]

export const experience = [
  {
    title: 'Game Developer Intern',
    place: 'Game Storm Studios, Karachi',
    when: 'Jun 2026 – Aug 2026',
    points: [
      'Built a hyper-casual mobile game end to end in Unity, including core logic and win/lose conditions in C#.',
      'Designed several playable levels, tuning difficulty progression and pacing.',
      'Delivered a polished, shippable prototype on a fixed timeline.',
    ],
  },
  {
    title: 'Game Developer Intern',
    place: 'Treeobit, Lahore',
    when: 'Mar 2026 – May 2026',
    points: [
      'Implemented character animation systems with animation-state blending for a 3D game.',
      'Integrated environment assets and interactive elements to support level flow.',
      'Programmed core mechanics in C# with the team.',
    ],
  },
  {
    title: 'Freelance Game & Backend Developer',
    place: 'Self-employed',
    when: '2026',
    points: [
      'Built a real-time multiplayer Ludo game in Unity: rooms, lobby, turns and game logic.',
      'Built the Laravel admin panel and load-balanced Node.js APIs behind it.',
    ],
  },
  {
    title: 'Unity Developer / Web Developer Intern',
    place: 'TechCami',
    when: 'Jan 2025 – Mar 2025',
    points: [
      'Worked on a 3D game covering UI, gameplay systems and enemy AI in C#.',
      'Contributed front-end development and UI design for a web application.',
    ],
  },
]

export const achievements = [
  { title: 'GameCon runner-up', place: 'NED University of Engineering & Technology', text: 'Second place in the university game development competition.', badge: '2nd' },
  { title: 'Game Jam 2025', place: 'Team entry', text: 'Built a multiplayer game with a team within the jam’s time limit (The Masked Regime).', badge: 'Jam' },
  { title: 'Game Development Hackathon', place: 'IBA University, Karachi', text: 'Designed and built a game as part of a team under hackathon conditions.', badge: 'Hack' },
]

export const certifications = [
  { title: 'Pre-Production', org: 'CEGA, Centre of Excellence for Gaming & Animation' },
  { title: 'Unreal Engine', org: 'CEGA, Centre of Excellence for Gaming & Animation' },
  { title: 'Post-Production', org: 'CEGA, Centre of Excellence for Gaming & Animation' },
  { title: 'Introduction to Generative AI', org: 'Google Cloud' },
  { title: 'Introduction to Large Language Models', org: 'Google Cloud' },
  { title: 'Introduction to Responsible AI', org: 'Google Cloud' },
]

export const memberships = [
  'Generative AI team, DataInsight CSIT',
  'Coding team, NED Society of Technology (NST)',
  'Operations team, The Nedians Forum (TNF)',
]

// Project categories used by the gallery filter
export const categories = [
  { id: 'all', label: 'All' },
  { id: 'unity', label: 'Unity' },
  { id: 'unreal', label: 'Unreal' },
  { id: 'vr', label: 'VR / XR' },
  { id: 'other', label: 'Web & C++' },
]

const GH = 'https://github.com/zubiajunaid954-bot/'
const IT = 'https://zubia-junaid.itch.io/'

export const projects = [
  {
    id: 'vr-uavsim',
    title: 'VR-UAVSim',
    cat: 'vr',
    kind: 'Final year project · VR flight-training simulator',
    tagline: 'Unity · Cesium · Meta Quest · team of four',
    summary:
      'A VR simulator where trainees learn to fly a drone, plan missions and see autonomous navigation at work, without a real aircraft. SUPARCO proposed the concept; our team of four is researching and designing it with two supervisors.',
    highlights: [
      'Geographic 3D worlds in Unity using Cesium: terrain, buildings, landing zones and restricted areas',
      'Flight with Meta Quest controllers: take-off, landing, yaw, speed, altitude and camera views',
      'Waypoint mission planning, flown manually or with autonomous RRT* path planning',
      'Obstacle avoidance, geofencing, telemetry and an end-of-mission performance report',
    ],
    specs: { Engine: 'Unity + Cesium', Platform: 'Meta Quest', Team: '4 students, 2 supervisors', Status: 'Planning & design phase' },
    stack: ['Unity', 'Cesium', 'Meta Quest', 'RRT*', 'Geofencing'],
    video: '/media/vr-uavsim-trailer.mp4',
    poster: '/media/vr-uavsim-poster.jpg',
    links: [{ label: 'Project website', href: 'https://vr-uavsim.vercel.app' }],
    featured: true,
  },
  {
    id: 'unbroken-oath',
    title: 'The Unbroken Oath',
    cat: 'unity',
    kind: 'First-person tactical rescue shooter',
    tagline: 'Unity 2022.3 · Windows · team of four',
    summary:
      'Three of your squad have been taken at night and locked inside a temple. You fight through Operation Sun Temple, from morning light into a night storm, and free each captive before the mission fails.',
    highlights: [
      'Rifle, pistol and sniper, plus a cookable frag grenade with a lethal-radius ring',
      'HUD with fire modes, ammo, low-ammo warning and a pulsing health bar',
      'Minimap and full map showing enemies, rescue rooms and med kits',
      'Radio-guided objectives with subtitles, cutscenes and a morning-to-night storm cycle',
    ],
    specs: { Engine: 'Unity 2022.3 LTS', Platform: 'Windows PC', Team: '4 developers (Dazzling Devs)', Code: 'C#, ~5.9k lines' },
    stack: ['Unity 2022.3', 'C#', 'Enemy AI', 'Post Processing'],
    video: '/media/unbroken-oath-trailer.mp4',
    poster: '/media/unbroken-oath-poster.jpg',
    links: [{ label: 'Source on GitHub', href: GH + 'The-Unbroken-Oath' }],
    featured: true,
  },
  {
    id: 'abduction',
    title: 'The Abduction',
    cat: 'unity',
    kind: 'Third-person survival horror · stealth puzzle',
    tagline: 'Unity 6 · URP · free on itch.io',
    summary:
      'A kidnapped boy wakes in an abandoned asylum. Find keys, answer the riddle on each locked door, and avoid or fight the guards patrolling the corridors before your health runs out.',
    highlights: [
      '22 riddle-locked doors with typed answers, feedback and hints',
      'NavMesh guards that patrol, spot you, aim and return to patrol',
      'Health items, keys, a win trigger and a Game Over screen',
      'GDD-driven level design with flickering lights and tense audio',
    ],
    specs: { Engine: 'Unity 6 (URP)', Platform: 'Windows PC', Genre: 'Survival horror, puzzle', Code: 'C#' },
    stack: ['Unity 6', 'C#', 'URP', 'NavMesh AI'],
    video: '/media/abduction-trailer.mp4',
    poster: '/media/abduction-poster.jpg',
    links: [
      { label: 'Play on itch.io', href: IT + 'the-abduction' },
      { label: 'Source on GitHub', href: GH + 'The-Abduction' },
    ],
    featured: true,
  },
  {
    id: 'vr-escape',
    title: 'VR Escape Room',
    cat: 'vr',
    kind: 'VR puzzle game for Meta Quest',
    tagline: 'Unity · XR Interaction Toolkit',
    summary:
      'Locked in a room, you solve three riddles to find three keys and escape as fast as you can: a shooting target, a grabbable chess puzzle and a three-dial code lock.',
    highlights: [
      'XR Origin rig with direct grab, grab ray and animated hands',
      'Teleport locomotion with a context-aware ray',
      'Socket-based puzzles and spatial audio',
      'Run timer with a local top-three leaderboard',
    ],
    specs: { Engine: 'Unity 2020.3 (URP)', Platform: 'Meta Quest', Toolkit: 'XRI 2.2, OpenXR', Code: 'C#, 17 scripts' },
    stack: ['Unity', 'XR Interaction Toolkit', 'Meta Quest', 'URP'],
    video: '/media/vr-escape-room-trailer.mp4',
    poster: '/media/vr-escape-room-poster.jpg',
    links: [{ label: 'Source on GitHub', href: GH + 'VR-Escape-Room' }],
  },
  {
    id: 'warp',
    title: 'Warp: Fractured Reality',
    cat: 'unity',
    kind: 'Two-player co-op sci-fi runner',
    tagline: 'Unity 6 · split-screen · free on itch.io',
    summary:
      'Two scientists are trapped in a collapsing warp tunnel, split between a Time dimension and a Space dimension. They must help each other past the hazards; both have to reach the end.',
    highlights: [
      'Local split-screen co-op with separate cameras, hearts and lanes',
      'Pebbles rewind five seconds; warp masks let you phase through hurdles',
      'Shared win/lose: if either player runs out of lives, both lose',
      'Neon low-poly sci-fi world with enemy AI and dynamic level design',
    ],
    specs: { Engine: 'Unity 6', Platform: 'Windows', Multiplayer: 'Local 2-player split-screen', Code: 'C#' },
    stack: ['Unity 6', 'C#', 'Input System', 'Split-screen'],
    video: '/media/warp-trailer.mp4',
    poster: '/media/warp-poster.jpg',
    links: [
      { label: 'Play on itch.io', href: IT + 'warp-fractured-reality' },
      { label: 'Source on GitHub', href: GH + 'Warp-Fractured-Reality' },
    ],
  },
  {
    id: 'spikes-rush',
    title: 'Spikes Rush',
    cat: 'unreal',
    kind: '3D endless runner',
    tagline: 'Unreal Engine · city street',
    summary:
      'You play a spiky purple germ sprinting down a city street, dodging barricades and collecting gold rings, with a magnet power-up and score counters.',
    highlights: [
      'City-street environment with barricades to dodge',
      'Collectible rings, magnet power-up, score and coin HUD',
      'Built on Unreal’s third-person template with AI-generated 3D assets',
    ],
    specs: { Engine: 'Unreal Engine', Genre: 'Endless runner' },
    stack: ['Unreal Engine', 'Blueprints', 'Third-person template'],
    video: '/media/spikes-rush-trailer.mp4',
    poster: '/media/spikes-rush-poster.jpg',
    links: [],
  },
  {
    id: 'germ-runner',
    title: 'Germ Endless Runner',
    cat: 'unreal',
    kind: '3D endless runner in the bloodstream',
    tagline: 'Unreal Engine 5.7 · Blueprints',
    summary:
      'A germ races down a capillary collecting bacteria, grabbing a magnet power-up and dodging syringes and white blood cells.',
    highlights: [
      'Endless track: tiles spawn ahead and despawn behind',
      'Lane switching, jumping, ducking and a saved high score',
      'Curved-world material bends the track into the distance',
      'All Blueprints: Enhanced Input, UMG, Save Game, Animation Blueprint',
    ],
    specs: { Engine: 'Unreal Engine 5.7', Platform: 'Windows PC', Code: 'Blueprints' },
    stack: ['Unreal Engine 5', 'Blueprints', 'Enhanced Input', 'UMG'],
    video: '/media/germ-runner-trailer.mp4',
    poster: '/media/germ-runner-poster.jpg',
    links: [{ label: 'Source on GitHub', href: GH + 'Germ-Endless-Runner' }],
  },
  {
    id: 'masked-regime',
    title: 'The Masked Regime',
    cat: 'unity',
    kind: 'Game-jam local co-op race',
    tagline: 'Unity 6 · Game Jam 2025 · theme: masks',
    summary:
      'A two-player co-op obstacle race made for a game jam. Two runners share one keyboard with a camera each, and both must reach the end to win.',
    highlights: [
      'Hearts as lives; running out ends the run for both players',
      'Pebbles rewind a hit player up to five seconds',
      'The black mask moves hurdles to a pass-through layer for six seconds',
    ],
    specs: { Engine: 'Unity 6', Event: 'Game Jam 2025', Code: 'C#', Status: 'Prototype' },
    stack: ['Unity 6', 'C#', 'Game jam'],
    video: '/media/masked-regime-trailer.mp4',
    poster: '/media/masked-regime-poster.jpg',
    links: [{ label: 'Source on GitHub', href: GH + 'The-Masked-Regime' }],
  },
  {
    id: 'ludo',
    title: 'Ludo Multiplayer',
    cat: 'unity',
    kind: 'Real-time multiplayer mobile game',
    tagline: 'Unity · Laravel · Node.js · freelance',
    summary:
      'A multiplayer Ludo game for phones. Players create or join rooms, wait in a lobby and play on a four-colour board, with a web admin panel for players and tournaments.',
    highlights: [
      'Rooms, lobbies, turn management and core game logic in Unity',
      'Coin balance and tournament mode',
      'Laravel admin panel: players, tournaments, lobbies and admins',
      'Node.js APIs with load balancing for concurrent sessions',
    ],
    specs: { Engine: 'Unity', Platform: 'Mobile', Backend: 'Node.js + Laravel', Team: 'Solo, freelance' },
    stack: ['Unity', 'C#', 'Laravel', 'Node.js'],
    video: '/media/ludo-trailer.mp4',
    poster: '/media/ludo-poster.jpg',
    links: [],
  },
  {
    id: 'super-jump',
    title: 'Super Jump',
    cat: 'unity',
    kind: '2D platformer',
    tagline: 'Unity 2D · free on itch.io',
    summary: 'A 2D platformer: jump across obstacles, collect items and survive on five lives, with a little bird companion following you.',
    highlights: ['Tilemap level and sprite obstacles', 'Five lives and a collectibles UI', 'Custom follow script for the bird companion', 'Music and sound effects'],
    specs: { Engine: 'Unity 2D', Platform: 'Windows PC', Code: 'C#' },
    stack: ['Unity 2D', 'C#', 'Tilemaps'],
    links: [{ label: 'Play on itch.io', href: IT + 'super-jump' }],
  },
  {
    id: 'hero-knight',
    title: 'Hero Knight: Shadow Quest',
    cat: 'unity',
    kind: '2D action platformer',
    tagline: 'Unity 2D',
    summary: 'A 2D combat platformer with tile-based levels, sprite animation and sword attacks driven by animator state machines.',
    highlights: ['Melee combat and movement', 'Animator state handling in C#', 'Tile-based levels'],
    specs: { Engine: 'Unity 2D', Code: 'C#' },
    stack: ['Unity 2D', 'C#', 'Animator'],
    links: [],
  },
  {
    id: 'connecthub',
    title: 'ConnectHub',
    cat: 'other',
    kind: 'Full-stack real-time forum',
    tagline: 'MongoDB · Express · React · Node.js · Socket.io',
    summary: 'A community forum with live chat: posts, comments, voting, per-category chat rooms, notifications and an admin dashboard.',
    highlights: [
      'JWT httpOnly-cookie auth, roles, rate limiting and CSRF checks',
      'Socket.io chat rooms, presence, typing indicators and notifications',
      'Full-text search and atomic up/down voting',
      '53 Jest + Supertest tests run by GitHub Actions',
    ],
    specs: { Stack: 'MERN + Socket.io', Tests: '53 (Jest, Supertest)', Platform: 'Web' },
    stack: ['React', 'Node.js', 'MongoDB', 'Socket.io'],
    links: [{ label: 'Source on GitHub', href: GH + 'connecthub' }],
  },
  {
    id: 'web3d',
    title: 'Zubia’s Studio (this site)',
    cat: 'other',
    kind: 'Interactive 3D web portfolio',
    tagline: 'Three.js · React Three Fiber · Blender',
    summary: 'This website: a miniature 3D game studio you tour with my Blender avatar, built with React Three Fiber.',
    highlights: ['Isometric miniature studio built procedurally in Three.js', 'Scroll-driven camera tour with an avatar guide', 'Four switchable colour themes and a 2D fallback'],
    specs: { Engine: 'Three.js / React Three Fiber', Platform: 'Web', Team: 'Solo' },
    stack: ['Three.js', 'React', 'Blender'],
    links: [],
  },
  {
    id: 'snake',
    title: 'Snake Game with Hurdles',
    cat: 'other',
    kind: '2D game in C++',
    tagline: 'C++ · SFML',
    summary: 'A snake game with a jungle backdrop, hurdles and a spiked border. Pick a difficulty, then eat as much as you can before time runs out.',
    highlights: ['Three difficulty levels', 'Hurdles, spiked border and a countdown timer', 'Data-structure-driven movement and collisions'],
    specs: { Language: 'C++', Library: 'SFML', Platform: 'Windows' },
    stack: ['C++', 'SFML', 'Data structures'],
    video: '/media/snake-trailer.mp4',
    poster: '/media/snake-poster.jpg',
    links: [],
  },
  {
    id: 'cyber-cafe',
    title: 'Cyber Cafe Pro',
    cat: 'other',
    kind: 'C++ desktop management app',
    tagline: 'C++ · SFML · OOP',
    summary: 'A desktop app for running a cyber cafe: staff login, computer management, bookings, charges and plan renewals, with AI assistant features.',
    highlights: ['Staff login and menus', 'Computer, booking and billing management', 'Object-oriented design with an SFML GUI'],
    specs: { Language: 'C++ (OOP)', Library: 'SFML', Platform: 'Windows' },
    stack: ['C++', 'SFML', 'OOP'],
    video: '/media/cyber-cafe-trailer.mp4',
    poster: '/media/cyber-cafe-poster.jpg',
    links: [],
  },
  {
    id: 'ned-admissions',
    title: 'NED Masters Admissions Portal',
    cat: 'other',
    kind: 'Web application',
    tagline: 'PHP · MySQL',
    summary: 'A university admissions web app: applicants submit and track applications, and staff review them from an admin panel.',
    highlights: ['Application submission and tracking', 'Admin review panel', 'Status updates visible to applicants'],
    specs: { Stack: 'PHP, MySQL, HTML/CSS/JS', Platform: 'Web' },
    stack: ['PHP', 'MySQL', 'JavaScript'],
    links: [],
  },
]

// Promo video for the Screening Room (Module 3). Set src to '/media/promo.mp4' once it is rendered.
export const promo = { src: '/media/promo.mp4', poster: '/media/promo-poster.jpg' }
