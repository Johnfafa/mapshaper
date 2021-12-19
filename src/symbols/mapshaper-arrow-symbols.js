
import { addBezierArcControlPoints, rotateCoords } from './mapshaper-symbol-utils';

export function getStickArrowCoords(d, totalLen) {
  var minStemRatio = getMinStemRatio(d);
  var headAngle = d['arrow-head-angle'] || 90;
  var curve = d['arrow-stem-curve'] || 0;
  var unscaledHeadWidth = d['arrow-head-width'] || 9;
  var unscaledHeadLen = getHeadLength(unscaledHeadWidth, headAngle);
  var scale = getScale(totalLen, unscaledHeadLen, minStemRatio);
  var headWidth = unscaledHeadWidth * scale;
  var headLen = unscaledHeadLen * scale;
  var tip = getStickArrowTip(totalLen, curve);
  var stem = [[0, 0], tip.concat()];
  if (curve) {
    addBezierArcControlPoints(stem, curve);
  }
  if (!headLen) return [stem];
  var head = [addPoints([-headWidth / 2, -headLen], tip), tip.concat(), addPoints([headWidth / 2, -headLen], tip)];

  rotateCoords(stem, d.rotation);
  rotateCoords(head, d.rotation);
  return [stem, head];
}

function getMinStemRatio(d) {
  return d['arrow-min-stem'] >= 0 ? d['arrow-min-stem'] : 0.4;
}

export function getFilledArrowCoords(totalLen, d) {
  var minStemRatio = getMinStemRatio(d),
      headAngle = d['arrow-head-angle'] || 40,
      direction = d.rotation || d['arrow-direction'] || 0,
      unscaledStemWidth = d['arrow-stem-width'] || 2,
      unscaledHeadWidth = d['arrow-head-width'] || unscaledStemWidth * 3,
      unscaledHeadLen = getHeadLength(unscaledHeadWidth, headAngle),
      scale = getScale(totalLen, unscaledHeadLen, minStemRatio),
      headWidth = unscaledHeadWidth * scale,
      headLen = unscaledHeadLen * scale,
      stemWidth = unscaledStemWidth * scale,
      stemTaper = d['arrow-stem-taper'] || 0,
      stemCurve = d['arrow-stem-curve'] || 0,
      stemLen = totalLen - headLen;

  var headDx = headWidth / 2,
      stemDx = stemWidth / 2,
      baseDx = stemDx * (1 - stemTaper);

  var coords;

  if (!stemCurve || Math.abs(stemCurve) > 90) {
    coords = [[baseDx, 0], [stemDx, stemLen], [headDx, stemLen], [0, stemLen + headLen],
        [-headDx, stemLen], [-stemDx, stemLen], [-baseDx, 0], [baseDx, 0]];
  } else {
    if (direction > 0) stemCurve = -stemCurve;
    coords = getCurvedArrowCoords(stemLen, headLen, stemCurve, stemDx, headDx, baseDx);
  }

  rotateCoords(coords, direction);
  return [coords];
}


function getScale(totalLen, headLen, minStemRatio) {
  var maxHeadPct = 1 - minStemRatio;
  var headPct = headLen / totalLen;
  if (headPct > maxHeadPct) {
    return maxHeadPct / headPct;
  }
  return 1;
}

function getStickArrowTip(totalLen, curve) {
  // curve/2 intersects the arrowhead at 90deg (trigonometry)
  var theta = Math.abs(curve/2) / 180 * Math.PI;
  var dx = totalLen * Math.sin(theta) * (curve > 0 ? -1 : 1);
  var dy = totalLen * Math.cos(theta);
  return [dx, dy];
}

function addPoints(a, b) {
  return [a[0] + b[0], a[1] + b[1]];
}


function getHeadLength(headWidth, headAngle) {
  var headRatio = 1 / Math.tan(Math.PI * headAngle / 180 / 2) / 2; // length-to-width head ratio
  return headWidth * headRatio;
}

function getCurvedArrowCoords(stemLen, headLen, curvature, stemDx, headDx, baseDx) {
  // coordinates go counter clockwise, starting from the leftmost head coordinate
  var theta = Math.abs(curvature) / 180 * Math.PI;
  var sign = curvature > 0 ? 1 : -1;
  var dx = stemLen * Math.sin(theta / 2) * sign;
  var dy = stemLen * Math.cos(theta / 2);
  var head = [[stemDx + dx, dy], [headDx + dx, dy],
    [dx, headLen + dy], [-headDx + dx, dy], [-stemDx + dx, dy]];
  var ax = baseDx * Math.cos(theta); // rotate arrow base
  var ay = baseDx * Math.sin(theta) * -sign;
  var leftStem = getCurvedStemCoords(-ax, -ay, -stemDx + dx, dy, theta);
  var rightStem = getCurvedStemCoords(ax, ay, stemDx + dx, dy, theta);
  // if (stemTaper == 1) leftStem.pop();
  var stem = leftStem.concat(rightStem.reverse());
  stem.pop();
  return stem.concat(head);
}

// ax, ay: point on the base
// bx, by: point on the stem
function getCurvedStemCoords(ax, ay, bx, by, theta0) {
  var dx = bx - ax,
      dy = by - ay,
      dy1 = (dy * dy - dx * dx) / (2 * dy),
      dy2 = dy - dy1,
      dx2 = Math.sqrt(dx * dx + dy * dy) / 2,
      theta = Math.PI - Math.asin(dx2 / dy2) * 2,
      degrees = theta * 180 / Math.PI,
      radius = dy2 / Math.tan(theta / 2),
      leftBend = bx > ax,
      sign = leftBend ? 1 : -1,
      points = Math.round(degrees / 5) + 2,
      // points = theta > 2 && 7 || theta > 1 && 6 || 5,
      increment = theta / (points + 1);

  var coords = [[bx, by]];
  for (var i=1; i<= points; i++) {
    var phi = i * increment / 2;
    var sinPhi = Math.sin(phi);
    var cosPhi = Math.cos(phi);
    var c = sinPhi * radius * 2;
    var a = sinPhi * c;
    var b = cosPhi * c;
    coords.push([bx - a * sign, by - b]);
  }
  coords.push([ax, ay]);
  return coords;
}
