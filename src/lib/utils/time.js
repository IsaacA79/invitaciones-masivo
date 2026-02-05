export const normalizeTime = (s) => {
  if (!s) return "";
  if (/^\d{1,2}$/.test(s)) return s.padStart(2, "0") + ":00";
  if (/^\d{3,4}$/.test(s)) {
    const t = s.padStart(4, "0");
    return t.slice(0, 2) + ":" + t.slice(2);
  }
  return s; 
};

export const to12h = (hhmm) => {
  if (!hhmm) return "";
  const [hStr, mStr] = hhmm.split(":");
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = ((h + 11) % 12) + 1; // 0->12, 13->1, etc.
  return `${String(h).padStart(2, "0")}:${mStr} ${ampm}`;
};

export const formatTime = (timeStr) => to12h(normalizeTime(timeStr));
