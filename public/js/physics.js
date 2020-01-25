class Body {
  constructor() {
    this.fixed = false;

    this.position = [0, 0];
    this.velocity = [0, 0];
    this.acceleration = [0, 0];
  }

  update(dt) {
    this.velocity = add(this.velocity, scale(this.acceleration, dt));
    this.position = add(this.position, scale(this.velocity, dt));
  }

  collidesWith(body) {
    return false;
  }
}

class RectangleBody extends Body {
  constructor(width, height) {
    super();
    this.width = width;
    this.height = height;
  }

  collidesWith(body, collisionSides) {
    if (body instanceof RectangleBody) {
      let x1 = this.position[0];
      let y1 = this.position[1];
      let w1 = this.width;
      let h1 = this.height;

      let x2 = body.position[0];
      let y2 = body.position[1];
      let w2 = body.width;
      let h2 = body.height;

      return !(x1 + w1 / 2 <= x2 - w2 / 2 ||
               x1 - w1 / 2 >= x2 + w2 / 2 ||
               y1 + h1 / 2 <= y2 - h2 / 2 ||
               y1 - h1 / 2 >= y2 + h2 / 2);
    } else {
      return false;
    }
  }
}

function resolveCollision(b1, b2) {
  if (b1 === b2) {
    return;
  }

  // We only handle rectangles for now.
  if (!(b1 instanceof RectangleBody) ||
      !(b2 instanceof RectangleBody)) {
    return;
  }

  let left1 = b1.position[0] - b1.width / 2;
  let right1 = b1.position[0] + b1.width / 2;
  let top1 = b1.position[1] - b1.height / 2;
  let bottom1 = b1.position[1] + b1.height / 2;

  let left2 = b2.position[0] - b2.width / 2;
  let right2 = b2.position[0] + b2.width / 2;
  let top2 = b2.position[1] - b2.height / 2;
  let bottom2 = b2.position[1] + b2.height / 2;

  if (magnitude(b2.velocity)) {
    let tmp = b1;
    b1 = b2;
    b2 = tmp;
  }

  let overlapX = Math.min(right1 - left2, right2 - left1);
  let overlapY = Math.min(bottom1 - top2, bottom2 - top1);

  var bounce = 0.0;

  if (overlapX <= overlapY) {
    if (b1.position[0] < b2.position[0]) {
      b1.position[0] -= overlapX;
      if (b1.velocity[0] > 0) {
        b1.velocity[0] *= -bounce;
      }
    } else {
      b1.position[0] += overlapX;
      if (b1.velocity[0] < 0) {
        b1.velocity[0] *= -bounce;
      }
    }
  } else {
    if (b1.position[1] < b2.position[1]) {
      b1.position[1] -= overlapY;
      if (b1.velocity[1] > 0) {
        b1.velocity[1] *= -bounce;
      }
    } else {
      b1.position[1] += overlapY;
      if (b1.velocity[1] < 0) {
        b1.velocity[1] *= -bounce;
      }
    }
  }
}
