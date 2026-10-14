import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const MAX_LEN = 2000;
const CATEGORIES = ["Suggestion", "Bug Report", "General Feedback"];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    let body;
    try { body = await req.json(); } catch {
      return Response.json({ error: 'Invalid request' }, { status: 400 });
    }

    const message = (body?.message || '').toString().trim();
    const category = body?.category ? body.category.toString() : 'General Feedback';

    if (!message) return Response.json({ error: 'Message is required' }, { status: 400 });
    if (message.length > MAX_LEN) return Response.json({ error: 'Message too long' }, { status: 400 });
    if (!CATEGORIES.includes(category)) return Response.json({ error: 'Invalid category' }, { status: 400 });

    const record = await base44.asServiceRole.entities.Feedback.create({
      message,
      category,
      status: 'New'
    });

    if (!record || !record.id) return Response.json({ error: 'Failed to save' }, { status: 500 });

    return Response.json({ success: true, id: record.id });
  } catch (error) {
    return Response.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}