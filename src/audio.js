'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const STORAGE_DIR = path.resolve(__dirname, '..', 'storage');
const RECORDINGS_DIR = path.join(STORAGE_DIR, 'recordings');
const TMP_DIR = path.join(STORAGE_DIR, 'tmp');

function ensureDirs() {
  [STORAGE_DIR, RECORDINGS_DIR, TMP_DIR].forEach((d) => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
}
ensureDirs();

const FFMPEG_BIN = process.env.FFMPEG_PATH || 'ffmpeg';

function buildMp3Filename(questionId) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  return `q${questionId}_${ts}.mp3`;
}

function convertToMp3(inputPath, outputPath, { bitrate = '96k', mono = true } = {}) {
  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-i', inputPath,
      '-vn',
      '-codec:a', 'libmp3lame',
      '-b:a', bitrate
    ];
    if (mono) args.push('-ac', '1');
    args.push(outputPath);

    const child = spawn(FFMPEG_BIN, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-500)}`));
      } else {
        resolve({ stderr });
      }
    });
  });
}

function probeDurationSeconds(filePath) {
  return new Promise((resolve) => {
    const child = spawn(
      FFMPEG_BIN,
      ['-i', filePath],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );
    let stderr = '';
    child.stderr.on('data', (c) => (stderr += c.toString()));
    child.on('close', () => {
      const m = stderr.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);
      if (!m) return resolve(null);
      const h = parseInt(m[1], 10);
      const min = parseInt(m[2], 10);
      const s = parseInt(m[3], 10);
      resolve(h * 3600 + min * 60 + s);
    });
    child.on('error', () => resolve(null));
  });
}

module.exports = {
  STORAGE_DIR,
  RECORDINGS_DIR,
  TMP_DIR,
  buildMp3Filename,
  convertToMp3,
  probeDurationSeconds
};
