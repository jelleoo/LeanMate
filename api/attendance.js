const {
  json,
  readBody,
  setCors,
  supabaseFetch,
  getStreak,
  getWeekDates
} = require("./_supabase");

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

async function getAttendanceSummary(date) {
  const weekDates = getWeekDates(date);
  const [members, attendance] = await Promise.all([
    supabaseFetch("leanmate_members?select=id,name,created_at&order=created_at.asc"),
    supabaseFetch("leanmate_attendance?select=member_id,date&order=date.asc")
  ]);

  const attendanceByMember = attendance.reduce((map, row) => {
    if (!map.has(row.member_id)) map.set(row.member_id, []);
    map.get(row.member_id).push(row.date);
    return map;
  }, new Map());

  const summary = members
    .map((member) => {
      const dates = attendanceByMember.get(member.id) || [];
      return {
        ...member,
        attendance: dates,
        checked: dates.includes(date),
        week: dates.filter((day) => weekDates.includes(day)).length,
        streak: getStreak(dates, date)
      };
    })
    .sort((a, b) => b.week - a.week || b.streak - a.streak || a.name.localeCompare(b.name));

  return summary;
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") {
    json(res, 200, { ok: true });
    return;
  }

  try {
    if (req.method === "GET") {
      const date = String(req.query.date || todayString());
      json(res, 200, { members: await getAttendanceSummary(date) });
      return;
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      const memberId = String(body.memberId || "");
      const date = String(body.date || todayString());
      if (!memberId) {
        json(res, 400, { error: "memberId is required." });
        return;
      }

      const existing = await supabaseFetch(
        `leanmate_attendance?select=member_id,date&member_id=eq.${memberId}&date=eq.${date}`
      );

      if (existing.length > 0) {
        await supabaseFetch(`leanmate_attendance?member_id=eq.${memberId}&date=eq.${date}`, {
          method: "DELETE"
        });
      } else {
        await supabaseFetch("leanmate_attendance", {
          method: "POST",
          body: JSON.stringify({ member_id: memberId, date })
        });
      }

      json(res, 200, { members: await getAttendanceSummary(date) });
      return;
    }

    json(res, 405, { error: "Method not allowed." });
  } catch (error) {
    json(res, error.statusCode || 500, {
      error: error.message,
      details: error.details
    });
  }
};
