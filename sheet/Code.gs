var HEADERS = ["Date", "Time", "Receipt", "Customer", "Category", "Service", "Qty", "Unit Price", "Amount", "Note"];

function doPost(e) {
  var raw = "";
  if (e.postData && e.postData.contents) raw = e.postData.contents;
  else if (e.parameter && e.parameter.payload) raw = e.parameter.payload;
  var body = JSON.parse(raw);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Transaction Record");
  if (!sheet) throw new Error("Transaction Record sheet is missing");
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  var rows = body.rows || [];
  if (rows.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, HEADERS.length).setValues(rows);
  }
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, added: rows.length }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Dashboard: ?action=sales&key=mprint&callback=name
// After editing: Deploy → Manage deployments → pencil → Version: New version → Deploy.
function doGet(e) {
  var params = (e && e.parameter) || {};
  var callback = String(params.callback || "");
  var body = { ok: true };
  if (params.action === "sales") {
    if (params.key !== "mprint") body = { ok: false };
    else {
      try { body = { ok: true, rows: readSales() }; }
      catch (err) { body = { ok: false }; }
    }
  }
  var json = JSON.stringify(body).replace(/</g, "\\u003c");
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(callback)) {
    return ContentService
      .createTextOutput(callback + "(" + json + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function readSales() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Transaction Record");
  if (!sheet || sheet.getLastRow() < 2) return [];
  var zone = ss.getSpreadsheetTimeZone() || "Asia/Manila";
  var values = sheet.getDataRange().getValues();
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    var date = formatDate(r[0], zone);
    var receipt = r[2] == null ? "" : String(r[2]);
    if (!date && !receipt) continue;
    rows.push({
      date: date,
      time: formatTime(r[1], zone),
      receipt: receipt,
      customer: r[3] == null ? "" : String(r[3]),
      category: r[4] == null ? "" : String(r[4]),
      service: r[5] == null ? "" : String(r[5]),
      qty: asNumber(r[6]),
      unit: asNumber(r[7]),
      amount: asNumber(r[8]),
      note: r[9] == null ? "" : String(r[9])
    });
  }
  return rows;
}

function isDate(v) {
  return Object.prototype.toString.call(v) === "[object Date]" && !isNaN(v.getTime());
}

function two(n) {
  return (n < 10 ? "0" : "") + n;
}

function formatDate(v, zone) {
  if (isDate(v)) return Utilities.formatDate(v, zone, "yyyy-MM-dd");
  return String(v == null ? "" : v).replace(/^\s+|\s+$/g, "");
}

function formatTime(v, zone) {
  if (isDate(v)) return Utilities.formatDate(v, zone, "HH:mm");
  var s = String(v == null ? "" : v).replace(/^\s+|\s+$/g, "");
  var m = /^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?/.exec(s);
  if (!m) return s;
  var h = Number(m[1]);
  if (m[3]) {
    h = h % 12;
    if (/[Pp]/.test(m[3])) h += 12;
  }
  return two(h) + ":" + m[2];
}

function asNumber(v) {
  if (typeof v === "number") return isFinite(v) ? v : 0;
  var n = parseFloat(String(v == null ? "" : v).replace(/[^0-9.\-]/g, ""));
  return isFinite(n) ? n : 0;
}
