function clamp(x, min, max) {
  return Math.max(min, Math.min(x, max));
}

function normalize(v1) {
  let m = magnitude(v1);
  let v = scale(v1, 1 / m);
  return v;
}

function magnitude(v) {
  let m = 0;
  for (let i = 0; i < v.length; ++i) {
    m += v[i] * v[i];
  }
  m = Math.sqrt(m);
  return m;
}

function add(v1, v2) {
  let v = [];
  for (let i = 0; i < v1.length; ++i) {
    v[i] = v1[i] + v2[i];
  }
  return v;
}

function sub(v1, v2) {
  let v = [];
  for (let i = 0; i < v1.length; ++i) {
    v[i] = v1[i] - v2[i];
  }
  return v;
}

function scale(v1, s) {
  let v = [];
  for (let i = 0; i < v1.length; ++i) {
    v[i] = v1[i] * s;
  }
  return v;
}

function equals(v1, v2) {
  for (let i = 0; i < v1.length; ++i) {
    if (v1[i] !== v2[i]) {
      return false;
    }
  }
  return true;
}

function clone(v1) {
  let v = [];
  for (let i = 0; i < v1.length; ++i) {
    v[i] = v1[i];
  }
  return v;
}
