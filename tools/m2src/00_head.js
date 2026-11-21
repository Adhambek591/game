// Qirq qiz — missions (prologue 2 + 7 chapters × 4 = 30), v2: posted enemy groups, convoy, direction arrow, secrets, checkpoints. Each chapter: first mission plays the chapter intro cutscene,
// the last one is the chapter boss and ends the chapter (saveProg / epilogue). Story helpers come from story.js via initMissions(H).
import { G, $, T, THREE, breakable, num, SET, spawn, enemies, gate, marker, setBoss, wait, until, qte, world, refreshSkills, makePlayer, SAVE, addGold, ADS, flash, burst, ringFx, hintRaw, decor, clearLevel, setMood, ensureReal, scene, renderer, gradePass, A, fire, telegraph, toggleMount, camera, markHunt } from './engine.js?v=1795128543';
import { t } from './i18n.js?v=1795128543';
import { Sfx, setMusic } from './audio.js?v=1795128543';
import { applyLight, LIGHTS, place } from './env.js?v=1795128543';
import { makeHorse } from './horse.js?v=1795128543';

