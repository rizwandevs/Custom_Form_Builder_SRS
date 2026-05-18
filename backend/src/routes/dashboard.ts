import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { serializeForm } from '../services/forms';

const router = Router();

router.use(requireAuth);

function lastNDays(n: number): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

router.get('/stats', async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const chartStart = new Date();
    chartStart.setDate(chartStart.getDate() - 13);
    chartStart.setHours(0, 0, 0, 0);

    const [
      totalForms,
      totalSubmissions,
      submissionsLast7Days,
      recentList,
      forms,
      chartSubmissions,
    ] = await Promise.all([
      prisma.form.count({ where: { createdById: userId } }),
      prisma.formSubmission.count({
        where: { form: { createdById: userId } },
      }),
      prisma.formSubmission.count({
        where: {
          form: { createdById: userId },
          createdAt: { gte: sevenDaysAgo },
        },
      }),
      prisma.formSubmission.findMany({
        where: { form: { createdById: userId } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          form: { select: { id: true, title: true, slug: true } },
        },
      }),
      prisma.form.findMany({
        where: { createdById: userId },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        include: { _count: { select: { submissions: true } } },
      }),
      prisma.formSubmission.findMany({
        where: {
          form: { createdById: userId },
          createdAt: { gte: chartStart },
        },
        select: { createdAt: true },
      }),
    ]);

    const dayLabels = lastNDays(14);
    const countByDay: Record<string, number> = Object.fromEntries(dayLabels.map((d) => [d, 0]));
    for (const s of chartSubmissions) {
      const key = s.createdAt.toISOString().slice(0, 10);
      if (key in countByDay) countByDay[key]++;
    }

    const submissionsChart = dayLabels.map((date) => ({
      date,
      count: countByDay[date],
    }));

    res.json({
      totalForms,
      totalSubmissions,
      submissionsLast7Days,
      recentSubmissions: recentList.map((s) => ({
        id: s.id,
        formId: s.formId,
        formTitle: s.form.title,
        formSlug: s.form.slug,
        createdAt: s.createdAt,
      })),
      forms: forms.map((f) => serializeForm(f)),
      submissionsChart,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
