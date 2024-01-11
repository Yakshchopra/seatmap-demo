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
