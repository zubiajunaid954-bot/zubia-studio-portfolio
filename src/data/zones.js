// The studio areas, in tour order. Each one is a page section AND a room in the 3D studio.
// `line` is what the avatar says when she reaches the room.
export const zones = [
  { id: 'home', nav: 'Home', label: 'Lobby', line: 'Hi, I’m Zubia! Welcome to my studio.' },
  { id: 'about', nav: 'About', label: 'About Room', line: 'Make yourself comfortable. Here’s my story.' },
  { id: 'skills', nav: 'Skills', label: 'Skills Station', line: 'This is my workstation and my toolkit.' },
  { id: 'career', nav: 'Career', label: 'Career Path', line: 'Follow the path: where I studied and worked.' },
  { id: 'projects', nav: 'Projects', label: 'Project Gallery', line: 'Here’s what I’ve built. Open any project.' },
  { id: 'achievements', nav: 'Trophies', label: 'Trophy Wall', line: 'A few wins I’m proud of.' },
  { id: 'showreel', nav: 'Showreel', label: 'Screening Room', line: 'Grab a seat. My showreel plays here.' },
  { id: 'contact', nav: 'Contact', label: 'Contact Desk', line: 'Want to work together? Leave me a message.' },
].map((z, i) => ({ ...z, index: i, no: String(i + 1).padStart(2, '0') }))

export const zoneIndex = (id) => Math.max(0, zones.findIndex((z) => z.id === id))
