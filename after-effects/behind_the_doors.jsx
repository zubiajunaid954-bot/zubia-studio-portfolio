/*
 * Module 3: "Behind the Doors", a ~48 second promo for Zubia Junaid, built entirely in After Effects.
 *
 * Run in After Effects 2026:  File > Scripts > Run Script File...  > after-effects/behind_the_doors.jsx
 *
 * Concept: a dark corridor of glowing arched doors in 3D. A real AE camera glides up to each door,
 * the door swings open on its hinge, light floods out and we fly through into what is behind it:
 * the 3D studio and avatar, each skill area's games, the career timeline and the trophy wall.
 *
 * Output (all on D:):
 *   after-effects/Zubia_Junaid_Promo.aep                   editable project (submission)
 *   media-src/render/Zubia_Junaid_Promo_master.mp4         full-quality render (submission)
 *   (public/media/promo.mp4 is a compressed web copy made afterwards with ffmpeg)
 *
 * Written in ES3 (semicolons, var, no trailing commas) because that is what ExtendScript accepts.
 */
(function () {
  var ROOT = 'D:/My_Website_v2/';
  var LOG = new File(ROOT + 'after-effects/build_log.txt');
  LOG.open('w');
  function log(s) { LOG.writeln(s); }

  try {
    app.beginSuppressDialogs();
    app.newProject();
    var proj = app.project;
    var W = 1920, H = 1080, FPS = 30, DUR = 48;

    // ---------------------------------------------------------------- palette (Amber Night theme)
    var AMBER = [0.96, 0.62, 0.22];
    var AMBER_HOT = [1.0, 0.72, 0.42];
    var BROWN = [0.353, 0.212, 0.094];
    var WHITE = [0.95, 0.95, 0.95];
    var MUTED = [0.72, 0.67, 0.61];
    var INK = [0.035, 0.035, 0.04];
    var DOORS = [
      { label: 'UNITY', color: [0.11, 0.20, 0.36], glow: [0.55, 0.75, 1.0] },
      { label: 'UNREAL', color: [0.22, 0.16, 0.34], glow: [0.78, 0.66, 1.0] },
      { label: 'VR / XR', color: [0.10, 0.27, 0.22], glow: [0.55, 1.0, 0.80] },
      { label: 'WEB & C++', color: [0.42, 0.20, 0.08], glow: [1.0, 0.70, 0.40] }
    ];
    var GOLD_DOOR = { label: 'TROPHIES', color: [0.45, 0.30, 0.08], glow: [1.0, 0.80, 0.42] };

    var FONT_B = pickFont(['Bahnschrift-Bold', 'SegoeUI-Bold', 'Arial-BoldMT']);
    var FONT_SB = pickFont(['Bahnschrift-SemiBold', 'SegoeUI-Semibold', 'ArialMT']);
    var FONT_L = pickFont(['Bahnschrift-Light', 'Bahnschrift', 'SegoeUI-Light', 'ArialMT']);
    log('fonts: ' + FONT_B + ' / ' + FONT_SB + ' / ' + FONT_L);

    function pickFont(names) {
      try {
        var all = app.fonts.allFonts;
        for (var n = 0; n < names.length; n++) {
          for (var i = 0; i < all.length; i++) {
            for (var j = 0; j < all[i].length; j++) {
              if (all[i][j].postScriptName === names[n]) { return names[n]; }
            }
          }
        }
      } catch (e) {}
      return names[0];
    }

    // ---------------------------------------------------------------- project + footage
    var fWeb = proj.items.addFolder('Footage - 3D website');
    var fGames = proj.items.addFolder('Footage - game trailers');
    var fAudio = proj.items.addFolder('Audio');
    var fPre = proj.items.addFolder('Precomps - doors');

    function imp(path, folder) {
      var f = new File(path);
      if (!f.exists) { log('missing: ' + path); return null; }
      var it = proj.importFile(new ImportOptions(f));
      it.parentFolder = folder;
      return it;
    }
    var CLIP = {};
    var clipNames = ['01-intro', '03-lobby-wave', '05-career', '07-trophies', '10-themes', '06-gallery'];
    for (var c = 0; c < clipNames.length; c++) { CLIP[clipNames[c]] = imp(ROOT + 'media-src/clips/' + clipNames[c] + '.mp4', fWeb); }
    var GAME = {};
    var gameNames = ['unbroken-oath', 'abduction', 'spikes-rush', 'germ-runner', 'vr-uavsim', 'vr-escape-room', 'cyber-cafe'];
    for (var g = 0; g < gameNames.length; g++) { GAME[gameNames[g]] = imp(ROOT + 'public/media/' + gameNames[g] + '-trailer.mp4', fGames); }
    var music = null;
    var mdir = new Folder(ROOT + 'media-src/music');
    if (mdir.exists) {
      var mf = mdir.getFiles(function (f) { return (f instanceof File) && /\.(mp3|wav|m4a)$/i.test(f.name); });
      if (mf.length) { music = imp(mf[0].fsName, fAudio); }
    }
    log('music: ' + (music ? music.name : 'none'));

    var comp = proj.items.addComp('Zubia_Junaid_Promo', W, H, 1, DUR, FPS);
    comp.bgColor = INK;

    // ---------------------------------------------------------------- generic helpers
    function setEase(prop, infl) {
      var e = new KeyframeEase(0, infl || 80);
      for (var k = 1; k <= prop.numKeys; k++) {
        try { prop.setTemporalEaseAtKey(k, [e], [e]); } catch (x) {
          try { prop.setTemporalEaseAtKey(k, [e, e], [e, e]); } catch (y) {
            try { prop.setTemporalEaseAtKey(k, [e, e, e], [e, e, e]); } catch (z) {}
          }
        }
      }
    }
    function keys(prop, list, infl) {
      for (var i = 0; i < list.length; i++) { prop.setValueAtTime(list[i][0], list[i][1]); }
      setEase(prop, infl);
    }
    function span(l, t0, t1) { l.inPoint = t0; l.outPoint = t1; return l; }
    function fx(l, m) { return l.property('ADBE Effect Parade').addProperty(m); }
    function tr(l, m) { return l.property('ADBE Transform Group').property(m); }
    function solid(color, name, t0, t1, w, h, target) {
      var l = (target || comp).layers.addSolid(color, name, w || W, h || H, 1, DUR);
      return span(l, t0, t1);
    }
    function text(s, o, target) {
      var l = (target || comp).layers.addText(s);
      var p = l.property('Source Text');
      var d = p.value;
      d.resetCharStyle();
      d.resetParagraphStyle();
      d.font = o.font || FONT_B;
      d.fontSize = o.size || 80;
      d.applyFill = o.outline ? false : true;
      if (!o.outline) { d.fillColor = o.color || WHITE; }
      d.applyStroke = o.outline ? true : false;
      if (o.outline) { d.strokeColor = o.color || AMBER; d.strokeWidth = o.stroke || 3; d.strokeOverFill = true; }
      d.tracking = o.tracking || 0;
      d.justification = o.just || ParagraphJustification.CENTER_JUSTIFY;
      p.setValue(d);
      span(l, o.t0, o.t1);
      tr(l, 'ADBE Position').setValue(o.pos);
      l.name = 'TXT ' + s.substr(0, 26);
      return l;
    }
    function fadeOut(l, d) {
      var op = tr(l, 'ADBE Opacity');
      keys(op, [[l.outPoint - (d || 0.3), op.numKeys ? op.valueAtTime(l.outPoint - (d || 0.3), false) : 100], [l.outPoint, 0]], 60);
    }
    // characters fade in left to right while the letter spacing tightens
    function reveal(l, t, d, trackFrom) {
      var an = l.property('ADBE Text Properties').property('ADBE Text Animators');
      var a = an.addProperty('ADBE Text Animator');
      a.name = 'Reveal';
      a.property('ADBE Text Animator Properties').addProperty('ADBE Text Opacity').setValue(0);
      var blurP = a.property('ADBE Text Animator Properties').addProperty('ADBE Text Blur');
      blurP.setValue([18, 18]);
      var sel = a.property('ADBE Text Selectors').addProperty('ADBE Text Selector');
      keys(sel.property('ADBE Text Percent Start'), [[t, 0], [t + d, 100]], 55);
      if (trackFrom) {
        var a2 = an.addProperty('ADBE Text Animator');
        a2.name = 'Tracking';
        keys(a2.property('ADBE Text Animator Properties').addProperty('ADBE Text Tracking Amount'), [[t, trackFrom], [t + d + 0.6, 0]], 85);
      }
      keys(tr(l, 'ADBE Opacity'), [[l.outPoint - 0.3, 100], [l.outPoint, 0]], 60);
      return l;
    }
    // slide up + unblur
    function rise(l, t, d, dy) {
      var p = tr(l, 'ADBE Position');
      var v = p.value;
      keys(p, [[t, [v[0], v[1] + (dy || 60)]], [t + (d || 0.5), v]], 88);
      keys(tr(l, 'ADBE Opacity'), [[t, 0], [t + (d || 0.5) * 0.7, 100], [l.outPoint - 0.25, 100], [l.outPoint, 0]], 60);
      var b = fx(l, 'ADBE Gaussian Blur 2');
      keys(b.property(1), [[t, 30], [t + (d || 0.5), 0]], 80);
      return l;
    }
    function flash(t, color, peak, len) {
      var l = solid(color || AMBER_HOT, 'FLASH', t - 0.12, t + (len || 0.35));
      l.blendingMode = BlendingMode.ADD;
      keys(tr(l, 'ADBE Opacity'), [[t - 0.12, 0], [t, peak || 85], [t + (len || 0.35), 0]], 50);
      return l;
    }
    function footage(item, t0, t1, clipIn, scale, name) {
      if (!item) { return null; }
      var l = comp.layers.add(item);
      l.startTime = t0 - clipIn;
      span(l, t0, t1);
      l.name = name || item.name;
      try { l.audioEnabled = false; } catch (e) {}
      if (scale) { tr(l, 'ADBE Scale').setValue([scale, scale]); }
      return l;
    }
    function marker(t, s) { comp.markerProperty.setValueAtTime(t, new MarkerValue(s)); }

    // ---------------------------------------------------------------- arch shape helpers
    var DW = 520, DH = 940; // door width / height (pixels in the door precomps)
    function archShape(w, h) {
      var r = w / 2, k = 0.5523 * r, top = -h / 2 + r;
      var s = new Shape();
      s.vertices = [[-r, h / 2], [-r, top], [0, -h / 2], [r, top], [r, h / 2]];
      s.inTangents = [[0, 0], [0, 0], [-k, 0], [0, -k], [0, 0]];
      s.outTangents = [[0, 0], [0, -k], [k, 0], [0, 0], [0, 0]];
      s.closed = true;
      return s;
    }
    function addArch(layer, w, h, fillColor, strokeColor, strokeW, name) {
      var grp = layer.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group');
      grp.name = name || 'arch';
      var path = grp.property('ADBE Vectors Group').addProperty('ADBE Vector Shape - Group');
      path.property('ADBE Vector Shape').setValue(archShape(w, h));
      if (fillColor) {
        var f = grp.property('ADBE Vectors Group').addProperty('ADBE Vector Graphic - Fill');
        f.property('ADBE Vector Fill Color').setValue(fillColor);
      }
      if (strokeColor) {
        var st = grp.property('ADBE Vectors Group').addProperty('ADBE Vector Graphic - Stroke');
        st.property('ADBE Vector Stroke Color').setValue(strokeColor);
        st.property('ADBE Vector Stroke Width').setValue(strokeW || 10);
      }
      return grp;
    }
    function addEllipse(layer, size, color, pos) {
      var grp = layer.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group');
      var el = grp.property('ADBE Vectors Group').addProperty('ADBE Vector Shape - Ellipse');
      el.property('ADBE Vector Ellipse Size').setValue(size);
      var f = grp.property('ADBE Vectors Group').addProperty('ADBE Vector Graphic - Fill');
      f.property('ADBE Vector Fill Color').setValue(color);
      var root = layer.property('ADBE Root Vectors Group');
      grp = root.property(root.numProperties); // re-fetch after adding children
      grp.property('ADBE Vector Transform Group').property('ADBE Vector Position').setValue(pos);
      return grp;
    }

    // ---------------------------------------------------------------- door precomps (leaf, frame, light)
    var PW = DW + 80, PH = DH + 80; // precomp size, a margin for the glow
    function makeLeaf(def) {
      var pc = proj.items.addComp('Door leaf - ' + def.label, PW, PH, 1, DUR, FPS);
      pc.parentFolder = fPre;
      var l = pc.layers.addShape();
      l.name = 'leaf';
      addArch(l, DW - 16, DH - 16, def.color, null, 0, 'panel');
      addArch(l, DW - 120, DH - 160, null, [def.glow[0] * 0.7, def.glow[1] * 0.7, def.glow[2] * 0.7], 4, 'inset');
      addEllipse(l, [34, 34], AMBER, [DW / 2 - 70, 80]);
      tr(l, 'ADBE Position').setValue([PW / 2, PH / 2]);
      // brighter panel colour + a thin bright inner line give the door depth
      var lab = text(def.label, { t0: 0, t1: DUR, size: 44, font: FONT_B, color: AMBER, tracking: 160, pos: [PW / 2, PH / 2 - 120] }, pc);
      var plate = pc.layers.addShape();
      plate.name = 'plate';
      var pg = plate.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group');
      var rect = pg.property('ADBE Vectors Group').addProperty('ADBE Vector Shape - Rect');
      rect.property('ADBE Vector Rect Size').setValue([DW - 150, 80]);
      rect.property('ADBE Vector Rect Roundness').setValue(10);
      var pf = pg.property('ADBE Vectors Group').addProperty('ADBE Vector Graphic - Fill');
      pf.property('ADBE Vector Fill Color').setValue([0.06, 0.05, 0.04]);
      tr(plate, 'ADBE Position').setValue([PW / 2, PH / 2 - 135]);
      plate.moveAfter(lab);
      return pc;
    }
    function makeFrame(def) {
      var pc = proj.items.addComp('Door frame - ' + def.label, PW, PH, 1, DUR, FPS);
      pc.parentFolder = fPre;
      var l = pc.layers.addShape();
      addArch(l, DW + 10, DH + 10, null, AMBER, 12, 'frame');
      tr(l, 'ADBE Position').setValue([PW / 2, PH / 2]);
      var gl = fx(l, 'ADBE Glo2');
      gl.property('ADBE Glo2-0003').setValue(28);
      gl.property('ADBE Glo2-0004').setValue(0.7);
      return pc;
    }
    function makeLight(def) {
      var pc = proj.items.addComp('Door light - ' + def.label, PW, PH, 1, DUR, FPS);
      pc.parentFolder = fPre;
      var l = pc.layers.addShape();
      addArch(l, DW - 8, DH - 8, def.glow, null, 0, 'light');
      tr(l, 'ADBE Position').setValue([PW / 2, PH / 2]);
      var gl = fx(l, 'ADBE Glo2');
      gl.property('ADBE Glo2-0003').setValue(90);
      gl.property('ADBE Glo2-0004').setValue(1.1);
      return pc;
    }

    // a door in the 3D scene: light (behind), leaf (hinged on its left edge), frame (front)
    function placeDoor(def, x, t0, t1, name) {
      var light = comp.layers.add(makeLight(def));
      light.threeDLayer = true;
      light.name = name + ' light';
      span(light, t0, t1);
      tr(light, 'ADBE Position').setValue([x, 540, 6]);
      var leaf = comp.layers.add(makeLeaf(def));
      leaf.threeDLayer = true;
      leaf.name = name + ' leaf';
      span(leaf, t0, t1);
      tr(leaf, 'ADBE Anchor Point').setValue([40 + 8, PH / 2, 0]); // hinge on the left edge
      tr(leaf, 'ADBE Position').setValue([x - DW / 2 + 8, 540, 0]);
      var frame = comp.layers.add(makeFrame(def));
      frame.threeDLayer = true;
      frame.name = name + ' frame';
      span(frame, t0, t1);
      tr(frame, 'ADBE Position').setValue([x, 540, -4]);
      return { light: light, leaf: leaf, frame: frame, x: x };
    }
    function openDoor(door, t, d) {
      keys(tr(door.leaf, 'ADBE Rotate Y'), [[t, 0], [t + (d || 0.8), -108]], 70);
      keys(tr(door.light, 'ADBE Opacity'), [[t, 35], [t + (d || 0.8), 100]], 60);
    }
    function closeDoor(door, t, d) {
      keys(tr(door.leaf, 'ADBE Rotate Y'), [[t, -108], [t + (d || 0.6), 0]], 70);
    }

    // ---------------------------------------------------------------- environment (bottom layers)
    var bg = solid(INK, 'BG', 0, DUR);
    var bgr = fx(bg, 'ADBE Ramp');
    bgr.property('ADBE Ramp-0001').setValue([W / 2, H * 0.45]);
    bgr.property('ADBE Ramp-0002').setValue([0.09, 0.065, 0.04]);
    bgr.property('ADBE Ramp-0003').setValue([W / 2, H * 1.1]);
    bgr.property('ADBE Ramp-0004').setValue(INK);
    bgr.property('ADBE Ramp-0005').setValue(2);
    var fog = solid([0, 0, 0], 'FOG', 0, DUR);
    var fn = fx(fog, 'ADBE Fractal Noise');
    try {
      fn.property('Evolution').expression = 'time*25';
      fn.property('Contrast').setValue(140);
      fn.property('Brightness').setValue(-40);
    } catch (e) { log('fog params: ' + e.toString()); }
    fog.blendingMode = BlendingMode.SCREEN;
    tr(fog, 'ADBE Opacity').setValue(6);

    var floor = solid([0.05, 0.04, 0.035], 'FLOOR', 0, DUR, 7000, 5000);
    floor.threeDLayer = true;
    tr(floor, 'ADBE Position').setValue([960, 540 + DH / 2, 1200]);
    tr(floor, 'ADBE Rotate X').setValue(90);
    var fr = fx(floor, 'ADBE Ramp');
    fr.property('ADBE Ramp-0001').setValue([3500, 1200]);
    fr.property('ADBE Ramp-0002').setValue([0.14, 0.10, 0.06]);
    fr.property('ADBE Ramp-0003').setValue([3500, 4800]);
    fr.property('ADBE Ramp-0004').setValue([0.01, 0.01, 0.012]);

    // ---------------------------------------------------------------- the camera
    var cam = comp.layers.addCamera('CAMERA', [W / 2, H / 2]);
    var camPos = cam.property('ADBE Transform Group').property('ADBE Position');
    var camPoi = cam.property('ADBE Transform Group').property('ADBE Anchor Point');
    var CAM = []; // [t, position, pointOfInterest]
    function shot(t, x, y, z, px, py) { CAM.push([t, [x, y, z], [px === undefined ? x : px, py === undefined ? 540 : py, 0]]); }

    // ================================================================ TIMELINE
    var T = {
      intro: 0, heroOpen: 4.6, hello: 6.4, corridor: 12.4,
      doorStart: 16.0, doorLen: 4.2, // four doors, 16.0 - 32.8
      time: 32.8, trophy: 39.6, end: 44.2
    };

    // ---------------- 0 - 6.4  cold open: the first door draws itself in light, then opens
    marker(0, '01 Cold open');
    var hero = placeDoor({ label: 'ZJ', color: [0.12, 0.10, 0.08], glow: AMBER_HOT }, 960, 0, T.hello + 0.1, 'HERO door');
    // the frame draws on
    var heroTrim = hero.frame.source.layer(1).property('ADBE Root Vectors Group').addProperty('ADBE Vector Filter - Trim');
    keys(heroTrim.property('ADBE Vector Trim End'), [[0.4, 0], [2.4, 100]], 60);
    keys(tr(hero.leaf, 'ADBE Opacity'), [[1.8, 0], [2.8, 100]], 60);
    tr(hero.light, 'ADBE Opacity').setValue(0);
    shot(0, 960, 540, -3000);
    shot(T.heroOpen, 960, 545, -2350);
    openDoor(hero, T.heroOpen, 0.9);
    shot(T.hello - 0.15, 960, 545, -260);
    reveal(text('EVERY GAME STARTS BEHIND A DOOR', { t0: 1.2, t1: T.heroOpen + 0.4, size: 40, font: FONT_SB, color: MUTED, tracking: 220, pos: [960, 1000] }), 1.2, 1.4, 160);
    flash(T.hello, AMBER_HOT, 70, 0.5);

    // ---------------- 6.4 - 12.4  hello: the studio, the avatar, the name and the role swap
    marker(T.hello, '02 Hello');
    var intro = footage(CLIP['01-intro'], T.hello, T.corridor, 3.8, 100, 'WEB intro');
    if (intro) {
      // slide the studio right so the waving avatar sits beside the name instead of under it
      tr(intro, 'ADBE Position').setValue([960 + 520, 560]);
      keys(tr(intro, 'ADBE Scale'), [[T.hello, [118, 118]], [T.corridor, [108, 108]]], 30);
    }
    var dimL = solid(INK, 'SHADE left', T.hello, T.corridor, 1100, H);
    tr(dimL, 'ADBE Position').setValue([550, 540]);
    var dw = fx(dimL, 'ADBE Linear Wipe');
    dw.property('ADBE Linear Wipe-0001').setValue(40);
    dw.property('ADBE Linear Wipe-0002').setValue(270);
    dw.property('ADBE Linear Wipe-0003').setValue(380);
    reveal(text("HI, I'M", { t0: T.hello + 0.5, t1: T.corridor, size: 40, font: FONT_SB, color: AMBER, tracking: 300, just: ParagraphJustification.LEFT_JUSTIFY, pos: [140, 430] }), T.hello + 0.5, 0.5, 200);
    reveal(text('ZUBIA JUNAID', { t0: T.hello + 0.8, t1: T.corridor, size: 120, font: FONT_B, tracking: 20, just: ParagraphJustification.LEFT_JUSTIFY, pos: [134, 560] }), T.hello + 0.8, 0.9, 30);
    reveal(text('I AM A', { t0: T.hello + 1.6, t1: T.corridor, size: 34, font: FONT_L, color: WHITE, tracking: 200, just: ParagraphJustification.LEFT_JUSTIFY, pos: [140, 650] }), T.hello + 1.6, 0.4, 120);
    // the role pill swaps words like a slot machine
    var ROLES = ['GAME DEVELOPER', 'UNITY DEVELOPER', 'VR / XR DEVELOPER', 'GAMEPLAY PROGRAMMER'];
    var pill = comp.layers.addShape();
    pill.name = 'SHAPE role pill';
    span(pill, T.hello + 1.9, T.corridor);
    var pg = pill.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group');
    var prect = pg.property('ADBE Vectors Group').addProperty('ADBE Vector Shape - Rect');
    var pfill = pg.property('ADBE Vectors Group').addProperty('ADBE Vector Graphic - Fill');
    pfill.property('ADBE Vector Fill Color').setValue(AMBER);
    prect = pg.property('ADBE Vectors Group').property(1); // re-fetch: adding the fill invalidates the old reference
    prect.property('ADBE Vector Rect Roundness').setValue(40);
    tr(pill, 'ADBE Anchor Point').setValue([0, 0]);
    var slot = (T.corridor - 0.4 - (T.hello + 1.9)) / ROLES.length;
    var pillSizes = [];
    for (var r = 0; r < ROLES.length; r++) {
      var rt0 = T.hello + 1.9 + r * slot;
      var wpx = ROLES[r].length * 30 + 70;
      pillSizes.push([rt0, [wpx, 84]]);
      var rl = text(ROLES[r], { t0: rt0, t1: rt0 + slot, size: 46, font: FONT_B, color: [0.08, 0.06, 0.03], tracking: 40, just: ParagraphJustification.LEFT_JUSTIFY, pos: [170, 742] });
      var rp = tr(rl, 'ADBE Position');
      keys(rp, [[rt0, [170, 790]], [rt0 + 0.25, [170, 742]], [rt0 + slot - 0.2, [170, 742]], [rt0 + slot, [170, 700]]], 85);
      keys(tr(rl, 'ADBE Opacity'), [[rt0, 0], [rt0 + 0.2, 100], [rt0 + slot - 0.15, 100], [rt0 + slot, 0]], 60);
      if (r === ROLES.length - 1) { rl.outPoint = T.corridor; tr(rl, 'ADBE Opacity').removeKey(4); tr(rl, 'ADBE Position').removeKey(4); }
    }
    for (var ps = 0; ps < pillSizes.length; ps++) { prect.property('ADBE Vector Rect Size').setValueAtTime(pillSizes[ps][0], pillSizes[ps][1]); }
    setEase(prect.property('ADBE Vector Rect Size'), 85);
    tr(pill, 'ADBE Position').setValue([140 + 0, 727]);
    // the rect is centred on its position: shift so it grows to the right from x=140
    var pillExpr = 'var s = content(1).content(1).size; [140 + s[0]/2, 727]';
    try { tr(pill, 'ADBE Position').expression = pillExpr; } catch (e) {}
    keys(tr(pill, 'ADBE Scale'), [[T.hello + 1.9, [0, 100]], [T.hello + 2.2, [100, 100]]], 85);
    flash(T.corridor, WHITE, 60);

    // ---------------- 12.4 - 32.8  the corridor and its four doors
    marker(T.corridor, '03 Corridor');
    var DX = [-90, 610, 1310, 2010];
    var doors = [];
    for (var d = 0; d < DOORS.length; d++) {
      doors.push(placeDoor(DOORS[d], DX[d], T.corridor, T.time, 'DOOR ' + DOORS[d].label));
      tr(doors[d].light, 'ADBE Opacity').setValue(30);
    }
    // a glowing pool of light on the floor in front of each door
    for (d = 0; d < DOORS.length; d++) {
      var pool = comp.layers.addShape();
      pool.name = 'POOL ' + DOORS[d].label;
      span(pool, T.corridor, T.time);
      pool.threeDLayer = true;
      addEllipse(pool, [520, 260], DOORS[d].glow, [0, 0]);
      tr(pool, 'ADBE Position').setValue([DX[d], 540 + DH / 2 - 2, -150]);
      tr(pool, 'ADBE Rotate X').setValue(90);
      fx(pool, 'ADBE Gaussian Blur 2').property(1).setValue(80);
      keys(tr(pool, 'ADBE Opacity'), [[T.corridor + 0.8 + d * 0.35, 0], [T.corridor + 1.3 + d * 0.35, 55]], 60);
    }
    shot(T.corridor, 960, 520, -900);
    shot(T.corridor + 2.6, 960, 520, -4300);
    shot(T.doorStart - 0.2, 960, 520, -4300);
    reveal(text('MAGIC HAPPENS BEHIND THE DOORS', { t0: T.corridor + 0.8, t1: T.doorStart, size: 56, font: FONT_B, tracking: 120, pos: [960, 170] }), T.corridor + 0.8, 1.1, 50);

    // what is behind each door (game trailers, 960x540 sources scaled up to fill the frame)
    var BEHIND = [
      [['unbroken-oath', 'THE UNBROKEN OATH', 'Tactical rescue shooter \u00B7 Unity 2022', 14], ['abduction', 'THE ABDUCTION', 'Survival horror stealth \u00B7 Unity 6', 6]],
      [['spikes-rush', 'SPIKES RUSH', 'Endless runner \u00B7 Unreal Engine', 6], ['germ-runner', 'GERM ENDLESS RUNNER', 'Blueprints \u00B7 Unreal Engine 5.7', 5]],
      [['vr-uavsim', 'VR-UAVSIM', 'Final year project \u00B7 VR drone flight training', 7], ['vr-escape-room', 'VR ESCAPE ROOM', 'Meta Quest \u00B7 XR Interaction Toolkit', 6]],
      [['WEB:10-themes', 'THIS 3D PORTFOLIO', 'Three.js \u00B7 React \u00B7 Blender avatar', 4.5], ['cyber-cafe', 'CYBER CAFE PRO', 'C++ \u00B7 SFML desktop app', 4]]
    ];
    for (d = 0; d < DOORS.length; d++) {
      var t0 = T.doorStart + d * T.doorLen;
      var x = DX[d];
      var ta = t0 + 0.7;   // arrived in front of the door
      var to = ta + 0.15;  // door starts opening
      var tf = to + 0.95;  // fly through (flash)
      var tEnd = t0 + T.doorLen;
      shot(t0, d === 0 ? 960 : DX[d - 1], 520, -2400, d === 0 ? 960 : DX[d - 1], 540);
      shot(ta, x, 545, -2300);
      openDoor(doors[d], to, 0.8);
      shot(to + 0.25, x, 545, -2100);
      shot(tf, x, 545, -150);
      flash(tf, DOORS[d].glow, 65, 0.45);
      // label over the door while we approach
      var lab = text(DOORS[d].label, { t0: t0 + 0.1, t1: tf, size: 30, font: FONT_SB, color: AMBER, tracking: 500, pos: [960, 1000] });
      reveal(lab, t0 + 0.1, 0.5, 300);
      // two quick shots behind the door
      var half = (tEnd - tf) / 2;
      for (var s = 0; s < 2; s++) {
        var b = BEHIND[d][s];
        var s0 = tf + s * half, s1 = s0 + half;
        var item = /^WEB:/.test(b[0]) ? CLIP[b[0].substr(4)] : GAME[b[0]];
        if (!item) { continue; }
        var sc = (W / item.width) * 100 * (/^WEB:/.test(b[0]) ? 1 : 1.3);
        var fl = footage(item, s0, s1, b[3], sc, (/^WEB:/.test(b[0]) ? 'WEB ' : 'GAME ') + b[1]);
        keys(tr(fl, 'ADBE Scale'), [[s0, [sc * 1.08, sc * 1.08]], [s1, [sc, sc]]], 30);
        var sh = solid(INK, 'SHADE', s0, s1, W, 420);
        tr(sh, 'ADBE Position').setValue([W / 2, H - 210]);
        var shw = fx(sh, 'ADBE Linear Wipe');
        shw.property('ADBE Linear Wipe-0001').setValue(25);
        shw.property('ADBE Linear Wipe-0003').setValue(300);
        text(DOORS[d].label, { t0: s0 + 0.05, t1: s1, size: 24, font: FONT_SB, color: DOORS[d].glow, tracking: 400, just: ParagraphJustification.LEFT_JUSTIFY, pos: [140, 815] });
        reveal(text(b[1], { t0: s0 + 0.1, t1: s1, size: 74, font: FONT_B, just: ParagraphJustification.LEFT_JUSTIFY, pos: [136, 895] }), s0 + 0.1, 0.4, 25);
        reveal(text(b[2], { t0: s0 + 0.3, t1: s1, size: 30, font: FONT_L, color: MUTED, just: ParagraphJustification.LEFT_JUSTIFY, pos: [140, 940] }), s0 + 0.3, 0.35, 0);
        if (s === 1) { flash(s1, WHITE, 55, 0.3); }
        else { flash(s1, WHITE, 35, 0.2); }
      }
      // back in the corridor the door swings shut behind us
      closeDoor(doors[d], tEnd - 0.1, 0.5);
    }
    shot(T.time - 0.01, DX[3], 520, -2400);

    // ---------------- 32.8 - 39.6  "let's go back in time"
    marker(T.time, '04 Back in time');
    var car = footage(CLIP['05-career'], T.time, T.trophy, 4.2, 100, 'WEB career path');
    if (car) {
      keys(tr(car, 'ADBE Scale'), [[T.time, [100, 100]], [T.trophy, [112, 112]]], 30);
      var tdim = solid(INK, 'DIM career', T.time, T.trophy);
      tr(tdim, 'ADBE Opacity').setValue(70);
    }
    reveal(text("LET'S GO BACK IN TIME", { t0: T.time + 0.2, t1: T.trophy, size: 40, font: FONT_SB, color: MUTED, tracking: 400, pos: [960, 200] }), T.time + 0.2, 0.9, 60);
    var STEPS = [
      ['2023', 'NED UNIVERSITY', 'BS Computer Science & IT \u00B7 Gaming & Animation'],
      ['2025', 'TECHCAMI', 'Unity Developer / Web Developer Intern'],
      ['2026', 'TREEOBIT', 'Game Developer Intern \u00B7 Mar \u2013 May'],
      ['2026', 'GAME STORM STUDIOS', 'Game Developer Intern \u00B7 Jun \u2013 Aug']
    ];
    var stepLen = (T.trophy - (T.time + 0.9)) / STEPS.length;
    for (var st = 0; st < STEPS.length; st++) {
      var y0 = T.time + 0.9 + st * stepLen, y1 = y0 + stepLen;
      var yr = text(STEPS[st][0], { t0: y0, t1: y1, size: 330, font: FONT_B, color: AMBER, outline: true, stroke: 3, tracking: 40, pos: [960, 600] });
      var yp = tr(yr, 'ADBE Position');
      keys(yp, [[y0, [960, 820]], [y0 + 0.45, [960, 600]], [y1 - 0.3, [960, 590]], [y1, [960, 380]]], 85);
      keys(tr(yr, 'ADBE Opacity'), [[y0, 0], [y0 + 0.3, 100], [y1 - 0.2, 100], [y1, 0]], 60);
      var yfill = text(STEPS[st][0], { t0: y0 + 0.35, t1: y1, size: 330, font: FONT_B, color: AMBER, tracking: 40, pos: [960, 600] });
      keys(tr(yfill, 'ADBE Opacity'), [[y0 + 0.35, 0], [y0 + 0.7, 22], [y1 - 0.2, 22], [y1, 0]], 60);
      rise(text(STEPS[st][1], { t0: y0 + 0.3, t1: y1, size: 58, font: FONT_B, tracking: 80, pos: [960, 760] }), y0 + 0.3, 0.45, 40);
      rise(text(STEPS[st][2], { t0: y0 + 0.45, t1: y1, size: 30, font: FONT_L, color: MUTED, tracking: 40, pos: [960, 815] }), y0 + 0.45, 0.45, 30);
    }
    flash(T.trophy, AMBER_HOT, 70);

    // ---------------- 39.6 - 44.2  the golden door and the trophy wall
    marker(T.trophy, '05 Trophy door');
    var gold = placeDoor(GOLD_DOOR, 960, T.trophy, T.trophy + 1.9, 'GOLD door');
    tr(gold.light, 'ADBE Opacity').setValue(40);
    shot(T.trophy, 960, 530, -3200);
    shot(T.trophy + 0.7, 960, 540, -2400);
    openDoor(gold, T.trophy + 0.6, 0.7);
    shot(T.trophy + 1.85, 960, 545, -180);
    flash(T.trophy + 1.85, AMBER_HOT, 60, 0.45);
    var tro = footage(CLIP['07-trophies'], T.trophy + 1.85, T.end, 2.0, 100, 'WEB trophy wall');
    if (tro) { keys(tr(tro, 'ADBE Scale'), [[T.trophy + 1.85, [110, 110]], [T.end, [100, 100]]], 30); }
    var topShade = solid(INK, 'SHADE top', T.trophy + 1.85, T.end, W, 380);
    tr(topShade, 'ADBE Position').setValue([W / 2, 190]);
    var tsw = fx(topShade, 'ADBE Linear Wipe');
    tsw.property('ADBE Linear Wipe-0001').setValue(25);
    tsw.property('ADBE Linear Wipe-0002').setValue(180);
    tsw.property('ADBE Linear Wipe-0003').setValue(240);
    var STATS = [['2ND', 'GAMECON \u00B7 NED UNIVERSITY'], ['3', 'GAME-STUDIO INTERNSHIPS'], ['16', 'PROJECTS BUILT']];
    var sLen = (T.end - (T.trophy + 2.0)) / STATS.length;
    for (var k = 0; k < STATS.length; k++) {
      var a0 = T.trophy + 2.0 + k * sLen, a1 = a0 + sLen;
      rise(text(STATS[k][0], { t0: a0, t1: a1, size: 130, font: FONT_B, color: AMBER, pos: [960, 250] }), a0, 0.35, 50);
      rise(text(STATS[k][1], { t0: a0 + 0.1, t1: a1, size: 34, font: FONT_SB, tracking: 220, pos: [960, 305] }), a0 + 0.1, 0.35, 30);
    }
    flash(T.end, WHITE, 50);

    // ---------------- 44.2 - 48  end card: one last door frame around the name
    marker(T.end, '06 End card');
    var endFrame = comp.layers.add(makeFrame({ label: 'END', color: INK, glow: AMBER }));
    endFrame.name = 'END door frame';
    span(endFrame, T.end, DUR);
    tr(endFrame, 'ADBE Scale').setValue([26, 26]);
    tr(endFrame, 'ADBE Position').setValue([960, 330]);
    var et = endFrame.source.layer(1).property('ADBE Root Vectors Group').addProperty('ADBE Vector Filter - Trim');
    keys(et.property('ADBE Vector Trim End'), [[T.end, 0], [T.end + 1.2, 100]], 60);
    reveal(text('ZUBIA JUNAID', { t0: T.end + 0.3, t1: DUR, size: 92, font: FONT_B, tracking: 60, pos: [960, 500] }), T.end + 0.3, 0.8, 40);
    reveal(text('GAME DEVELOPER  \u00B7  UNITY  \u00B7  UNREAL  \u00B7  VR/XR', { t0: T.end + 0.7, t1: DUR, size: 28, font: FONT_SB, color: AMBER, tracking: 200, pos: [960, 560] }), T.end + 0.7, 0.6, 150);
    reveal(text("LET'S BUILD GAMES TOGETHER", { t0: T.end + 1.2, t1: DUR, size: 34, font: FONT_L, tracking: 260, pos: [960, 860] }), T.end + 1.2, 0.7, 40);
    reveal(text('zubiajunaid954@gmail.com   \u00B7   linkedin.com/in/zubia-junaid-9b53b4354   \u00B7   github.com/zubiajunaid954-bot', { t0: T.end + 1.6, t1: DUR, size: 24, font: FONT_L, color: MUTED, pos: [960, 920] }), T.end + 1.6, 0.6, 0);
    var fade = solid([0, 0, 0], 'FADE OUT', DUR - 0.8, DUR);
    keys(tr(fade, 'ADBE Opacity'), [[DUR - 0.8, 0], [DUR, 100]], 50);

    // ---------------------------------------------------------------- camera keys + finishing
    for (var ci = 0; ci < CAM.length; ci++) {
      camPos.setValueAtTime(CAM[ci][0], CAM[ci][1]);
      camPoi.setValueAtTime(CAM[ci][0], CAM[ci][2]);
    }
    setEase(camPos, 75);
    setEase(camPoi, 75);
    try { cam.property('ADBE Camera Options Group').property('ADBE Camera Depth of Field').setValue(1);
      cam.property('ADBE Camera Options Group').property('ADBE Camera Aperture').setValue(40);
      cam.property('ADBE Camera Options Group').property('ADBE Camera Blur Level').setValue(60);
      cam.property('ADBE Camera Options Group').property('ADBE Camera Focus Distance').expression = 'length(transform.position, transform.pointOfInterest)';
    } catch (e) { log('dof: ' + e.toString()); }

    var lbT = solid([0, 0, 0], 'LETTERBOX top', 0, DUR, W, 110);
    tr(lbT, 'ADBE Position').setValue([W / 2, 55]);
    var lbB = solid([0, 0, 0], 'LETTERBOX bottom', 0, DUR, W, 110);
    tr(lbB, 'ADBE Position').setValue([W / 2, H - 55]);
    var adj = solid([1, 1, 1], 'FINISH vignette + grain', 0, DUR);
    adj.adjustmentLayer = true;
    var vg = fx(adj, 'CC Vignette');
    try { vg.property(1).setValue(80); } catch (e) {}
    var nz = fx(adj, 'ADBE Noise');
    nz.property(1).setValue(2.5);
    nz.property(2).setValue(0);
    adj.moveToBeginning();

    if (music) {
      var ml = comp.layers.add(music);
      ml.name = 'MUSIC';
      span(ml, 0, DUR);
      var lvl = ml.property('ADBE Audio Group').property('ADBE Audio Levels');
      keys(lvl, [[DUR - 1.5, [0, 0]], [DUR, [-40, -40]]], 50);
    }

    // ---------------------------------------------------------------- save + render (everything on D:)
    var aep = new File(ROOT + 'after-effects/Zubia_Junaid_Promo.aep');
    proj.save(aep);
    log('saved ' + aep.fsName);
    var rq = proj.renderQueue.items.add(comp);
    var om = rq.outputModule(1);
    var tmpl = null;
    var tl = om.templates;
    for (var ti = 0; ti < tl.length; ti++) { if (/H\.264/i.test(tl[ti]) && /15 ?Mbps/i.test(tl[ti])) { tmpl = tl[ti]; } }
    if (!tmpl) { for (ti = 0; ti < tl.length; ti++) { if (/H\.264/i.test(tl[ti])) { tmpl = tl[ti]; } } }
    if (tmpl) { om.applyTemplate(tmpl); }
    new Folder(ROOT + 'media-src/render').create();
    om.file = new File(ROOT + 'media-src/render/Zubia_Junaid_Promo_master.mp4');
    proj.save(aep);
    log('queued ' + om.file.fsName + ' (render with aerender.exe)');
    app.endSuppressDialogs(false);
    log('DONE');
  } catch (err) {
    log('ERROR line ' + err.line + ': ' + err.toString());
  } finally {
    LOG.close();
  }
})();
