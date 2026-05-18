import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { getFormForUser } from '../services/forms';

const router = Router({ mergeParams: true });

type FormParams = { id: string; submissionId?: string };

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const formId = parseInt((req.params as FormParams).id, 10);
    const userId = req.user!.userId;

    const form = await getFormForUser(formId, userId);
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
    const search = String(req.query.search || '').trim();
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;

    const where: {
      formId: number;
      createdAt?: { gte?: Date; lte?: Date };
      OR?: Array<{ values: { some: { value: { contains: string } } } }>;
    } = { formId };

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }

    if (search) {
      where.OR = [{ values: { some: { value: { contains: search } } } }];
    }

    const [submissions, total] = await Promise.all([
      prisma.formSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { values: true },
      }),
      prisma.formSubmission.count({ where }),
    ]);

    res.json({
      submissions: submissions.map((s) => ({
        id: s.id,
        createdAt: s.createdAt,
        values: Object.fromEntries(s.values.map((v) => [v.fieldName, v.value])),
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/export', async (req, res, next) => {
  try {
    const formId = parseInt((req.params as FormParams).id, 10);
    const userId = req.user!.userId;

    const form = await prisma.form.findFirst({
      where: { id: formId, createdById: userId },
      include: {
        fields: { orderBy: { order: 'asc' } },
        submissions: {
          orderBy: { createdAt: 'desc' },
          include: { values: true },
        },
      },
    });

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const headers = ['Submitted At', ...form.fields.map((f) => f.label)];
    const rows = form.submissions.map((s) => {
      const valueMap = Object.fromEntries(s.values.map((v) => [v.fieldName, v.value]));
      return [
        s.createdAt.toISOString(),
        ...form.fields.map((f) => {
          const val = valueMap[f.name] ?? '';
          return `"${String(val).replace(/"/g, '""')}"`;
        }),
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${form.slug}-submissions.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

router.get('/:submissionId', async (req, res, next) => {
  try {
    const params = req.params as FormParams;
    const formId = parseInt(params.id, 10);
    const submissionId = parseInt(params.submissionId || '0', 10);
    const userId = req.user!.userId;

    const form = await getFormForUser(formId, userId);
    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const submission = await prisma.formSubmission.findFirst({
      where: { id: submissionId, formId },
      include: { values: true },
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    res.json({
      submission: {
        id: submission.id,
        createdAt: submission.createdAt,
        ipAddress: submission.ipAddress,
        values: Object.fromEntries(submission.values.map((v) => [v.fieldName, v.value])),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
