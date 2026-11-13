import io
import uuid
from collections import OrderedDict
from datetime import datetime
from xml.sax.saxutils import escape

from flask import Blueprint, jsonify, request, send_file

import store
from api.history import current_user, remember
from api.recognize import read_upload
from ml import preprocess

bp = Blueprint("essays", __name__, url_prefix="/api")

_store: "OrderedDict[str, dict]" = OrderedDict()   # finished essays, newest last (kept in memory until the database is added)
_KEEP = 200


@bp.post("/essays")
def create():
    """A photo of a handwritten essay -> TrOCR reads it, the AI editor corrects and scores it."""
    try:
        from ml import corrector, line_split, trocr    # imported here so the letter feature works without the text reader
    except ImportError:
        return jsonify(error="The text reader is not installed on this server yet."), 503
    try:
        data = read_upload()
        lines = line_split.split_lines(data)
        preds = trocr.read_lines([l["image"] for l in lines])
    except preprocess.ImageError as e:
        return jsonify(error=str(e)), 400
    except trocr.ReaderUnavailable as e:
        return jsonify(error=str(e)), 503
    items = [(t, c) for t, c in preds if t]
    if not items:
        return jsonify(error="The reader could not make out any text. Try a clearer, larger photo."), 400
    raw = "\n".join(t for t, _ in items)
    if len(raw) > corrector.MAX_CHARS:
        return jsonify(error="That essay is too long for one go. Try one page at a time."), 400
    weight = sum(len(t) for t, _ in items)
    confidence = sum(c * len(t) for t, c in items) / weight
    try:
        result = corrector.correct(raw)
    except corrector.CorrectorUnavailable as e:
        return jsonify(error=str(e)), 503
    result.update(id=uuid.uuid4().hex[:12], raw_text=raw, confidence=round(confidence, 4),
                  created_at=datetime.utcnow().isoformat(timespec="seconds") + "Z")
    _store[result["id"]] = result
    remember("essay", raw[:80] + ("\u2026" if len(raw) > 80 else ""), result["corrected_text"], result["confidence"], image=data,
             data={k: result[k] for k in ("raw_text", "corrected_text", "scores", "feedback", "provider", "confidence")}, scan_id=result["id"])
    while len(_store) > _KEEP:
        _store.popitem(last=False)
    return jsonify(result)


@bp.get("/essays/<essay_id>/report")
def report(essay_id):
    r = _store.get(essay_id)
    if r is None:                                    # after a restart, rebuild it from the saved copy
        uid = current_user()
        saved = store.get(uid, essay_id) if uid else None
        if saved and saved["mode"] == "essay":
            r = {**saved["data"], "id": saved["id"], "created_at": saved["created_at"]}
    if r is None:
        return jsonify(error="This report is no longer available. Run the essay again."), 404
    return send_file(io.BytesIO(build_pdf(r)), mimetype="application/pdf",
                     as_attachment=True, download_name=f"inklens-essay-{essay_id}.pdf")


_PUNCT = {"\u2018": "'", "\u2019": "'", "\u201c": '"', "\u201d": '"', "\u2013": "-", "\u2014": "-", "\u2026": "..."}


def _t(s: str) -> str:
    """Make text safe for the PDF's built-in font and for ReportLab's mini markup."""
    s = "".join(_PUNCT.get(c, c) for c in s).encode("latin-1", "replace").decode("latin-1")
    return escape(s).replace("\n", "<br/>")


def build_pdf(r: dict) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    ss = getSampleStyleSheet()
    body = ParagraphStyle("body", parent=ss["BodyText"], fontSize=10.5, leading=16)
    small = ParagraphStyle("small", parent=body, fontSize=9, leading=13, textColor=colors.HexColor("#555555"))
    h2 = ParagraphStyle("h2", parent=ss["Heading2"], spaceBefore=14, spaceAfter=6)
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=18 * mm, bottomMargin=18 * mm,
                            title="InkLens essay report")
    when = r.get("created_at", "")[:10]
    story = [Paragraph("InkLens essay report", ss["Title"]),
             Paragraph(_t(f"{when} - handwriting read with TrOCR ({round(r.get('confidence', 0) * 100)}% confidence), corrected by an AI editor"), small),
             Paragraph("Scores", h2)]
    rows = [[k.capitalize(), str(v)] for k, v in r["scores"].items()]
    t = Table(rows, colWidths=[50 * mm, 25 * mm])
    t.setStyle(TableStyle([("FONTSIZE", (0, 0), (-1, -1), 10.5), ("LINEBELOW", (0, 0), (-1, -1), 0.4, colors.HexColor("#cccccc")),
                           ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"), ("ALIGN", (1, 0), (1, -1), "RIGHT")]))
    story += [t, Paragraph("What you wrote", h2), Paragraph(_t(r["raw_text"]), body),
              Paragraph("Corrected", h2), Paragraph(_t(r["corrected_text"]), body),
              Paragraph(f"Feedback ({len(r['feedback'])} changes)", h2)]
    if not r["feedback"]:
        story.append(Paragraph("No changes were needed.", body))
    for f in r["feedback"]:
        story += [Paragraph(f"<b>{_t(f['type'].upper())}</b> &nbsp;<strike>{_t(f['original'])}</strike> -&gt; <b>{_t(f['suggestion'])}</b>", body),
                  Paragraph(_t(f["note"]), small), Spacer(1, 4)]
    doc.build(story)
    return buf.getvalue()
