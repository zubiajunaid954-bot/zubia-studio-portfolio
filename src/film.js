// "Film mode" for recording promo footage (Module 3): open the site with ?film=1 and the UI is
// hidden, the room is framed in the centre of the screen and the speech bubbles are off.
// Optional: &fz=1.6 zooms the camera in (or <1 out). Not used by normal visitors.
const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams()
export const FILM = params.has('film')
export const FILM_ZONE = FILM ? params.get('zone') : null
export const FILM_ZOOM = parseFloat(params.get('fz') || '1') || 1
if (FILM) document.documentElement.classList.add('film')
