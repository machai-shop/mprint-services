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

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
