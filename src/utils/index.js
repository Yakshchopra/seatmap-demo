export function createSeatMap(seats) {
  const seatMap = {};
  seats.forEach((seat) => {
    const section = seat.Iid.split('-')[0];
    const row = seat.Row;

    if (!seatMap[section]) {
      seatMap[section] = {};
    }
    if (!seatMap[section][row]) {
      seatMap[section][row] = [];
    }

    seatMap[section][row].push(seat);
  });

  return seatMap;
}

export function findAngleBetweenLines(
  point1Line1,
  point2Line1,
  point1Line2,
  point2Line2
) {
  let directionVector1 = [
    point2Line1[0] - point1Line1[0],
    point2Line1[1] - point1Line1[1],
  ];
  let directionVector2 = [
    point2Line2[0] - point1Line2[0],
    point2Line2[1] - point1Line2[1],
  ];

  let [x1, y1] = directionVector1;
  let [x2, y2] = directionVector2;

  let dotProduct = x1 * x2 + y1 * y2;

  let magnitude1 = Math.sqrt(x1 * x1 + y1 * y1);
  let magnitude2 = Math.sqrt(x2 * x2 + y2 * y2);

  let angleInRadians = Math.acos(dotProduct / (magnitude1 * magnitude2));

  let angleInDegrees = (angleInRadians * 180) / Math.PI;

  return angleInDegrees;
}

export function findCoordinates(seatingPlan) {
  if (!seatingPlan.Seats || seatingPlan.Seats.length === 0) {
    return null;
  }

  let leftmost = seatingPlan.Seats[0];
  let rightmost = seatingPlan.Seats[0];
  let frontmost = seatingPlan.Seats[0];
  let lastmost = seatingPlan.Seats[0];

  seatingPlan.Seats.forEach((seat) => {
    if (seat.X < leftmost.X) leftmost = seat;
    if (seat.X > rightmost.X) rightmost = seat;
    if (seat.Y < frontmost.Y) frontmost = seat;
    if (seat.Y > lastmost.Y) lastmost = seat;
  });

  let totalX = 0,
    totalY = 0;
  seatingPlan.Seats.forEach((seat) => {
    totalX += seat.X;
    totalY += seat.Y;
  });
  let centralPoint = {
    X: totalX / seatingPlan.Seats.length,
    Y: totalY / seatingPlan.Seats.length,
  };

  return {
    leftmost,
    rightmost,
    frontmost,
    lastmost,
    centralPoint,
  };
}
